"""
HookCut.com - Modal Worker
Video Analysis & Clip Rendering Pipeline
"""

import modal
import os
import json
import tempfile
import subprocess
import time

# Prefer H.264 (avc1) over AV1 — our container lacks hw AV1 decoder,
# which breaks face detection (MediaPipe/OpenCV can't decode AV1 frames)
# and can corrupt audio extraction for Groq Whisper transcription.
YT_FORMAT_H264 = "bv*[vcodec^=avc1][height<=1080]+ba/b[height<=1080]/bv*[vcodec^=avc1]+ba/b"
YT_FORMAT_ANY = "bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b"

# ============================================
# MODAL APP SETUP
# ============================================

app = modal.App("cutviral-worker")

# Heavy worker image (ffmpeg + rendering + gemini + groq)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "ffmpeg",
        "libavcodec-extra",
        "wget",
        # subtitles/libass + fonts
        "libass9",
        "fontconfig",
        "fonts-dejavu-core",
        # python-magic runtime
        "libmagic1",
        "unzip",
        "curl",
    )
    .pip_install(
        "google-genai",
        "groq",
        "boto3",
        "supabase",
        "requests",
        "python-magic",
        "fastapi[standard]",
        "yt-dlp[default]",
        "mediapipe==0.10.21",
        "opencv-python-headless>=4.8.0",
    )
    # Install Deno — the recommended JS runtime for yt-dlp (sandboxed, single binary)
    .run_commands(
        "curl -fsSL https://deno.land/install.sh | sh",
        "ln -sf /root/.deno/bin/deno /usr/local/bin/deno",
        "deno --version",
        # Ensure latest yt-dlp with EJS support
        "pip install --upgrade yt-dlp[default]",
        "python -c \"import yt_dlp; print('yt-dlp version:', yt_dlp.version.__version__)\"",
    )
)

# Light webhook image (FastAPI + Supabase only)
webhook_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi[standard]",
        "supabase",
        "pydantic",
        "requests",
        "stripe",
    )
)

# ============================================
# SECRETS CONFIGURATION
# ============================================

secrets = [
    modal.Secret.from_name("gemini-secret"),      # GEMINI_API_KEY
    modal.Secret.from_name("groq-secret"),        # GROQ_API_KEY
    modal.Secret.from_name("cloudflare-r2"),      # R2_ENDPOINT, R2_BUCKET_NAME, CLOUDFLARE_* etc
    modal.Secret.from_name("supabase-secret"),    # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    modal.Secret.from_name("youtube-cookies"),    # YOUTUBE_COOKIES_B64
    modal.Secret.from_name("stripe-secret"),      # STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*
    modal.Secret.from_name("resend-secret"),      # RESEND_API_KEY
]

# ============================================
# HELPER FUNCTIONS
# ============================================

def download_video(url: str, output_path: str, auth_headers: dict = None) -> str:
    """Download video from URL to local path"""
    import requests

    print(f"📥 Downloading video from {url}")
    headers = {"User-Agent": "HookCutWorker/1.0"}
    if auth_headers:
        headers.update(auth_headers)

    with requests.get(url, stream=True, headers=headers, timeout=(10, 600)) as r:
        r.raise_for_status()

        content_type = r.headers.get("Content-Type", "")
        if "video" not in content_type and "octet-stream" not in content_type:
            print(f"⚠️ Warning: unexpected Content-Type: {content_type}")

        bytes_written = 0
        with open(output_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
                    bytes_written += len(chunk)

    if bytes_written == 0:
        raise RuntimeError("Downloaded file is empty (0 bytes). Check the URL / permissions.")

    print(f"✅ Downloaded to {output_path} ({bytes_written/(1024*1024):.2f} MB)")
    return output_path


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using ffprobe"""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    out = (res.stdout or "").strip()
    err = (res.stderr or "").strip()

    if res.returncode != 0 or not out:
        raise RuntimeError(f"ffprobe failed. rc={res.returncode} stdout='{out}' stderr='{err}'")

    return float(out)


def upload_to_r2(file_path: str, s3_key: str, content_type: str = "video/mp4") -> str:
    """Upload rendered clip to Supabase Storage (rendered-clips bucket) instead of R2"""
    import requests as req

    print(f"☁️ Uploading to Supabase Storage: {s3_key}")

    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    # Upload to rendered-clips bucket
    bucket = "rendered-clips"
    file_size = os.path.getsize(file_path)

    # Stream upload — don't load entire file into memory
    with open(file_path, "rb") as f:
        resp = req.post(
            f"{supabase_url}/storage/v1/object/{bucket}/{s3_key}",
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": content_type,
                "Content-Length": str(file_size),
            },
            data=f,
            timeout=300,
        )

    if resp.status_code not in (200, 201):
        # Try upsert if file already exists
        with open(file_path, "rb") as f:
            resp = req.put(
                f"{supabase_url}/storage/v1/object/{bucket}/{s3_key}",
                headers={
                    "Authorization": f"Bearer {service_key}",
                    "apikey": service_key,
                    "Content-Type": content_type,
                    "Content-Length": str(file_size),
                },
                data=f,
                timeout=300,
            )

    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Supabase Storage upload failed: {resp.status_code} {resp.text[:300]}")

    public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{s3_key}"

    print(f"✅ Uploaded: {public_url}")
    return public_url


def init_supabase():
    """Initialize Supabase client using environment secrets"""
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise RuntimeError(
            f"Missing Supabase credentials. "
            f"SUPABASE_URL={'set' if url else 'MISSING'}, "
            f"SUPABASE_SERVICE_ROLE_KEY={'set' if key else 'MISSING'}. "
            f"Check your Modal secret 'supabase-secret'."
        )

    print(f"🔗 Connecting to Supabase: {url}")
    return create_client(url, key)


def format_srt_time(seconds: float) -> str:
    """Format seconds to SRT timestamp (HH:MM:SS,mmm)"""
    seconds = max(0.0, float(seconds))
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt(words, output_path: str, style: str = "hormozi"):
    """Generate SRT subtitle file from word timestamps"""
    if not words:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("")
        return

    chunks = []
    current = []

    for w in words:
        current.append(w)

        token = (w.get("word") or "").strip()
        last = token[-1] if token else ""

        if len(current) >= 3 or last in ".!?,":
            chunks.append(current)
            current = []

    if current:
        chunks.append(current)

    with open(output_path, "w", encoding="utf-8") as f:
        for i, chunk in enumerate(chunks, 1):
            start_time = chunk[0]["start"]
            end_time = chunk[-1]["end"]
            text = " ".join((x.get("word") or "").strip() for x in chunk).strip()
            if not text:
                continue

            f.write(f"{i}\n")
            f.write(f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}\n")
            f.write(f"{text}\n\n")


# ============================================
# CAPTION STYLES
# ============================================

CAPTION_STYLES = {
    "hormozi": (
        "FontName=Impact,FontSize=20,PrimaryColour=&H00FFFF,"
        "OutlineColour=&H000000,BackColour=&H80000000,"
        "BorderStyle=4,Outline=2,Shadow=0,Bold=1,"
        "Alignment=2,MarginV=50"
    ),
    "mrbeast": (
        "FontName=Impact,FontSize=22,PrimaryColour=&H0000FF,"
        "SecondaryColour=&H00FFFFFF,"
        "OutlineColour=&H000000,BorderStyle=1,Outline=3,"
        "Shadow=2,Bold=1,Alignment=2,MarginV=50"
    ),
    "minimal": (
        "FontName=DejaVu Sans,FontSize=16,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H40000000,BorderStyle=3,Outline=1,"
        "Shadow=0,Bold=0,Alignment=2,MarginV=40"
    ),
    "neon": (
        "FontName=Impact,FontSize=20,PrimaryColour=&H00FF00,"
        "OutlineColour=&H000000,BackColour=&H00000000,"
        "BorderStyle=1,Outline=2,Shadow=0,Bold=1,"
        "Alignment=2,MarginV=50"
    ),
    "fire": (
        "FontName=Impact,FontSize=21,PrimaryColour=&H0045FF,"
        "SecondaryColour=&H00BFFF,"
        "OutlineColour=&H000000,BorderStyle=1,Outline=3,"
        "Shadow=1,Bold=1,Alignment=2,MarginV=50"
    ),
    "elegant": (
        "FontName=DejaVu Sans,FontSize=18,PrimaryColour=&H00F0F0F0,"
        "OutlineColour=&H00333333,BorderStyle=1,Outline=1,"
        "Shadow=1,Bold=0,Alignment=2,MarginV=45"
    ),
}

def build_custom_caption_style(color_hex: str = "FFFFFF", font_size: int = 20) -> str:
    """Build a custom caption style from user-selected color.
    color_hex: hex color WITHOUT # (e.g. 'FF5500')
    FFmpeg ASS uses BGR format: &HBBGGRR
    """
    # Convert RGB hex to BGR for ASS format
    r = color_hex[0:2]
    g = color_hex[2:4]
    b = color_hex[4:6]
    bgr = f"&H00{b}{g}{r}"

    return (
        f"FontName=Impact,FontSize={font_size},PrimaryColour={bgr},"
        "OutlineColour=&H000000,BackColour=&H80000000,"
        "BorderStyle=4,Outline=2,Shadow=0,Bold=1,"
        "Alignment=2,MarginV=50"
    )


# ============================================
# REUSABLE TRANSCRIPTION (single source of truth)
# ============================================

def transcribe_audio(audio_path: str, clip_duration: float = 0, max_retries: int = 3) -> tuple:
    """
    Transcribe audio file using Groq Whisper with retry logic.
    Returns (full_text: str, words: list[dict])
    Words have: {"word": str, "start": float, "end": float}
    """
    from groq import Groq

    groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
    words = []
    full_text = ""

    # Validate audio file exists and has content
    if not os.path.exists(audio_path):
        print(f"  ⚠️ Audio file missing: {audio_path}")
        return "", []

    file_size = os.path.getsize(audio_path)
    if file_size < 1000:
        print(f"  ⚠️ Audio file too small ({file_size} bytes), likely corrupt")
        return "", []

    if file_size > 24 * 1024 * 1024:
        print(f"  ⚠️ Audio file too large ({file_size / (1024*1024):.1f}MB), skipping")
        return "", []

    # Retry loop with exponential backoff
    last_error = None
    for attempt in range(max_retries):
        try:
            with open(audio_path, "rb") as af:
                transcription = groq_client.audio.transcriptions.create(
                    file=af,
                    model="whisper-large-v3-turbo",
                    response_format="verbose_json",
                    timestamp_granularities=["word", "segment"],
                )

            # Extract words from word-level timestamps
            if getattr(transcription, "words", None):
                for w in transcription.words:
                    if isinstance(w, dict):
                        words.append({"word": w.get("word", ""), "start": w.get("start", 0), "end": w.get("end", 0)})
                    else:
                        words.append({"word": w.word, "start": w.start, "end": w.end})

            # Fallback: extract words from segments
            if not words and getattr(transcription, "segments", None):
                for seg in transcription.segments:
                    if isinstance(seg, dict):
                        seg_text = (seg.get("text") or "").strip()
                        seg_start = seg.get("start", 0)
                        seg_end = seg.get("end", 0)
                    else:
                        seg_text = (getattr(seg, "text", "") or "").strip()
                        seg_start = getattr(seg, "start", 0)
                        seg_end = getattr(seg, "end", 0)

                    if seg_text and seg_end > seg_start:
                        seg_words = seg_text.split()
                        word_dur = (seg_end - seg_start) / max(len(seg_words), 1)
                        for j, sw in enumerate(seg_words):
                            words.append({
                                "word": sw,
                                "start": round(seg_start + j * word_dur, 3),
                                "end": round(seg_start + (j + 1) * word_dur, 3),
                            })

            full_text = (getattr(transcription, "text", "") or "").strip()

            # Last fallback: create timed words from full text
            if not words and full_text and clip_duration > 0:
                text_words = full_text.split()
                wd = clip_duration / max(len(text_words), 1)
                words = [{"word": w, "start": round(j * wd, 3), "end": round((j + 1) * wd, 3)} for j, w in enumerate(text_words)]

            return full_text, words

        except Exception as e:
            last_error = e
            error_str = str(e)

            # Don't retry on non-transient errors
            if "413" in error_str or "too large" in error_str.lower():
                print(f"  ⚠️ Audio too large for Groq, skipping")
                return "", []

            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"  ⚠️ Transcription attempt {attempt + 1} failed: {error_str[:100]}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"  ⚠️ Transcription failed after {max_retries} attempts: {error_str[:150]}")

    return "", []


# ============================================
# EMAIL NOTIFICATIONS (Resend API)
# ============================================

def send_email(to: str, subject: str, html: str):
    """Send email via Resend API. Non-blocking, never raises."""
    try:
        import requests as req_lib
        api_key = os.environ.get("RESEND_API_KEY", "")
        if not api_key:
            print("⚠️ RESEND_API_KEY not set, skipping email")
            return
        resp = req_lib.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": "HookCut <noreply@hookcut.com>",
                "to": [to],
                "subject": subject,
                "html": html,
            },
            timeout=10,
        )
        if resp.status_code in (200, 201):
            print(f"📧 Email sent to {to[:20]}***: {subject}")
        else:
            print(f"⚠️ Email failed ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        print(f"⚠️ Email error (non-fatal): {e}")


def get_user_email(user_id: str) -> str | None:
    """Get user email from Supabase auth via admin API."""
    try:
        import requests as req_lib
        resp = req_lib.get(
            f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1/admin/users/{user_id}",
            headers={
                "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
                "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
            },
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json().get("email")
    except Exception as e:
        print(f"⚠️ Could not fetch user email: {e}")
    return None


def email_base(content: str) -> str:
    """Wrap content in HookCut-branded email template."""
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
<div style="text-align:center;margin-bottom:32px;">
<span style="font-size:24px;font-weight:800;color:#ffffff;">Hook</span><span style="font-size:24px;font-weight:800;color:#E63B7A;">Cut</span>
</div>
<div style="background:#1a1a2e;border-radius:16px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">
{content}
</div>
<div style="text-align:center;margin-top:24px;color:rgba(255,255,255,0.3);font-size:12px;">
<p>&copy; 2026 Truhand LLC. All rights reserved.</p>
<p><a href="https://hookcut.com" style="color:#E63B7A;text-decoration:none;">hookcut.com</a></p>
</div>
</div></body></html>"""


def send_welcome_email(to: str, name: str = ""):
    display = name or "there"
    send_email(to, "Welcome to HookCut! 🎬", email_base(f"""
<h1 style="color:#ffffff;font-size:22px;margin:0 0 16px;">Hey {display}! 👋</h1>
<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 16px;">Welcome to HookCut — the fastest way to turn long videos into viral short clips.</p>
<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 16px;">Here's what you get to start:</p>
<ul style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
<li><strong style="color:#fff;">10 free clip renders</strong> — no credit card needed</li>
<li><strong style="color:#fff;">AI viral detection</strong> — finds your best moments</li>
<li><strong style="color:#fff;">10+ caption styles</strong> — Bold Pop, Karaoke, Minimal &amp; more</li>
<li><strong style="color:#fff;">Face tracking</strong> — auto-reframe to 9:16</li>
<li><strong style="color:#fff;">99 languages</strong> — auto-detected</li>
</ul>
<div style="text-align:center;margin:24px 0 8px;">
<a href="https://hookcut.com/dashboard" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#E63B7A,#8B5CF6);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Upload Your First Video →</a>
</div>"""))


def send_analysis_complete_email(to: str, video_title: str, clip_count: int, video_id: str):
    send_email(to, f"✅ {clip_count} clips found in your video!", email_base(f"""
<h1 style="color:#ffffff;font-size:22px;margin:0 0 16px;">Your video is ready! 🎉</h1>
<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 8px;">AI finished analyzing:</p>
<p style="color:#ffffff;font-size:17px;font-weight:600;margin:0 0 16px;">"{video_title}"</p>
<div style="background:rgba(230,59,122,0.1);border:1px solid rgba(230,59,122,0.2);border-radius:12px;padding:16px;text-align:center;margin:0 0 24px;">
<span style="font-size:36px;font-weight:800;color:#E63B7A;">{clip_count}</span><br>
<span style="color:rgba(255,255,255,0.6);font-size:13px;">viral clips found</span>
</div>
<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 24px;">Review your clips, edit captions, and render the best ones. Analysis and editing are always free — you only use credits when you render.</p>
<div style="text-align:center;margin:24px 0 8px;">
<a href="https://hookcut.com/dashboard/videos/{video_id}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#E63B7A,#8B5CF6);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Review Your Clips →</a>
</div>"""))


def send_low_credits_email(to: str, remaining: int):
    send_email(to, f"⚡ Only {remaining} render credit{'s' if remaining != 1 else ''} left", email_base(f"""
<h1 style="color:#ffffff;font-size:22px;margin:0 0 16px;">Running low on credits</h1>
<div style="background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.2);border-radius:12px;padding:16px;text-align:center;margin:0 0 24px;">
<span style="font-size:36px;font-weight:800;color:#EAB308;">{remaining}</span><br>
<span style="color:rgba(255,255,255,0.6);font-size:13px;">credits remaining</span>
</div>
<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 16px;">You can still upload and analyze videos for free — credits are only used for rendering final clips.</p>
<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 24px;">Upgrade your plan for more renders, no watermark, and full-quality exports.</p>
<div style="text-align:center;margin:24px 0 8px;">
<a href="https://hookcut.com/dashboard/upgrade" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#E63B7A,#8B5CF6);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Upgrade Plan →</a>
</div>
<p style="color:rgba(255,255,255,0.4);font-size:13px;text-align:center;margin:16px 0 0;">Or buy a render pack: 30 extra renders for $9</p>"""))


# ============================================
# GEMINI VIDEO ANALYSIS
# ============================================

@app.function(
    image=image,
    secrets=secrets,
    timeout=1800,       # 30 min (large videos need time to download + compress + analyze)
    memory=4096,        # 4GB RAM
    scaledown_window=120,  # Keep container warm 2 min between analyses
    max_containers=10,     # Max 10 parallel analyses (handles bursts)
)
def analyze_video_with_gemini(video_url: str, video_id: str, user_id: str, auth_headers: dict = None, settings: dict = None):
    import time
    import re
    from google import genai

    # Parse settings
    settings = settings or {}
    num_clips = settings.get("clipCount", 5)
    clip_length = settings.get("clipLength", "medium")  # short/medium/long
    
    # Map clip length to seconds
    length_map = {
        "short": (15, 30),
        "medium": (30, 60),
        "long": (60, 90),
    }
    min_len, max_len = length_map.get(clip_length, (30, 60))

    print(f"🤖 Starting Gemini analysis for video: {video_id}")
    print(f"⚙️ Settings: {num_clips} clips, {clip_length} length ({min_len}-{max_len}s)")

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    
    # Use gemini-2.5-flash for better rate limits and video understanding
    # Fallback chain: 2.5-flash → 2.0-flash
    selected_model = None
    for model_name in ["gemini-2.5-flash", "gemini-2.0-flash"]:
        try:
            # Test model availability with a simple call
            client.models.get(model=model_name)
            selected_model = model_name
            print(f"🤖 Using model: {model_name}")
            break
        except Exception as me:
            print(f"⚠️ Model {model_name} unavailable: {me}")
    
    if selected_model is None:
        selected_model = "gemini-2.0-flash"
        print(f"🤖 Defaulting to: {selected_model}")

    video_path = None
    video_file = None

    def extract_json_array(text: str):
        t = (text or "").strip()

        # fenced block
        if "```" in t:
            parts = t.split("```")
            if len(parts) >= 3:
                t = parts[1].strip()
                if t.lower().startswith("json"):
                    t = t[4:].strip()

        # direct parse
        try:
            obj = json.loads(t)
            if isinstance(obj, list):
                return obj
        except Exception:
            pass

        # find first json array
        m = re.search(r"\[[\s\S]*\]", t)
        if not m:
            raise ValueError(f"Could not find JSON array in model output. Output starts: {t[:200]}")
        
        raw_json = m.group(0)
        
        # Try direct parse first
        try:
            obj = json.loads(raw_json)
            if isinstance(obj, list):
                return obj
        except json.JSONDecodeError:
            pass
        
        # Attempt JSON repair for common Gemini issues
        repaired = raw_json
        # Fix trailing commas before ] or }
        repaired = re.sub(r',\s*([}\]])', r'\1', repaired)
        # Fix missing commas between } {
        repaired = re.sub(r'}\s*{', '},{', repaired)
        # Fix unescaped quotes inside strings (common with non-English text)
        # Replace smart quotes with regular quotes
        repaired = repaired.replace('\u201c', '\\"').replace('\u201d', '\\"')
        repaired = repaired.replace('\u2018', "\\'").replace('\u2019', "\\'")
        
        try:
            obj = json.loads(repaired)
            if isinstance(obj, list):
                print(f"⚠️ JSON required repair, but parsed OK ({len(obj)} items)")
                return obj
        except json.JSONDecodeError:
            pass
        
        # Last resort: try to extract individual JSON objects and rebuild array
        try:
            objects = []
            for obj_match in re.finditer(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw_json):
                try:
                    item = json.loads(obj_match.group(0))
                    objects.append(item)
                except json.JSONDecodeError:
                    # Try repairing individual object
                    fixed = re.sub(r',\s*}', '}', obj_match.group(0))
                    try:
                        item = json.loads(fixed)
                        objects.append(item)
                    except json.JSONDecodeError:
                        continue
            if objects:
                print(f"⚠️ JSON rebuilt from {len(objects)} individual objects")
                return objects
        except Exception:
            pass
        
        raise ValueError(f"Could not parse JSON array after repair attempts. Raw starts: {raw_json[:300]}")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        download_video(video_url, tmp.name, auth_headers=auth_headers)
        video_path = tmp.name

    try:
        # Check file size limit (5GB max)
        file_size_bytes = os.path.getsize(video_path)
        file_size_mb = file_size_bytes / (1024 * 1024)
        MAX_FILE_SIZE_MB = 5120  # 5GB
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise ValueError(
                f"Video file too large ({file_size_mb:.0f}MB). "
                f"Maximum allowed: {MAX_FILE_SIZE_MB/1024:.0f}GB. "
                f"Please compress your video and try again."
            )
        print(f"📦 File size: {file_size_mb:.0f}MB")

        duration = get_video_duration(video_path)
        print(f"📹 Video duration: {duration}s")

        # Enforce max duration limit (2 hours)
        MAX_DURATION = 7200  # 2 hours in seconds
        if duration > MAX_DURATION:
            raise ValueError(
                f"Video too long ({duration:.0f}s / {duration/3600:.1f}h). "
                f"Maximum allowed: {MAX_DURATION/3600:.0f} hours. "
                f"Please trim your video and try again."
            )

        # ─── Auto-adjust for short videos ───
        if duration < 60:
            # Under 1 minute: single clip, basically just reframe + captions
            num_clips = 1
            min_len = max(10, int(duration * 0.5))
            max_len = int(duration * 0.95)
            print(f"📹 Short video ({duration:.0f}s) — adjusted to {num_clips} clip, {min_len}-{max_len}s")
        elif duration < 120:
            # 1-2 minutes: limited clips, shorter lengths
            num_clips = min(num_clips, 3)
            min_len = 15
            max_len = min(45, int(duration * 0.6))
            print(f"📹 Medium-short video ({duration:.0f}s) — adjusted to {num_clips} clips, {min_len}-{max_len}s")
        elif duration < 180:
            # 2-3 minutes: moderate adjustment
            num_clips = min(num_clips, 5)
            min_len = min(min_len, 20)
            max_len = min(max_len, int(duration * 0.5))
            print(f"📹 Short-medium video ({duration:.0f}s) — adjusted to {num_clips} clips, {min_len}-{max_len}s")
        # ─── End short video adjustment ───

        # Generate thumbnail
        thumb_path = video_path.replace(".mp4", "_thumb.jpg")
        try:
            subprocess.run([
                "ffmpeg", "-y", "-ss", str(min(5, duration / 2)),
                "-i", video_path, "-vframes", "1", "-q:v", "2",
                "-vf", "scale=640:-1",
                thumb_path
            ], check=True, capture_output=True)

            # Upload thumbnail via Supabase Storage REST API
            import requests as req
            supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
            service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
            thumb_key = f"{user_id}/{video_id}_thumb.jpg"

            with open(thumb_path, "rb") as tf:
                resp_thumb = req.post(
                    f"{supabase_url}/storage/v1/object/thumbnails/{thumb_key}",
                    headers={
                        "Authorization": f"Bearer {service_key}",
                        "apikey": service_key,
                        "Content-Type": "image/jpeg",
                    },
                    data=tf.read(),
                    timeout=30,
                )

            if resp_thumb.status_code in (200, 201):
                thumb_url = f"{supabase_url}/storage/v1/object/public/thumbnails/{thumb_key}"
                sb_temp = init_supabase()
                sb_temp.table("videos").update({"thumbnail_url": thumb_url}).eq("id", video_id).execute()
                print(f"🖼️ Thumbnail uploaded: {thumb_url}")
            else:
                print(f"⚠️ Thumbnail upload failed: {resp_thumb.status_code} {resp_thumb.text[:200]}")
        except Exception as thumb_err:
            print(f"⚠️ Thumbnail generation failed (non-fatal): {thumb_err}")
        finally:
            if os.path.exists(thumb_path):
                os.unlink(thumb_path)

        print("⬆️ Preparing video for AI analysis...")
        
        # Gemini token calculation:
        # Video: 263 tokens/sec, Audio: 32 tokens/sec = ~295 tokens/sec total
        # 1M token limit → max ~3400 sec (~56 min) per request
        # We use 45 min chunks to leave room for prompt tokens
        MAX_CHUNK_DURATION = 2700  # 45 minutes in seconds
        
        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        
        if duration > MAX_CHUNK_DURATION:
            # Split into chunks and analyze each separately
            num_chunks = int(duration / MAX_CHUNK_DURATION) + 1
            clips_per_chunk = max(2, num_clips // num_chunks + 1)
            print(f"📦 Video too long for single analysis ({duration:.0f}s / {duration/60:.0f}min)")
            print(f"🔪 Splitting into {num_chunks} chunks of ~{MAX_CHUNK_DURATION/60:.0f}min, {clips_per_chunk} clips each")
            
            all_clips_raw = []
            
            for chunk_idx in range(num_chunks):
                chunk_start = chunk_idx * MAX_CHUNK_DURATION
                chunk_end = min((chunk_idx + 1) * MAX_CHUNK_DURATION, duration)
                chunk_dur = chunk_end - chunk_start
                
                if chunk_dur < 30:  # Skip very short remainder chunks
                    continue
                
                chunk_path = video_path.replace(".mp4", f"_chunk{chunk_idx}.mp4")
                print(f"\n🔪 Chunk {chunk_idx+1}/{num_chunks}: {chunk_start:.0f}s - {chunk_end:.0f}s ({chunk_dur/60:.0f}min)")
                
                try:
                    # Extract chunk with ffmpeg
                    extract_cmd = [
                        "ffmpeg", "-y",
                        "-ss", str(chunk_start),
                        "-i", video_path,
                        "-t", str(chunk_dur),
                        "-c", "copy",  # Fast copy, no re-encoding
                        "-movflags", "+faststart",
                        chunk_path,
                    ]
                    subprocess.run(extract_cmd, capture_output=True, text=True, timeout=120, check=True)
                    
                    chunk_mb = os.path.getsize(chunk_path) / (1024 * 1024)
                    print(f"  📦 Chunk size: {chunk_mb:.0f}MB")
                    
                    # Upload chunk to Gemini
                    print(f"  ⬆️ Uploading chunk {chunk_idx+1} to Gemini...")
                    chunk_file = client.files.upload(file=chunk_path)
                    
                    # Wait for processing
                    wait_start = time.time()
                    while True:
                        state_str = str(chunk_file.state).upper()
                        if "ACTIVE" in state_str:
                            break
                        if "FAILED" in state_str:
                            raise RuntimeError(f"Chunk file failed: {chunk_file.state}")
                        if time.time() - wait_start > 300:
                            raise TimeoutError("Chunk processing timeout")
                        time.sleep(2)
                        chunk_file = client.files.get(name=chunk_file.name)
                    
                    print(f"  ✅ Chunk ready, analyzing...")
                    
                    chunk_prompt = f"""
You are a viral content expert. Analyze this video chunk and identify the {clips_per_chunk} best viral moments.

IMPORTANT CONTEXT: This is chunk {chunk_idx+1} of {num_chunks} from a longer video.
This chunk covers timestamps {chunk_start:.0f}s to {chunk_end:.0f}s of the full video.
You MUST add {chunk_start:.0f} to all your timestamps so they refer to the FULL video timeline.

LANGUAGE RULES:
- DETECT the language spoken in the video.
- Write "title" and "reason" IN THE SAME LANGUAGE as the video.
- Include "detected_language" with the ISO code.

REQUIREMENTS:
- Return EXACTLY {clips_per_chunk} clips from this chunk.
- Each clip MUST be {min_len}-{max_len} seconds long.
- start_time and end_time must be in FULL VIDEO seconds (add {chunk_start:.0f} to chunk-local times).
- Each clip must start with a strong hook.
- Clips must contain complete thoughts.

For each moment:
1. start_time: Exact second in FULL video (float). Must be >= {chunk_start:.0f} and <= {chunk_end:.0f}
2. end_time: Must be >= start_time + {min_len} and <= {chunk_end:.0f}
3. title: Catchy title IN VIDEO'S LANGUAGE (5-8 words)
4. hook_strength: Score 1-10
5. viral_score: Overall viral potential 1-10
6. reason: Why this would go viral — IN VIDEO'S LANGUAGE
7. detected_language: ISO code

Return ONLY valid JSON array:
[{{"start_time": {chunk_start + 15}, "end_time": {chunk_start + 55}, "title": "Example Title", "hook_strength": 8, "viral_score": 8, "reason": "Strong opening hook", "detected_language": "en"}}]
"""
                    
                    chunk_resp = client.models.generate_content(
                        model=selected_model,
                        contents=[chunk_file, chunk_prompt],
                    )
                    
                    chunk_text = getattr(chunk_resp, "text", "") or ""
                    print(f"  📝 Response: {len(chunk_text)} chars")
                    
                    if chunk_text:
                        try:
                            chunk_clips = extract_json_array(chunk_text)
                            print(f"  ✅ Found {len(chunk_clips)} clips in chunk {chunk_idx+1}")
                            all_clips_raw.extend(chunk_clips)
                        except Exception as parse_err:
                            print(f"  ⚠️ Failed to parse chunk {chunk_idx+1}: {parse_err}")
                    
                    # Cleanup: delete chunk from Gemini
                    try:
                        client.files.delete(name=chunk_file.name)
                    except Exception:
                        pass
                    
                except Exception as chunk_err:
                    print(f"  ⚠️ Chunk {chunk_idx+1} failed: {chunk_err}")
                finally:
                    if os.path.exists(chunk_path):
                        os.unlink(chunk_path)
            
            if not all_clips_raw:
                raise RuntimeError("No clips found in any chunk. Video may not contain analyzable content.")
            
            print(f"\n📊 Total clips from all chunks: {len(all_clips_raw)}")
            clips_raw = all_clips_raw
            video_file = None  # No single file to delete
            
        else:
            # Short video: upload directly (no chunking needed)
            print(f"📦 Video OK for Gemini: {file_size_mb:.0f}MB, {duration:.0f}s ({duration/60:.0f}min)")
        
            print("⬆️ Uploading to Gemini...")
            video_file = client.files.upload(file=video_path)

            max_wait_sec = 300
            started = time.time()
            while True:
                state_str = str(video_file.state).upper()
                if "ACTIVE" in state_str:
                    break
                if "FAILED" in state_str:
                    raise RuntimeError(f"Gemini file processing failed. State={video_file.state}")
                if time.time() - started > max_wait_sec:
                    raise TimeoutError(f"Gemini file stuck in processing > {max_wait_sec}s. State={video_file.state}")
                elapsed = int(time.time() - started)
                if elapsed % 10 == 0:  # Print every 10s to reduce log spam
                    print(f"⏳ Processing... ({elapsed}s, state={video_file.state})")
                time.sleep(2)  # Poll every 2s instead of 5s — saves 15-30s
                video_file = client.files.get(name=video_file.name)

            print(f"✅ Gemini file ready (state={video_file.state})")

            prompt = f"""
You are a viral content expert. Analyze this video and identify exactly {num_clips} viral moments.

LANGUAGE RULES:
- DETECT the language spoken in the video.
- Write the "title" and "reason" fields IN THE SAME LANGUAGE as the video.
  For example: if the video is in Ukrainian, write Ukrainian titles.
  If the video is in Spanish, write Spanish titles.
  If the video is in English, write English titles.
- Include a "detected_language" field with the ISO language code (e.g., "en", "uk", "es", "fr").

CRITICAL REQUIREMENTS:
- You MUST return EXACTLY {num_clips} clips. Not more, not less. This is the #1 requirement.
- Each clip MUST be between {min_len} and {max_len} seconds long. This is NON-NEGOTIABLE.
- Clips shorter than {min_len}s or longer than {max_len}s will be REJECTED.
- If the video is short and you can't find {num_clips} unique moments, overlap slightly but still return {num_clips}.
- Each clip must start with a strong hook (first 3 seconds must grab attention).
- Clips must contain complete thoughts — never cut mid-sentence.
- Distribute clips throughout the entire video, not just the beginning.

For each moment, provide:
1. start_time: Exact second when moment starts (float)
2. end_time: Exact second when moment ends (float). MUST be at least {min_len}s after start_time.
3. title: Catchy, scroll-stopping title IN THE VIDEO'S LANGUAGE (5-8 words, use power words)
4. hook_strength: Score 1-10 (how strong is the first 3 seconds)
5. viral_score: Overall viral potential 1-10
6. reason: Why this moment would go viral — IN THE VIDEO'S LANGUAGE
7. detected_language: ISO code of the spoken language
8. hook_variants: Array of 3 alternative opening lines for the first 3 seconds. Each must be IN THE VIDEO'S LANGUAGE. Format:
   [
     {{"type": "shocking_fact", "label": "Shocking Fact", "text": "A surprising statement to open with"}},
     {{"type": "question", "label": "Question", "text": "A provocative question to hook viewers"}},
     {{"type": "result_first", "label": "Result First", "text": "Start with the end result to create curiosity"}}
   ]

Video duration: {duration} seconds
Required clips: EXACTLY {num_clips}

Return ONLY valid JSON array:
[
  {{
    "start_time": 15.5,
    "end_time": 52.8,
    "title": "The Productivity Mistake Everyone Makes",
    "hook_strength": 9,
    "viral_score": 8,
    "reason": "Opens with surprising statistic, builds tension, delivers actionable insight",
    "detected_language": "en",
    "hook_variants": [
      {{"type": "shocking_fact", "label": "Shocking Fact", "text": "90% of people waste 3 hours a day on this one mistake"}},
      {{"type": "question", "label": "Question", "text": "What if everything you know about productivity is wrong?"}},
      {{"type": "result_first", "label": "Result First", "text": "I doubled my output in one week by changing just one habit"}}
    ]
  }}
]
"""
            print("🧠 Analyzing viral moments...")

            # Retry logic for Gemini (handles 429 rate limits)
            resp = None
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    resp = client.models.generate_content(
                        model=selected_model,
                        contents=[video_file, prompt],
                    )
                    break
                except Exception as gemini_err:
                    err_str = str(gemini_err)
                    if "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower():
                        wait_time = min(15 * (3 ** attempt), 300)
                        remaining = max_retries - attempt - 1
                        print(f"⚠️ Gemini rate limited. Waiting {wait_time}s (attempt {attempt+1}/{max_retries}, {remaining} retries left)...")
                        time.sleep(wait_time)
                    elif "500" in err_str or "503" in err_str or "InternalError" in err_str:
                        wait_time = 10 * (attempt + 1)
                        print(f"⚠️ Gemini server error. Waiting {wait_time}s (attempt {attempt+1}/{max_retries})...")
                        time.sleep(wait_time)
                    else:
                        raise

            if resp is None:
                raise RuntimeError(f"Gemini failed after {max_retries} retries (rate limited). Try again in a few minutes.")

            resp_text = getattr(resp, "text", "") or ""
            print(f"📝 Gemini response length: {len(resp_text)} chars")
            if len(resp_text) < 50:
                print(f"📝 Full response: {repr(resp_text)}")
                if len(resp_text) < 10:
                    print("⚠️ Empty response from Gemini, retrying with stronger prompt...")
                    try:
                        stronger_prompt = (
                            "IMPORTANT: You MUST respond with a JSON array. Do NOT return empty text.\n\n" 
                            + prompt
                        )
                        resp = client.models.generate_content(
                            model=selected_model,
                            contents=[video_file, stronger_prompt],
                        )
                        resp_text = getattr(resp, "text", "") or ""
                        print(f"📝 Retry response length: {len(resp_text)} chars")
                    except Exception as retry_err:
                        print(f"⚠️ Retry failed: {retry_err}")
            else:
                print(f"📝 Response starts: {resp_text[:200]}")

            clips_raw = extract_json_array(resp_text)
        
        # Debug: log raw clips to understand format
        for i, rc in enumerate(clips_raw[:3]):
            print(f"  📋 Raw clip {i}: start={rc.get('start_time')}, end={rc.get('end_time')}, title={str(rc.get('title',''))[:40]}")

        # Auto-detect if timestamps are in minutes instead of seconds
        # If most clips have start_time < duration/60, they might be in minutes
        if clips_raw:
            avg_end = sum(float(c.get("end_time", 0)) for c in clips_raw) / len(clips_raw)
            if duration > 120 and avg_end < duration / 30:
                # Timestamps are likely in minutes — convert to seconds
                print(f"⚠️ Timestamps seem to be in minutes (avg_end={avg_end:.1f}, duration={duration:.0f}s). Converting to seconds...")
                for c in clips_raw:
                    c["start_time"] = float(c.get("start_time", 0)) * 60
                    c["end_time"] = float(c.get("end_time", 0)) * 60

        cleaned = []
        for c in clips_raw:
            try:
                st = float(c["start_time"])
                en = float(c["end_time"])
                if en <= st:
                    continue
                st = max(0.0, min(st, duration))
                en = max(0.0, min(en, duration))
                clip_dur = en - st
                # Enforce minimum length (at least half of requested min)
                if clip_dur < max(5, min_len * 0.5):
                    print(f"⚠️ Skipping clip too short: {clip_dur:.1f}s (min: {min_len}s)")
                    continue
                cleaned.append({
                    "start_time": st,
                    "end_time": en,
                    "title": str(c.get("title", "")).strip()[:80] or "Untitled",
                    "hook_strength": int(c.get("hook_strength", 5)),
                    "viral_score": int(c.get("viral_score", 5)),
                    "reason": str(c.get("reason", "")).strip()[:300],
                    "detected_language": str(c.get("detected_language", "en")),
                })
            except Exception:
                continue

        # Limit to requested number of clips, sorted by viral_score
        cleaned.sort(key=lambda x: x["viral_score"], reverse=True)
        cleaned = cleaned[:num_clips]

        if len(cleaned) < num_clips:
            print(f"⚠️ Got {len(cleaned)} clips but {num_clips} were requested. Gemini may not have found enough distinct moments.")

        # If no valid clips, retry with gemini-2.0-flash as fallback
        if not cleaned:
            print("⚠️ No valid clips from primary model. Retrying with gemini-2.0-flash...")
            try:
                resp2 = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[video_file, prompt],
                )
                clips_raw2 = extract_json_array(getattr(resp2, "text", ""))
                
                # Same auto-detect for minutes
                if clips_raw2:
                    avg_end2 = sum(float(c.get("end_time", 0)) for c in clips_raw2) / len(clips_raw2)
                    if duration > 120 and avg_end2 < duration / 30:
                        for c in clips_raw2:
                            c["start_time"] = float(c.get("start_time", 0)) * 60
                            c["end_time"] = float(c.get("end_time", 0)) * 60
                
                for c in clips_raw2:
                    try:
                        st = float(c["start_time"])
                        en = float(c["end_time"])
                        if en <= st:
                            continue
                        st = max(0.0, min(st, duration))
                        en = max(0.0, min(en, duration))
                        clip_dur = en - st
                        if clip_dur < max(5, min_len * 0.5):
                            continue
                        cleaned.append({
                            "start_time": st,
                            "end_time": en,
                            "title": str(c.get("title", "")).strip()[:80] or "Untitled",
                            "hook_strength": int(c.get("hook_strength", 5)),
                            "viral_score": int(c.get("viral_score", 5)),
                            "reason": str(c.get("reason", "")).strip()[:300],
                            "detected_language": str(c.get("detected_language", "en")),
                        })
                    except Exception:
                        continue
                cleaned.sort(key=lambda x: x["viral_score"], reverse=True)
                cleaned = cleaned[:num_clips]
                if cleaned:
                    print(f"✅ Fallback model found {len(cleaned)} clips!")
            except Exception as fb_err:
                print(f"⚠️ Fallback also failed: {fb_err}")

        if not cleaned:
            raise ValueError("Gemini returned no valid clips after validation.")

        print(f"✅ Found {len(cleaned)} viral moments!")

        # Reframe mode: "smart" (AI face), "full" (letterbox), "center" (center crop)
        reframe_mode = settings.get("reframeMode", settings.get("smartReframe", "center"))
        # Backward compat: old smartReframe: true/false → "smart"/"center"
        if reframe_mode is True:
            reframe_mode = "smart"
        elif reframe_mode is False:
            reframe_mode = "center"
        
        if reframe_mode == "smart":
            print("👤 Smart Reframing — detecting faces in each clip (parallel)...")
            from concurrent.futures import ThreadPoolExecutor, as_completed

            def detect_face_for_clip(i, clip):
                try:
                    st = clip["start_time"]
                    dur = clip["end_time"] - st
                    face_x = detect_face_position(video_path, st, dur)
                    return i, round(face_x, 3), None
                except Exception as face_err:
                    return i, 0.5, str(face_err)

            # Run face detection in parallel (up to 4 threads — limited by CPU/OpenCV)
            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = {executor.submit(detect_face_for_clip, i, clip): i for i, clip in enumerate(cleaned)}
                for future in as_completed(futures):
                    i, face_x, err = future.result()
                    cleaned[i]["face_x"] = face_x
                    cleaned[i]["reframe_mode"] = "smart"
                    if err:
                        print(f"  ⚠️ Clip {i+1}: face detect failed, using center: {err}")
                    else:
                        print(f"  👤 Clip {i+1}: face at {face_x:.0%}")

            print(f"👤 Face detection complete for {len(cleaned)} clips")
        elif reframe_mode == "full":
            print("📺 Full Frame mode — letterbox (no crop)")
            for clip in cleaned:
                clip["face_x"] = 0.5
                clip["reframe_mode"] = "full"
        else:
            print("🎯 Center Crop mode")
            for clip in cleaned:
                clip["face_x"] = 0.5
                clip["reframe_mode"] = "center"

        supabase = init_supabase()

        supabase.table("videos").update({
            "status": "ready",
            "duration_seconds": int(duration),
            "analysis_result": {"clips": cleaned},
        }).eq("id", video_id).execute()

        rows_to_insert = []
        detected_lang = cleaned[0].get("detected_language", "en") if cleaned else "en"
        for clip in cleaned:
            rows_to_insert.append({
                "user_id": user_id,
                "video_id": video_id,
                "title": clip["title"],
                "start_time": clip["start_time"],
                "end_time": clip["end_time"],
                "duration_seconds": int(clip["end_time"] - clip["start_time"]),
                "viral_score": clip["viral_score"],
                "viral_analysis": {
                    "hook_strength": clip["hook_strength"],
                    "reason": clip["reason"],
                    "detected_language": clip.get("detected_language", detected_lang),
                    "face_x": clip.get("face_x", 0.5),
                    "reframe_mode": clip.get("reframe_mode", "center"),
                    "hook_variants": clip.get("hook_variants", []),
                },
                "status": "pending",
            })
        
        print(f"🌍 Detected language: {detected_lang}")

        supabase.table("clips").insert(rows_to_insert).execute()

        print("✅ Analysis complete and saved to database!")

        # ─── Email notifications ───
        try:
            # Welcome email on first video
            video_count = supabase.table("videos").select("id", count="exact").eq("user_id", user_id).execute()
            if video_count.count == 1:  # First video ever
                email = get_user_email(user_id)
                if email:
                    send_welcome_email(email)
        except Exception:
            pass

        try:
            # Analysis complete email (only if user clicked "Get notified")
            video_row = supabase.table("videos").select("title, notify_on_complete").eq("id", video_id).execute()
            vtitle = video_row.data[0]["title"] if video_row.data else "Your video"
            should_notify = video_row.data[0].get("notify_on_complete", False) if video_row.data else False
            if should_notify:
                email = get_user_email(user_id)
                if email:
                    send_analysis_complete_email(email, vtitle, len(cleaned), video_id)
                    print(f"📧 Analysis complete notification sent for video {video_id[:8]}")
        except Exception as email_err:
            print(f"⚠️ Analysis email failed (non-fatal): {email_err}")
        # ─── End email notifications ───

        # Post-analysis: transcribe each clip for Remix Mode editing
        # This runs AFTER clips are saved so user sees them immediately
        # OPTIMIZATION: Extract all audio first (fast), then transcribe in parallel batches
        try:
            from concurrent.futures import ThreadPoolExecutor, as_completed

            inserted = supabase.table("clips").select("id, start_time, end_time").eq("video_id", video_id).order("start_time").execute()
            clip_rows = inserted.data or []

            if clip_rows:
                # Step 1: Extract all audio segments in sequence (FFmpeg is fast, ~1s each)
                audio_files = {}  # clip_id → (audio_path, clip_dur)
                for clip_row in clip_rows:
                    clip_id = clip_row["id"]
                    clip_start = float(clip_row["start_time"])
                    clip_end = float(clip_row["end_time"])
                    clip_dur = max(0.1, clip_end - clip_start)
                    audio_tmp = f"/tmp/transcribe_{clip_id}.wav"

                    extract_result = subprocess.run(
                        ["ffmpeg", "-y", "-ss", str(clip_start), "-t", str(clip_dur),
                         "-i", video_path, "-vn", "-acodec", "pcm_s16le",
                         "-ar", "16000", "-ac", "1", audio_tmp],
                        check=False, capture_output=True, timeout=60,
                    )
                    if extract_result.returncode == 0 and os.path.exists(audio_tmp):
                        audio_files[clip_id] = (audio_tmp, clip_dur)
                    else:
                        print(f"  ⚠️ Audio extraction failed for clip {clip_id[:8]}")

                print(f"🎵 Extracted audio for {len(audio_files)}/{len(clip_rows)} clips")

                # Step 2: Transcribe in parallel batches of 3 (Groq rate limit friendly)
                def transcribe_and_save(clip_id, audio_path, clip_dur):
                    try:
                        full_text, words = transcribe_audio(audio_path, clip_dur)
                        if words or full_text:
                            sb = init_supabase()
                            sb.table("clips").update({
                                "transcription": full_text[:5000] if full_text else None,
                                "transcription_words": words[:500] if words else None,
                            }).eq("id", clip_id).execute()
                            return clip_id, full_text[:60], len(words)
                        return clip_id, "", 0
                    except Exception as t_err:
                        print(f"  ⚠️ Transcription failed for clip {clip_id[:8]}: {t_err}")
                        return clip_id, "", 0
                    finally:
                        if os.path.exists(audio_path):
                            os.unlink(audio_path)

                with ThreadPoolExecutor(max_workers=3) as executor:
                    futures = {
                        executor.submit(transcribe_and_save, cid, apath, cdur): cid
                        for cid, (apath, cdur) in audio_files.items()
                    }
                    completed = 0
                    for future in as_completed(futures):
                        cid, text_preview, word_count = future.result()
                        completed += 1
                        if word_count > 0:
                            print(f"  📝 [{completed}/{len(audio_files)}] Transcribed {cid[:8]}: {text_preview}...")

                print(f"📝 Pre-transcribed {len(audio_files)} clips (parallel)")

        except Exception as transcribe_err:
            print(f"⚠️ Post-analysis transcription failed (non-fatal): {transcribe_err}")

        return {"success": True, "clips_found": len(cleaned), "duration": duration}

    except Exception as analysis_err:
        print(f"❌ Analysis failed: {analysis_err}")
        try:
            sb_err = init_supabase()
            sb_err.table("videos").update({
                "status": "failed",
            }).eq("id", video_id).execute()
        except Exception:
            pass
        raise

    finally:
        if video_path and os.path.exists(video_path):
            os.unlink(video_path)
        if video_file is not None:
            try:
                client.files.delete(name=video_file.name)
            except Exception:
                pass


# ============================================
# CLIP RENDERING WITH GROQ TRANSCRIPTION
# ============================================

def detect_face_position(video_path: str, start_time: float, duration: float) -> float:
    """
    Detect face position in video frames using MediaPipe.
    Returns horizontal center of face as fraction (0.0 = left, 1.0 = right, 0.5 = center).
    Falls back to 0.5 (center) if no face detected.
    
    Smart logic for multi-person scenes (interviews):
    - Tracks ALL faces per frame, not just largest
    - Groups face positions into clusters (left person vs right person)
    - Picks the cluster that appears most frequently (= main subject, usually the guest)
    - Uses median (not average) for stability against outliers
    """
    try:
        import cv2
        import mediapipe as mp
        
        mp_face = mp.solutions.face_detection
        face_det_short = mp_face.FaceDetection(model_selection=0, min_detection_confidence=0.35)
        face_det_full = mp_face.FaceDetection(model_selection=1, min_detection_confidence=0.35)
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print("⚠️ Face detect: couldn't open video")
            return 0.5
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Adaptive sampling: 1 frame per 2 seconds (min 15, max 30)
        num_samples = max(15, min(30, int(duration / 2)))
        sample_times = [
            start_time + duration * (i + 0.5) / num_samples 
            for i in range(num_samples)
        ]
        
        # Collect ALL face positions from ALL frames (not just the largest per frame)
        all_face_positions = []  # list of (face_cx, face_area) tuples
        frames_with_faces = 0
        
        for t in sample_times:
            frame_num = int(t * fps)
            if frame_num >= total_frames:
                continue
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            if not ret:
                continue
            
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Try short-range model first, then full-range
            results = face_det_short.process(rgb)
            if not results.detections:
                results = face_det_full.process(rgb)
            
            if results.detections:
                frames_with_faces += 1
                for det in results.detections:
                    bb = det.location_data.relative_bounding_box
                    face_cx = bb.xmin + bb.width / 2
                    face_area = bb.width * bb.height
                    all_face_positions.append((face_cx, face_area))
        
        cap.release()
        face_det_short.close()
        face_det_full.close()
        
        if not all_face_positions:
            print("👤 Face detect: no faces found, using center crop")
            return 0.5
        
        # Dynamic gap-based clustering (better than fixed 0.4/0.6 buckets)
        # Find the biggest gap in sorted positions to separate clusters
        xs_sorted = sorted([p[0] for p in all_face_positions])
        
        best_gap = 0
        best_gap_idx = -1
        for gi in range(len(xs_sorted) - 1):
            gap = xs_sorted[gi + 1] - xs_sorted[gi]
            if gap > best_gap:
                best_gap = gap
                best_gap_idx = gi
        
        if best_gap < 0.15 or best_gap_idx < 0:
            # No significant gap — single cluster (single person or all centered)
            positions = sorted([p[0] for p in all_face_positions])
            result = positions[len(positions) // 2]  # median
            print(f"👤 Face detect: single cluster, {frames_with_faces}/{num_samples} frames, median position: {result:.2f}")
            return result
        
        # Split into two clusters at the biggest gap
        split_val = (xs_sorted[best_gap_idx] + xs_sorted[best_gap_idx + 1]) / 2
        cluster_a = [p for p in all_face_positions if p[0] <= split_val]
        cluster_b = [p for p in all_face_positions if p[0] > split_val]
        
        clusters = []
        if cluster_a:
            avg_x_a = sum(p[0] for p in cluster_a) / len(cluster_a)
            label_a = "left" if avg_x_a < 0.5 else "center-left"
            clusters.append((label_a, cluster_a))
        if cluster_b:
            avg_x_b = sum(p[0] for p in cluster_b) / len(cluster_b)
            label_b = "right" if avg_x_b > 0.5 else "center-right"
            clusters.append((label_b, cluster_b))
        
        if len(clusters) <= 1:
            positions = sorted([p[0] for p in all_face_positions])
            result = positions[len(positions) // 2]
            print(f"👤 Face detect: single cluster after gap analysis, median: {result:.2f}")
            return result
        
        # Multiple clusters (interview scenario) — pick the most frequent one
        # Most frequent = camera shows this person more = likely the main subject
        clusters.sort(key=lambda c: len(c[1]), reverse=True)
        best_cluster_name, best_cluster_faces = clusters[0]
        second_cluster_name, second_cluster_faces = clusters[1]
        
        # If clusters are close in frequency (within 20%), prefer the larger face (= closer to camera = guest)
        freq_ratio = len(second_cluster_faces) / max(len(best_cluster_faces), 1)
        if freq_ratio > 0.8:
            # Similar frequency — use average face area to pick the closer person
            avg_area_best = sum(f[1] for f in best_cluster_faces) / len(best_cluster_faces)
            avg_area_second = sum(f[1] for f in second_cluster_faces) / len(second_cluster_faces)
            if avg_area_second > avg_area_best * 1.1:
                # Second cluster has bigger faces — switch
                best_cluster_name, best_cluster_faces = second_cluster_name, second_cluster_faces
                print(f"👤 Face detect: switched to {best_cluster_name} cluster (bigger faces)")
        
        # Use median of the winning cluster
        positions = sorted([p[0] for p in best_cluster_faces])
        result = positions[len(positions) // 2]  # median
        
        print(f"👤 Face detect: {len(clusters)} clusters ({', '.join(f'{c[0]}:{len(c[1])}' for c in clusters)}), "
              f"picked {best_cluster_name} ({len(best_cluster_faces)} detections), median: {result:.2f}")
        return result
        
    except Exception as e:
        print(f"⚠️ Face detect failed (non-fatal): {e}")
        return 0.5


@app.function(
    image=image,
    secrets=secrets,
    timeout=900,
    memory=4096,                   # 4GB RAM (was 2GB — ffmpeg needs more for 1080p)
    scaledown_window=120,          # Keep warm 2 min between renders
    max_containers=20,             # 20 parallel renders — handles burst of 5000 users
)
def render_clip(
    clip_id: str,
    video_storage_path: str,
    start_time: float,
    end_time: float,
    caption_style: str = "hormozi",
    custom_transcription: str = "",
    custom_color: str = "",
    crop_x: float = 0.5,           # 0.0=left, 0.5=center, 1.0=right (from face detection or user slider)
    subtitle_size: str = "medium",  # small/medium/large
    subtitle_y: float = 0.85,      # 0.0=top, 0.5=middle, 1.0=bottom (vertical position)
    reframe_mode: str = "center",  # "smart", "full", "center"
):
    from datetime import datetime, timezone

    print(f"🎬 Rendering clip: {clip_id}")
    print(f"⏱️ Time range: {start_time}s - {end_time}s")
    print(f"📂 Storage path: {video_storage_path}")

    supabase = init_supabase()

    # Build authenticated URL for private bucket
    bucket = os.environ.get("SUPABASE_RAW_VIDEOS_BUCKET", "raw-videos")
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    video_url = f"{supabase_url}/storage/v1/object/{bucket}/{video_storage_path}"
    service_role_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    auth_headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
    }

    video_path = None
    audio_path = None
    srt_path = None
    output_path = None

    try:
        ts = datetime.now(timezone.utc).isoformat()

        # Check credits and plan before starting render
        is_free_tier = True  # default to free (watermark ON)
        clip_row = supabase.table("clips").select("user_id").eq("id", clip_id).execute()
        if clip_row.data:
            render_user_id = clip_row.data[0]["user_id"]
            credit_row = supabase.table("user_credits").select("total_credits, used_credits, plan").eq("user_id", render_user_id).execute()
            if credit_row.data:
                total = credit_row.data[0].get("total_credits", 0)
                used = credit_row.data[0].get("used_credits", 0)
                user_plan = credit_row.data[0].get("plan", "free")
                is_free_tier = user_plan in ("free", "Free", "")
                remaining = total - used
                if remaining <= 0:
                    print(f"❌ No credits remaining for user {render_user_id} ({used}/{total})")
                    supabase.table("clips").update({
                        "status": "failed",
                        "error_message": "No render credits remaining. Please upgrade your plan.",
                    }).eq("id", clip_id).execute()
                    return {"success": False, "error": "NO_CREDITS"}
                print(f"💰 Credits OK: {remaining} remaining ({used}/{total})")

        supabase.table("clips").update({
            "status": "rendering",
            "render_started_at": ts,
        }).eq("id", clip_id).execute()

        # Download source video with auth
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            download_video(video_url, tmp.name, auth_headers=auth_headers)
            video_path = tmp.name

        # Audio extraction (for transcription)
        audio_path = video_path.replace(".mp4", ".wav")
        words = []
        full_text = ""

        if custom_transcription and custom_transcription.strip():
            # Use custom transcription from user edits
            print(f"📝 Using custom transcription ({len(custom_transcription)} chars)")
            full_text = custom_transcription.strip()
            clip_duration = max(0.1, float(end_time) - float(start_time))
            text_words = full_text.split()
            word_duration = clip_duration / max(len(text_words), 1)
            for i, tw in enumerate(text_words):
                words.append({
                    "word": tw,
                    "start": round(i * word_duration, 3),
                    "end": round((i + 1) * word_duration, 3),
                })
            print(f"📝 Created {len(words)} timed words from custom transcription")
        else:
            # Try to use pre-transcription from DB first (faster — no re-transcription needed)
            clip_data = supabase.table("clips").select("transcription, transcription_words").eq("id", clip_id).execute()
            db_words = None
            db_text = None
            if clip_data.data:
                db_words = clip_data.data[0].get("transcription_words")
                db_text = clip_data.data[0].get("transcription")

            if db_words and isinstance(db_words, list) and len(db_words) > 0:
                # Use existing transcription from pre-analysis
                print(f"📝 Using pre-transcription from DB ({len(db_words)} words)")
                words = db_words
                full_text = db_text or " ".join(w.get("word", "") for w in db_words)
            else:
                # Transcribe with Groq (fresh transcription)
                print("🎵 Extracting audio...")
                clip_duration = max(0.1, float(end_time) - float(start_time))
                subprocess.run(
                    [
                        "ffmpeg", "-y",
                        "-ss", str(start_time),
                        "-t", str(clip_duration),
                        "-i", video_path,
                        "-vn",
                        "-acodec", "pcm_s16le",
                        "-ar", "16000",
                        "-ac", "1",
                        audio_path,
                    ],
                    check=True,
                    capture_output=True,
                )

                print("📝 Transcribing with Groq...")
                full_text, words = transcribe_audio(audio_path, clip_duration)
                print(f"📝 Transcribed: {len(words)} words")

        print(f"✅ Transcription: {full_text[:120]}...")
        print(f"📝 Words extracted: {len(words)}")

        # SRT captions
        srt_path = video_path.replace(".mp4", ".srt")
        generate_srt(words, srt_path, caption_style)

        # Render output — CROP to 9:16 (fills entire vertical frame)
        output_path = video_path.replace(".mp4", "_rendered.mp4")
        print("🎨 Rendering with captions...")

        duration = max(0.1, float(end_time) - float(start_time))

        # Check if SRT has content
        srt_has_content = os.path.exists(srt_path) and os.path.getsize(srt_path) > 10

        # Video filter: reframe to 9:16 based on reframe_mode
        # Get video dimensions with ffprobe
        try:
            probe_result = subprocess.run(
                ["ffprobe", "-v", "error", "-select_streams", "v:0",
                 "-show_entries", "stream=width,height", "-of", "csv=p=0",
                 video_path],
                capture_output=True, text=True, check=True,
            )
            vid_w, vid_h = [int(x) for x in probe_result.stdout.strip().split(",")]
        except Exception:
            vid_w, vid_h = 1920, 1080  # fallback
        
        # Determine output resolution: match source quality (no upscale, no downscale)
        # For free tier: cap at 1080p; paid plans: native resolution
        if is_free_tier and vid_h > 1080:
            out_h = 1080
        else:
            out_h = vid_h
        out_w = int(out_h * 9 / 16)  # 9:16 aspect ratio
        # Ensure even numbers for ffmpeg
        out_w = out_w + (out_w % 2)
        out_h = out_h + (out_h % 2)
        
        print(f"📐 Source: {vid_w}x{vid_h}, Output: {out_w}x{out_h} ({'capped 1080p (free)' if is_free_tier and vid_h > 1080 else 'native quality'}), reframe_mode={reframe_mode}")
        
        if reframe_mode == "full":
            # Full Frame: scale down to fit width, pad with black bars top/bottom
            crop_vf = f"scale={out_w}:-2,pad={out_w}:{out_h}:(ow-iw)/2:(oh-ih)/2:black"
            print(f"📺 Full Frame: letterbox with black bars")
        else:
            # Smart or Center: crop to 9:16
            crop_w = int(vid_h * 9 / 16)
            crop_h = vid_h
            face_pct = max(0.1, min(0.9, crop_x))
            crop_x_px = int(vid_w * face_pct - crop_w / 2)
            crop_x_px = max(0, min(crop_x_px, vid_w - crop_w))
            crop_vf = f"crop={crop_w}:{crop_h}:{crop_x_px}:0,scale={out_w}:{out_h}"
            mode_label = "Smart (face)" if reframe_mode == "smart" else "Center"
            print(f"👤 {mode_label}: crop={crop_w}x{crop_h} at x={crop_x_px} → output {out_w}x{out_h}")

        # Subtitle size mapping
        subtitle_size_map = {
            "small": 0.7,
            "medium": 1.0,
            "large": 1.4,
        }
        size_multiplier = subtitle_size_map.get(subtitle_size, 1.0)

        # Subtitle vertical position: convert 0-1 to MarginV
        # 0.0 = top (MarginV = 400), 0.5 = middle (MarginV = 200), 1.0 = bottom (MarginV = 20)
        margin_v = int(420 - (subtitle_y * 400))
        margin_v = max(10, min(420, margin_v))

        if srt_has_content:
            # For subtitles filter, we need to apply AFTER scaling
            escaped_srt = srt_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
            # Use custom color if provided, otherwise use preset style
            if custom_color and len(custom_color) == 6:
                style_str = build_custom_caption_style(custom_color)
                print(f"🎨 Using custom color: #{custom_color}")
            else:
                style_str = CAPTION_STYLES.get(caption_style, CAPTION_STYLES["hormozi"])
            
            # Apply user's subtitle size and position overrides
            import re as _re
            if size_multiplier != 1.0:
                # Parse existing FontSize from style and multiply
                fs_match = _re.search(r'FontSize=(\d+)', style_str)
                if fs_match:
                    orig_size = int(fs_match.group(1))
                    new_size = int(orig_size * size_multiplier)
                    style_str = _re.sub(r'FontSize=\d+', f'FontSize={new_size}', style_str)
                    print(f"📏 Subtitle size: {orig_size} → {new_size} ({subtitle_size})")
            
            # Apply vertical position override
            style_str = _re.sub(r'MarginV=\d+', f'MarginV={margin_v}', style_str) if 'MarginV=' in style_str else style_str + f',MarginV={margin_v}'
            print(f"📐 Subtitle position: MarginV={margin_v} (y={subtitle_y:.0%})")
            
            vf = f"{crop_vf},subtitles={escaped_srt}:force_style='{style_str}'"
            print(f"📝 Subtitles: YES ({os.path.getsize(srt_path)} bytes, {len(words)} words)")
        else:
            vf = crop_vf
            print("📝 Subtitles: NONE (no words extracted)")

        # Add watermark for free tier users
        if is_free_tier:
            watermark_text = "HookCut.com"
            # Semi-transparent white text in top-right corner
            wm_filter = (
                f"drawtext=text='{watermark_text}':"
                "fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:"
                "fontsize=28:fontcolor=white@0.4:"
                "x=w-tw-20:y=20"
            )
            vf = f"{vf},{wm_filter}"
            print("💧 Watermark: YES (free tier)")
        else:
            print("💧 Watermark: NO (paid plan)")

        ffmpeg_result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", str(start_time),
                "-t", str(duration),
                "-i", video_path,
                "-vf", vf,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                output_path,
            ],
            capture_output=True,
            text=True,
        )

        if ffmpeg_result.returncode != 0:
            stderr = (ffmpeg_result.stderr or "")[-500:]
            print(f"⚠️ FFmpeg stderr: {stderr}")

            # Retry without subtitles if they caused the failure
            if srt_has_content:
                print("🔄 Retrying without subtitles...")
                subprocess.run(
                    [
                        "ffmpeg", "-y",
                        "-ss", str(start_time),
                        "-t", str(duration),
                        "-i", video_path,
                        "-vf", crop_vf,
                        "-c:v", "libx264",
                        "-preset", "fast",
                        "-crf", "23",
                        "-c:a", "aac",
                        "-b:a", "128k",
                        output_path,
                    ],
                    check=True,
                    capture_output=True,
                )
            else:
                # Last resort: simple scale+pad (works for any input)
                print("🔄 Retrying with scale+pad fallback...")
                vf_fallback = (
                    "scale=1080:1920:force_original_aspect_ratio=decrease,"
                    "pad=1080:1920:(ow-iw)/2:(oh-ih)/2"
                )
                subprocess.run(
                    [
                        "ffmpeg", "-y",
                        "-ss", str(start_time),
                        "-t", str(duration),
                        "-i", video_path,
                        "-vf", vf_fallback,
                        "-c:v", "libx264",
                        "-preset", "fast",
                        "-crf", "23",
                        "-c:a", "aac",
                        "-b:a", "128k",
                        output_path,
                    ],
                    check=True,
                    capture_output=True,
                )

        print("✅ Rendering complete!")

        # Upload to R2
        s3_key = f"clips/{clip_id}.mp4"
        clip_url = upload_to_r2(output_path, s3_key, content_type="video/mp4")

        ts2 = datetime.now(timezone.utc).isoformat()

        supabase.table("clips").update({
            "status": "ready",
            "file_path": clip_url,
            "render_completed_at": ts2,
            "transcription": full_text[:5000] if full_text else None,
            "transcription_words": words[:500] if words else None,
        }).eq("id", clip_id).execute()

        # Deduct 1 credit ONLY after successful render
        try:
            clip_row2 = supabase.table("clips").select("user_id").eq("id", clip_id).execute()
            if clip_row2.data:
                uid = clip_row2.data[0]["user_id"]
                supabase.rpc("increment_used_credits", {"p_user_id": uid, "p_amount": 1}).execute()
                print(f"💰 Deducted 1 credit for user {uid[:8]}")

                # Check remaining credits and notify if low
                try:
                    credit_check = supabase.table("user_credits").select("total_credits, used_credits").eq("user_id", uid).execute()
                    if credit_check.data:
                        total = credit_check.data[0].get("total_credits", 0)
                        used_now = credit_check.data[0].get("used_credits", 0)
                        remaining = total - used_now
                        if remaining in (3, 1, 0):
                            email = get_user_email(uid)
                            if email:
                                send_low_credits_email(email, max(remaining, 0))
                except Exception:
                    pass  # Non-fatal

        except Exception as credit_err:
            print(f"⚠️ Credit deduction failed (non-fatal): {credit_err}")

        print(f"🎉 Clip ready: {clip_url}")
        return {"success": True, "clip_url": clip_url, "transcription": full_text}

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        supabase.table("clips").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", clip_id).execute()
        raise

    finally:
        for p in (video_path, audio_path, srt_path, output_path):
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass


# ============================================
# TRANSCRIBE CLIP (for manual clips)
# ============================================

@app.function(
    image=image,
    secrets=secrets,
    timeout=120,
    scaledown_window=120,          # Keep warm 2 min
    max_containers=15,             # 15 parallel transcriptions
)
def transcribe_clip_fn(
    clip_id: str,
    video_storage_path: str,
    start_time: float,
    end_time: float,
):
    """Transcribe a single clip and save transcription to DB.
    Used for manual clips that need subtitles before editing."""
    import tempfile, subprocess, os

    print(f"📝 Transcribing clip {clip_id}: {start_time}s - {end_time}s")
    
    supabase = init_supabase()
    clip_dur = max(0.1, end_time - start_time)
    
    video_path = None
    audio_path = None
    
    try:
        # Download source video (same approach as render_clip)
        bucket = os.environ.get("SUPABASE_RAW_VIDEOS_BUCKET", "raw-videos")
        supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
        service_role_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        
        video_url = video_storage_path
        if video_url.startswith("http"):
            # Already a full URL
            auth_headers = {}
        else:
            video_url = f"{supabase_url}/storage/v1/object/{bucket}/{video_storage_path}"
            auth_headers = {
                "Authorization": f"Bearer {service_role_key}",
                "apikey": service_role_key,
            }
        
        print(f"📥 Downloading: {video_url}")
        
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            download_video(video_url, tmp.name, auth_headers=auth_headers)
            video_path = tmp.name
        
        # Extract audio segment for the clip
        audio_path = f"/tmp/transcribe_{clip_id}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(start_time), "-t", str(clip_dur),
             "-i", video_path, "-vn", "-acodec", "pcm_s16le",
             "-ar", "16000", "-ac", "1", audio_path],
            check=True, capture_output=True,
        )
        
        # Transcribe
        full_text, words = transcribe_audio(audio_path, clip_dur)
        
        # Save to DB
        update_data = {}
        if words or full_text:
            update_data["transcription"] = full_text[:5000] if full_text else ""
            update_data["transcription_words"] = words[:500] if words else []
            print(f"✅ Transcribed: {full_text[:80]}... ({len(words)} words)")
        else:
            update_data["transcription"] = ""
            update_data["transcription_words"] = []
            print(f"⚠️ No speech detected in clip")
        
        supabase.table("clips").update(update_data).eq("id", clip_id).execute()
        
        return {"success": True, "text": full_text, "words_count": len(words)}
    
    except Exception as e:
        print(f"❌ Transcription failed for clip {clip_id}: {e}")
        # Save empty transcription so UI doesn't break
        try:
            supabase.table("clips").update({
                "transcription": "",
                "transcription_words": [],
            }).eq("id", clip_id).execute()
        except Exception:
            pass
        raise
    
    finally:
        for p in (video_path, audio_path):
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass


# ============================================
# AI TITLE & HASHTAGS GENERATOR
# ============================================

@app.function(
    image=image,
    secrets=secrets,
    timeout=60,
)
def generate_ai_titles(
    clip_id: str,
    transcription: str,
    platform: str = "tiktok",
):
    """Generate 3 viral title variants + hashtags using Gemini."""
    from google import genai
    import json

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    platform_guidelines = {
        "tiktok": "TikTok: max 150 chars, hook in first 3 words, trending hashtags, emoji OK, casual tone",
        "youtube": "YouTube Shorts: max 100 chars, SEO-friendly, searchable keywords, professional but catchy",
        "instagram": "Instagram Reels: max 125 chars, mix of popular + niche hashtags, aesthetic vibe, emoji encouraged",
    }

    guidelines = platform_guidelines.get(platform, platform_guidelines["tiktok"])

    prompt = f"""You are a viral content strategist. Based on this video transcript, generate titles and hashtags.

CRITICAL: Detect the language of the transcript below. ALL your output (titles, hashtags, description) MUST be in the SAME language as the transcript. If the transcript is in Ukrainian — respond in Ukrainian. If English — respond in English. Etc.

TRANSCRIPT:
{transcription[:2000]}

PLATFORM: {platform}
GUIDELINES: {guidelines}

Return ONLY valid JSON (no markdown, no backticks):
{{
  "titles": [
    {{ "text": "Title variant 1", "style": "hook" }},
    {{ "text": "Title variant 2", "style": "curiosity" }},
    {{ "text": "Title variant 3", "style": "emotional" }}
  ],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "description": "A 1-2 sentence engaging description for the post"
}}

Rules:
- Title style "hook": Start with a bold claim or question that stops scrolling
- Title style "curiosity": Create a curiosity gap — make viewer NEED to watch
- Title style "emotional": Trigger an emotion (surprise, humor, inspiration)
- Generate exactly 5 relevant hashtags for {platform} (mix popular + niche)
- Hashtags can include some English trending tags even if content is non-English
- Description should be 1-2 sentences, engaging, with a call to action
- Use emoji sparingly (1-2 per title max)
"""

    import time
    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            text = response.text.strip()

            # Clean potential markdown formatting
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            result = json.loads(text)

            # Save to clip in DB
            try:
                supabase = init_supabase()
                supabase.table("clips").update({
                    "viral_analysis": {
                        **(supabase.table("clips").select("viral_analysis").eq("id", clip_id).execute().data[0].get("viral_analysis") or {}),
                        f"ai_titles_{platform}": result,
                    },
                }).eq("id", clip_id).execute()
            except Exception as db_err:
                print(f"⚠️ DB save failed (non-fatal): {db_err}")

            return {"success": True, "platform": platform, **result}

        except json.JSONDecodeError as je:
            print(f"⚠️ JSON parse failed: {je}, raw: {text[:200]}")
            return {"success": False, "error": "Failed to parse AI response", "titles": [], "hashtags": []}
        except Exception as e:
            last_error = e
            error_str = str(e)
            if "429" in error_str or "Resource exhausted" in error_str:
                wait_time = (attempt + 1) * 3
                print(f"⚠️ Rate limited (attempt {attempt+1}/{max_retries}), waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
            print(f"❌ AI title generation failed: {e}")
            return {"success": False, "error": str(e), "titles": [], "hashtags": []}

    print(f"❌ AI title generation failed after {max_retries} retries: {last_error}")
    return {"success": False, "error": f"Rate limited. Please try again in a minute.", "titles": [], "hashtags": []}


# ============================================
# LIVE TRANSCRIBE SEGMENT (for Remix Mode timeline edits)
# ============================================

@app.function(
    image=image,
    secrets=secrets,
    timeout=120,
    memory=1024,
)
def transcribe_video_segment(
    video_storage_path: str,
    start_time: float,
    end_time: float,
    clip_id: str = "",
):
    """Transcribe a specific segment of video. Returns words synchronously.
    Used when user adjusts timeline in Remix Mode and needs fresh subtitles."""

    print(f"🎙️ Transcribing segment: {start_time}s - {end_time}s")

    video_path = None
    audio_path = None

    try:
        # Download source video
        bucket = os.environ.get("SUPABASE_RAW_VIDEOS_BUCKET", "raw-videos")
        supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
        video_url = f"{supabase_url}/storage/v1/object/{bucket}/{video_storage_path}"
        service_role_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        auth_headers = {
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
        }

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            download_video(video_url, tmp.name, auth_headers=auth_headers)
            video_path = tmp.name

        # Extract audio for the specific segment
        duration = max(0.1, end_time - start_time)
        audio_path = f"/tmp/seg_audio_{clip_id or 'tmp'}_{int(start_time)}.wav"

        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(start_time), "-t", str(duration),
             "-i", video_path, "-vn", "-acodec", "pcm_s16le",
             "-ar", "16000", "-ac", "1", audio_path],
            check=True, capture_output=True,
        )

        # Transcribe
        full_text, words = transcribe_audio(audio_path, duration)

        print(f"✅ Transcribed: {len(words)} words, text: {full_text[:80]}...")

        # If clip_id provided, save to DB
        if clip_id:
            try:
                supabase = init_supabase()
                supabase.table("clips").update({
                    "transcription": full_text[:5000] if full_text else None,
                    "transcription_words": words[:500] if words else None,
                }).eq("id", clip_id).execute()
                print(f"💾 Saved transcription to clip {clip_id[:8]}")
            except Exception as db_err:
                print(f"⚠️ DB save failed (non-fatal): {db_err}")

        return {
            "success": True,
            "text": full_text,
            "words": words,
            "duration": duration,
            "word_count": len(words),
        }

    except Exception as e:
        print(f"❌ Transcribe segment failed: {e}")
        return {"success": False, "error": str(e), "words": [], "text": ""}

    finally:
        for p in [video_path, audio_path]:
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass


# ============================================
# WEBHOOK - CALL FROM LOVABLE
# ============================================

@app.function(
    image=webhook_image,
    secrets=secrets,          # <-- FIX: was missing secrets!
    timeout=300,
)
def trigger_analysis(video_id: str):
    """Trigger video analysis - call this from Lovable"""

    print(f"🚀 trigger_analysis called for video_id={video_id}")

    # Debug: confirm env vars are loaded
    supabase_url = os.environ.get("SUPABASE_URL")
    has_key = bool(os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
    print(f"🔗 SUPABASE_URL={supabase_url}, SERVICE_ROLE_KEY={'set' if has_key else 'MISSING'}")

    supabase = init_supabase()

    # IMPORTANT: don't use .single() here (it errors on 0 rows)
    res = supabase.table("videos").select("*").eq("id", video_id).execute()
    rows = res.data or []
    if not rows:
        print(f"❌ VIDEO_NOT_FOUND: {video_id}")
        return {"success": False, "error": "VIDEO_NOT_FOUND", "video_id": video_id}

    video_data = rows[0]
    storage_path = video_data.get("file_path") or video_data.get("storage_path")
    user_id = video_data.get("user_id")

    if not storage_path:
        print(f"❌ NO_STORAGE_PATH for video: {video_id}")
        return {"success": False, "error": "NO_STORAGE_PATH", "video_id": video_id}

    # Build authenticated URL for private bucket
    bucket = os.environ.get("SUPABASE_RAW_VIDEOS_BUCKET", "raw-videos")
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    video_url = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"
    print(f"🔐 Using authenticated storage URL (private bucket)")

    print(f"📹 Video URL: {video_url}")
    print(f"👤 User ID: {user_id}")

    # Auth headers for private bucket download
    service_role_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    auth_headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
    }

    # Read user settings
    settings = video_data.get("settings") or {}
    print(f"⚙️ User settings: {settings}")

    analyze_video_with_gemini.spawn(
        video_url=video_url,
        video_id=video_id,
        user_id=user_id,
        auth_headers=auth_headers,
        settings=settings,
    )

    return {"success": True, "status": "started", "video_id": video_id}


# ============================================
# YOUTUBE IMPORT
# ============================================

@app.function(
    image=image,
    secrets=secrets,
    timeout=1800,                  # 30 min (download + AV1→H264 transcode + upload)
    memory=4096,
    cpu=2.0,                       # 2 CPU cores for FFmpeg transcode
    scaledown_window=120,          # Keep warm 2 min
    max_containers=10,             # 10 parallel YouTube downloads
)
def download_youtube_and_analyze(youtube_url: str, video_id: str, user_id: str):
    """Download YouTube video, upload to Supabase Storage, then trigger analysis"""
    import requests as req

    print(f"🎬 YouTube import: {youtube_url}")
    print(f"📦 Video ID: {video_id}, User: {user_id}")

    supabase = init_supabase()
    video_path = None

    try:
        # Update status
        supabase.table("videos").update({"status": "downloading"}).eq("id", video_id).execute()

        # Download with yt-dlp (try multiple strategies)
        video_path = f"/tmp/yt_{video_id}.mp4"
        print("📥 Downloading from YouTube...")

        # Write cookies file from env
        cookies_path = f"/tmp/yt_cookies_{video_id}.txt"
        cookies_b64 = os.environ.get("YOUTUBE_COOKIES_B64", "")
        if cookies_b64:
            import base64
            with open(cookies_path, "wb") as cf:
                cf.write(base64.b64decode(cookies_b64))
            print("🍪 YouTube cookies loaded")
        else:
            cookies_path = None
            print("⚠️ No YouTube cookies configured")

        # Build cookie args
        cookie_args = ["--cookies", cookies_path] if cookies_path else []

        # Strategy 1: yt-dlp with cookies + best quality
        # Since yt-dlp 2025.11.12, a JS runtime (deno) is required for YouTube
        # Deno is the recommended runtime — sandboxed, single binary, enabled by default
        js_runtime_args = []  # deno is enabled by default, no need to specify
        ejs_args = ["--remote-components", "ejs:github"]  # download EJS solver from GitHub

        # First run a diagnostic to see what formats are available
        diag_cmd = [
            "yt-dlp", *ejs_args,
            "--list-formats", "--no-playlist",
            "--no-check-certificates",
            *cookie_args,
            youtube_url,
        ]
        diag_result = subprocess.run(diag_cmd, capture_output=True, text=True, timeout=60)
        print(f"📋 Available formats:\n{(diag_result.stdout or '')[-800:]}")
        if diag_result.stderr:
            print(f"📋 Diag stderr:\n{(diag_result.stderr or '')[-400:]}")

        # android_vr does NOT support cookies, so we must NOT pass cookies with it
        # web/web_safari DO support cookies but need PO token / EJS
        yt_dlp_strategies = [
            # Strategy 1: cookies + EJS + web_creator client + H.264
            [
                "yt-dlp",
                *ejs_args,
                "-f", YT_FORMAT_H264,
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--max-filesize", "500M",
                *cookie_args,
                "--no-check-certificates",
                "--socket-timeout", "30",
                "--retries", "3",
                "--extractor-args", "youtube:player_client=web_creator",
                "-o", video_path,
                youtube_url,
            ],
            # Strategy 2: cookies + EJS + default client + H.264
            [
                "yt-dlp",
                *ejs_args,
                "-f", YT_FORMAT_H264,
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--max-filesize", "500M",
                *cookie_args,
                "--no-check-certificates",
                "--socket-timeout", "30",
                "--retries", "3",
                "-o", video_path,
                youtube_url,
            ],
            # Strategy 3: cookies + EJS + missing_pot + H.264
            [
                "yt-dlp",
                *ejs_args,
                "-f", YT_FORMAT_H264,
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--max-filesize", "500M",
                *cookie_args,
                "--no-check-certificates",
                "--socket-timeout", "30",
                "--retries", "3",
                "--extractor-args", "youtube:formats=missing_pot",
                "-o", video_path,
                youtube_url,
            ],
            # Strategy 4: cookies + EJS + H.264 720p (YouTube almost always has 720p H.264)
            [
                "yt-dlp",
                *ejs_args,
                "-f", "136+ba/bv*[vcodec^=avc1][height<=720]+ba/b[height<=720]",
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--max-filesize", "500M",
                *cookie_args,
                "--no-check-certificates",
                "--socket-timeout", "30",
                "--retries", "3",
                "-o", video_path,
                youtube_url,
            ],
            # Strategy 5: cookies + EJS + ANY codec (may get AV1 — will transcode)
            [
                "yt-dlp",
                *ejs_args,
                "-f", YT_FORMAT_ANY,
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--max-filesize", "500M",
                *cookie_args,
                "--no-check-certificates",
                "--socket-timeout", "30",
                "--retries", "3",
                "--extractor-args", "youtube:player_client=web_creator",
                "-o", video_path,
                youtube_url,
            ],
            # Strategy 6: NO cookies, mweb client — sometimes works without auth
            [
                "yt-dlp",
                *ejs_args,
                "-f", "bv*+ba/b",
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--max-filesize", "500M",
                "--no-check-certificates",
                "--socket-timeout", "30",
                "--retries", "3",
                "--extractor-args", "youtube:player_client=mweb",
                "-o", video_path,
                youtube_url,
            ],
        ]

        downloaded = False
        last_error = ""

        for i, cmd in enumerate(yt_dlp_strategies):
            print(f"🔄 Strategy {i+1}/{len(yt_dlp_strategies)}...")
            print(f"   CMD: {' '.join(cmd[:6])}...")
            # Remove leftover file from previous attempt
            if os.path.exists(video_path):
                os.unlink(video_path)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode == 0 and os.path.exists(video_path):
                file_size_check = os.path.getsize(video_path)
                if file_size_check > 10000:  # must be more than 10KB (not just an error page)
                    downloaded = True
                    print(f"✅ Strategy {i+1} worked! File: {file_size_check / (1024*1024):.1f} MB")
                    break
                else:
                    print(f"⚠️ Strategy {i+1} produced tiny file ({file_size_check} bytes), skipping")
            last_error = (result.stderr or result.stdout or "")[-500:]
            print(f"⚠️ Strategy {i+1} failed: {last_error[:200]}...")

        # Fallback APIs (no cookies needed, no bot detection)
        if not downloaded:
            import re
            video_id_match = re.search(r'(?:v=|youtu\.be/)([\w-]{11})', youtube_url)
            if video_id_match:
                yt_video_id = video_id_match.group(1)

                # Fallback A: Cobalt API instances
                # Cobalt is an open-source media downloader — self-hosted instances don't need cookies
                # POST / with JSON body, returns {status: "tunnel"/"redirect", url: "..."}
                cobalt_instances = [
                    "https://cobalt.api.timelessnesses.me",
                    "https://cobalt.tskau.team",
                    "https://cobalt-api.ayo.tf",
                ]
                for cobalt_url in cobalt_instances:
                    try:
                        print(f"🔄 Trying Cobalt: {cobalt_url}...")
                        cobalt_resp = req.post(
                            f"{cobalt_url}/",
                            json={
                                "url": youtube_url,
                                "videoQuality": "1080",
                                "youtubeVideoCodec": "h264",
                                "downloadMode": "auto",
                            },
                            headers={
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                            },
                            timeout=30,
                        )
                        if cobalt_resp.status_code == 200:
                            cobalt_data = cobalt_resp.json()
                            cobalt_status = cobalt_data.get("status", "")
                            download_url = cobalt_data.get("url", "")

                            if cobalt_status in ("tunnel", "redirect") and download_url:
                                print(f"  📥 Downloading from Cobalt ({cobalt_status})...")
                                vid_resp = req.get(download_url, timeout=300, stream=True)
                                vid_resp.raise_for_status()
                                with open(video_path, "wb") as f:
                                    for chunk in vid_resp.iter_content(chunk_size=1024*1024):
                                        f.write(chunk)
                                if os.path.exists(video_path) and os.path.getsize(video_path) > 10000:
                                    downloaded = True
                                    print(f"✅ Cobalt download worked! File: {os.path.getsize(video_path) / (1024*1024):.1f} MB")
                                    break
                            else:
                                print(f"  ⚠️ Cobalt returned status={cobalt_status}: {cobalt_data.get('error', {}).get('code', 'unknown')}")
                        else:
                            print(f"  ⚠️ Cobalt {cobalt_url} returned HTTP {cobalt_resp.status_code}")
                    except Exception as ce:
                        print(f"  ⚠️ Cobalt {cobalt_url} failed: {str(ce)[:150]}")
                        continue

            # Fallback B: Invidious API instances
            if not downloaded and video_id_match:
                invidious_instances = [
                    "https://inv.nadeko.net",
                    "https://invidious.nerdvpn.de",
                    "https://invidious.privacyredirect.com",
                ]
                for inv_url in invidious_instances:
                    try:
                        print(f"🔄 Trying Invidious: {inv_url}...")
                        inv_resp = req.get(f"{inv_url}/api/v1/videos/{yt_video_id}", timeout=15)
                        if inv_resp.status_code == 200:
                            inv_data = inv_resp.json()
                            # Find best adaptive format (H.264, <= 1080p, has audio)
                            formats = inv_data.get("formatStreams", [])
                            best = None
                            for fmt in formats:
                                h = int(fmt.get("resolution", "0p").replace("p", "") or 0)
                                if h <= 1080 and (best is None or h > int(best.get("resolution", "0p").replace("p", "") or 0)):
                                    best = fmt
                            if best and best.get("url"):
                                print(f"  📥 Downloading from Invidious ({best.get('resolution', '?')})...")
                                vid_resp = req.get(best["url"], timeout=300, stream=True)
                                with open(video_path, "wb") as f:
                                    for chunk in vid_resp.iter_content(chunk_size=1024*1024):
                                        f.write(chunk)
                                if os.path.exists(video_path) and os.path.getsize(video_path) > 10000:
                                    downloaded = True
                                    print(f"✅ Invidious download worked!")
                                    break
                    except Exception as ie:
                        print(f"  ⚠️ Invidious {inv_url} failed: {str(ie)[:150]}")
                        continue

            # Fallback C: Piped API instances (last resort)
            if not downloaded and video_id_match:
                piped_instances = [
                    "https://pipedapi.kavin.rocks",
                    "https://pipedapi.r4fo.com",
                    "https://pipedapi.in.projectsegfau.lt",
                ]
                for piped_url in piped_instances:
                    try:
                        print(f"🔄 Trying Piped: {piped_url}...")
                        resp = req.get(f"{piped_url}/streams/{yt_video_id}", timeout=15)
                        if resp.status_code == 200:
                            data = resp.json()
                            streams = data.get("videoStreams", [])
                            best = None
                            for s in streams:
                                if s.get("videoOnly", True):
                                    continue
                                h = s.get("height", 0)
                                if h <= 1080 and (best is None or h > best.get("height", 0)):
                                    best = s
                            if not best and streams:
                                best = streams[0]
                            if best and best.get("url"):
                                print(f"  📥 Downloading from Piped ({best.get('quality', '?')})...")
                                vid_resp = req.get(best["url"], timeout=120, stream=True)
                                with open(video_path, "wb") as f:
                                    for chunk in vid_resp.iter_content(chunk_size=1024*1024):
                                        f.write(chunk)
                                if os.path.exists(video_path) and os.path.getsize(video_path) > 10000:
                                    downloaded = True
                                    print(f"✅ Piped download worked!")
                                    break
                    except Exception as pe:
                        print(f"  ⚠️ Piped {piped_url} failed: {pe}")
                        continue

        if not downloaded:
            raise RuntimeError(f"All download strategies failed. Last error: {last_error}")

        file_size = os.path.getsize(video_path)
        print(f"✅ Downloaded: {file_size / (1024*1024):.1f} MB")

        # Ensure moov atom is at start of file (faststart) for streaming/seeking
        try:
            faststart_path = video_path + ".faststart.mp4"
            fs_result = subprocess.run(
                ["ffmpeg", "-y", "-i", video_path, "-c", "copy",
                 "-movflags", "+faststart", faststart_path],
                capture_output=True, text=True, timeout=120
            )
            if fs_result.returncode == 0 and os.path.exists(faststart_path):
                orig_size = os.path.getsize(video_path)
                new_size = os.path.getsize(faststart_path)
                if new_size > orig_size * 0.9:  # sanity check — shouldn't shrink much
                    os.replace(faststart_path, video_path)
                    print("✅ Applied faststart (moov atom moved to front)")
                else:
                    os.unlink(faststart_path)
            elif os.path.exists(faststart_path):
                os.unlink(faststart_path)
        except Exception as fs_err:
            print(f"⚠️ Faststart failed (non-fatal): {fs_err}")

        # Check if we got AV1 despite requesting H.264 — transcode if needed
        # AV1 breaks face detection (MediaPipe/OpenCV) and can corrupt audio for Groq
        try:
            probe_result = subprocess.run(
                ["ffprobe", "-v", "error", "-select_streams", "v:0",
                 "-show_entries", "stream=codec_name", "-of", "csv=p=0", video_path],
                capture_output=True, text=True, timeout=10
            )
            video_codec = (probe_result.stdout or "").strip().lower()
            print(f"📹 Downloaded video codec: {video_codec}")

            if video_codec in ("av1", "av01"):
                # Test if OpenCV can decode AV1 frames — if yes, skip expensive transcode
                skip_transcode = False
                try:
                    import cv2
                    cap = cv2.VideoCapture(video_path)
                    ret, frame = cap.read()
                    cap.release()
                    if ret and frame is not None:
                        print("✅ AV1 is readable by OpenCV — skipping transcode (saves 5-10 min)")
                        skip_transcode = True
                except Exception as cv_err:
                    print(f"⚠️ OpenCV AV1 test failed: {cv_err}")

                if not skip_transcode:
                    print("⚠️ Got AV1 that OpenCV can't read — transcoding to H.264...")
                    h264_path = video_path.replace(".mp4", "_h264.mp4")
                    transcode_result = subprocess.run(
                        ["ffmpeg", "-y", "-i", video_path,
                         "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
                         "-vf", "scale=-2:'min(ih,1080)'",
                         "-c:a", "aac", "-b:a", "128k",
                         "-threads", "0",
                         "-movflags", "+faststart",
                         h264_path],
                        capture_output=True, text=True, timeout=900
                    )
                    if transcode_result.returncode == 0 and os.path.exists(h264_path):
                        os.replace(h264_path, video_path)
                        print(f"✅ Transcoded to H.264: {os.path.getsize(video_path) / (1024*1024):.1f} MB")
                    else:
                        print(f"⚠️ Transcode failed, keeping AV1: {(transcode_result.stderr or '')[-200:]}")
                        # Clean up failed transcode
                        if os.path.exists(h264_path):
                            os.unlink(h264_path)
        except Exception as tc_err:
            print(f"⚠️ Codec check failed (non-fatal): {tc_err}")

        # Get video title
        title_cmd = [
            "yt-dlp", "--remote-components", "ejs:github",
            "--get-title", "--no-playlist",
            *cookie_args,
            youtube_url,
        ]
        title_result = subprocess.run(title_cmd, capture_output=True, text=True, timeout=30)
        yt_title = (title_result.stdout or "").strip()[:100] or "YouTube Video"

        # Upload to Supabase Storage (raw-videos bucket)
        supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
        service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

        storage_path = f"{user_id}/{video_id}_yt.mp4"
        print(f"☁️ Uploading to Supabase Storage: {storage_path}")

        with open(video_path, "rb") as f:
            upload_resp = req.post(
                f"{supabase_url}/storage/v1/object/raw-videos/{storage_path}",
                headers={
                    "Authorization": f"Bearer {service_key}",
                    "apikey": service_key,
                    "Content-Type": "video/mp4",
                },
                data=f.read(),
                timeout=120,
            )

        if upload_resp.status_code not in (200, 201):
            raise RuntimeError(f"Storage upload failed: {upload_resp.status_code} {upload_resp.text[:200]}")

        print("✅ Uploaded to storage")

        # Update video record with file info — set to "uploaded" so user can configure settings
        # (same flow as manual file upload: uploaded → configure → analyzing → ready)
        duration = get_video_duration(video_path)
        duration_str = ""
        if duration:
            mins = int(duration) // 60
            secs = int(duration) % 60
            duration_str = f"{mins}:{secs:02d}" if mins > 0 else f"0:{secs:02d}"

        supabase.table("videos").update({
            "title": yt_title,
            "file_path": storage_path,
            "file_size": file_size,
            "duration": duration_str,
            "duration_seconds": int(duration),
            "status": "uploaded",
            "source_url": youtube_url,
        }).eq("id", video_id).execute()

        # Do NOT auto-trigger analysis — let user configure settings first
        # (clip count, caption style, reframe mode, etc.)
        # User will click "Start Analysis" from the VideoConfig page

        print(f"🚀 YouTube download complete: {yt_title}")
        print(f"   Duration: {duration_str}, Size: {file_size / (1024*1024):.1f} MB")
        print(f"   Status set to 'uploaded' — waiting for user to configure and start analysis")
        return {"success": True, "title": yt_title}

    except Exception as e:
        print(f"❌ YouTube import failed: {e}")
        supabase.table("videos").update({
            "status": "failed",
            "error_message": str(e)[:500],
        }).eq("id", video_id).execute()
        raise

    finally:
        if video_path and os.path.exists(video_path):
            os.unlink(video_path)
        cookies_tmp = f"/tmp/yt_cookies_{video_id}.txt"
        if os.path.exists(cookies_tmp):
            os.unlink(cookies_tmp)


# ============================================
# HIGHLIGHT REEL (COMPILATION)
# ============================================

@app.function(
    image=image,
    secrets=secrets,
    timeout=900,
    memory=4096,
    scaledown_window=120,
    max_containers=5,
)
def create_highlight_reel(
    reel_id: str,
    video_storage_path: str,
    clips: list,
    caption_style: str = "hormozi",
    add_transitions: bool = True,
):
    """Concatenate multiple clips into one highlight reel video"""
    from datetime import datetime, timezone

    print(f"🎬 Creating Highlight Reel: {reel_id}")
    print(f"📎 {len(clips)} clips to combine")

    supabase = init_supabase()
    video_path = None
    segment_paths = []
    output_path = None

    try:
        ts = datetime.now(timezone.utc).isoformat()

        # Check user plan for watermark
        is_free_tier = True
        reel_row = supabase.table("highlight_reels").select("user_id").eq("id", reel_id).execute()
        if reel_row.data:
            reel_user_id = reel_row.data[0]["user_id"]
            credit_row = supabase.table("user_credits").select("plan").eq("user_id", reel_user_id).execute()
            if credit_row.data:
                user_plan = credit_row.data[0].get("plan", "free")
                is_free_tier = user_plan in ("free", "Free", "")

        supabase.table("highlight_reels").update({
            "status": "rendering",
        }).eq("id", reel_id).execute()

        # Download source video
        bucket = os.environ.get("SUPABASE_RAW_VIDEOS_BUCKET", "raw-videos")
        supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
        video_url = f"{supabase_url}/storage/v1/object/{bucket}/{video_storage_path}"
        service_role_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        auth_headers = {
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
        }

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            download_video(video_url, tmp.name, auth_headers=auth_headers)
            video_path = tmp.name

        # Get video dimensions
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", video_path],
            capture_output=True, text=True,
        )
        import json as _json
        probe_data = _json.loads(probe.stdout)
        src_w = src_h = 0
        for stream in probe_data.get("streams", []):
            if stream.get("codec_type") == "video":
                src_w = int(stream.get("width", 1920))
                src_h = int(stream.get("height", 1080))
                break

        # Crop filter for 9:16
        is_landscape = src_w > src_h
        
        # Output resolution: native quality (no upscale, no downscale)
        # Free tier capped at 1080p
        out_h = src_h
        if is_free_tier and out_h > 1080:
            out_h = 1080
        out_w = int(out_h * 9 / 16)
        out_w = out_w + (out_w % 2)
        out_h = out_h + (out_h % 2)
        print(f"📐 Reel output: {out_w}x{out_h} (source: {src_w}x{src_h})")

        # Step 1: Extract and render each clip segment
        concat_list_path = f"/tmp/reel_concat_{reel_id}.txt"
        concat_entries = []

        for i, clip in enumerate(clips):
            start = float(clip["start_time"])
            end = float(clip["end_time"])
            duration = max(0.1, end - start)
            seg_path = f"/tmp/reel_seg_{reel_id}_{i}.mp4"
            segment_paths.append(seg_path)

            print(f"  📎 Segment {i+1}/{len(clips)}: {start}s - {end}s ({duration:.1f}s)")

            # Extract audio for transcription
            audio_path = f"/tmp/reel_audio_{reel_id}_{i}.wav"
            subprocess.run(
                ["ffmpeg", "-y", "-ss", str(start), "-t", str(duration),
                 "-i", video_path, "-vn", "-acodec", "pcm_s16le",
                 "-ar", "16000", "-ac", "1", audio_path],
                check=True, capture_output=True,
            )

            # Transcribe
            words = []
            try:
                full_text, words = transcribe_audio(audio_path, duration)
                if not words:
                    full_text = (full_text or "").strip()
                    if full_text:
                        tw = full_text.split()
                        wd = duration / max(len(tw), 1)
                        words = [{"word": w, "start": round(j*wd, 3), "end": round((j+1)*wd, 3)} for j, w in enumerate(tw)]
            except Exception as te:
                print(f"  ⚠️ Transcription failed for segment {i}: {te}")

            # Generate subtitles
            srt_path = f"/tmp/reel_sub_{reel_id}_{i}.srt"
            style_str = CAPTION_STYLES.get(caption_style, CAPTION_STYLES["hormozi"])
            generate_srt(words, srt_path, caption_style)

            # Render segment with crop + subtitles
            srt_has_content = os.path.exists(srt_path) and os.path.getsize(srt_path) > 10
            
            # Face-aware crop per segment
            if is_landscape:
                face_x = detect_face_position(video_path, start, duration)
                face_pct = max(0.1, min(0.9, face_x))
                # Use precomputed pixel values (avoid FFmpeg expression commas)
                try:
                    probe_r = subprocess.run(
                        ["ffprobe", "-v", "error", "-select_streams", "v:0",
                         "-show_entries", "stream=width,height", "-of", "csv=p=0",
                         video_path],
                        capture_output=True, text=True, check=True,
                    )
                    rw, rh = [int(x) for x in probe_r.stdout.strip().split(",")]
                except Exception:
                    rw, rh = 1920, 1080
                rcrop_w = int(rh * 9 / 16)
                rcrop_x = max(0, min(int(rw * face_pct - rcrop_w / 2), rw - rcrop_w))
                crop_vf = f"crop={rcrop_w}:{rh}:{rcrop_x}:0,scale={out_w}:{out_h}"
            else:
                crop_vf = f"scale={out_w}:{out_h}:force_original_aspect_ratio=decrease,pad={out_w}:{out_h}:(ow-iw)/2:(oh-ih)/2"
            
            try:
                if srt_has_content:
                    escaped_srt = srt_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
                    vf = f"{crop_vf},subtitles={escaped_srt}:force_style='{style_str}'"
                else:
                    vf = crop_vf
                subprocess.run(
                    ["ffmpeg", "-y", "-ss", str(start), "-t", str(duration),
                     "-i", video_path,
                     "-vf", vf,
                     "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                     "-c:a", "aac", "-b:a", "128k",
                     "-movflags", "+faststart", seg_path],
                    check=True, capture_output=True,
                )
            except subprocess.CalledProcessError:
                # Fallback without subtitles
                subprocess.run(
                    ["ffmpeg", "-y", "-ss", str(start), "-t", str(duration),
                     "-i", video_path,
                     "-vf", crop_vf,
                     "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                     "-c:a", "aac", "-b:a", "128k",
                     "-movflags", "+faststart", seg_path],
                    check=True, capture_output=True,
                )

            concat_entries.append(f"file '{seg_path}'")

            # Clean up audio/srt
            for f in [audio_path, srt_path]:
                if os.path.exists(f):
                    os.unlink(f)

        # Step 2: Concatenate all segments
        with open(concat_list_path, "w") as clf:
            clf.write("\n".join(concat_entries))

        output_path = f"/tmp/reel_output_{reel_id}.mp4"

        if add_transitions and len(clips) > 1:
            # Simple concat with crossfade (0.5s between each)
            # For simplicity, use concat demuxer (no transition)
            # Real crossfade needs complex filter chains, skip for MVP
            pass

        print(f"🔗 Concatenating {len(clips)} segments...")
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", concat_list_path,
             "-c", "copy",
             "-movflags", "+faststart",
             output_path],
            check=True, capture_output=True,
        )

        # Add watermark for free tier users (requires re-encode)
        if is_free_tier and os.path.exists(output_path):
            print("💧 Adding watermark to highlight reel (free tier)...")
            wm_output = output_path.replace(".mp4", "_wm.mp4")
            wm_filter = (
                "drawtext=text='HookCut.com':"
                "fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:"
                "fontsize=28:fontcolor=white@0.4:"
                "x=w-tw-20:y=20"
            )
            wm_result = subprocess.run(
                ["ffmpeg", "-y", "-i", output_path,
                 "-vf", wm_filter,
                 "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                 "-c:a", "copy",
                 "-movflags", "+faststart",
                 wm_output],
                capture_output=True, text=True,
            )
            if wm_result.returncode == 0 and os.path.exists(wm_output):
                os.replace(wm_output, output_path)
                print("💧 Watermark applied to highlight reel")
            else:
                print(f"⚠️ Watermark failed (non-fatal): {(wm_result.stderr or '')[-200:]}")
        else:
            print("💧 Highlight reel watermark: NO (paid plan)")

        if not os.path.exists(output_path):
            raise RuntimeError("Concat produced no output file")

        output_size = os.path.getsize(output_path)
        total_duration = get_video_duration(output_path)
        print(f"✅ Highlight reel: {output_size/(1024*1024):.1f} MB, {total_duration:.1f}s")

        # Upload to Supabase Storage
        reel_row = supabase.table("highlight_reels").select("user_id").eq("id", reel_id).execute()
        user_id = reel_row.data[0]["user_id"] if reel_row.data else "unknown"
        s3_key = f"reels/{reel_id}.mp4"
        public_url = upload_to_r2(output_path, s3_key)

        # Update database
        supabase.table("highlight_reels").update({
            "status": "ready",
            "file_path": public_url,
            "duration_seconds": int(total_duration),
            "rendered_at": ts,
        }).eq("id", reel_id).execute()

        print(f"🎉 Highlight reel ready: {public_url}")
        return {"success": True, "url": public_url}

    except Exception as e:
        print(f"❌ Highlight reel failed: {e}")
        supabase.table("highlight_reels").update({
            "status": "failed",
        }).eq("id", reel_id).execute()
        raise

    finally:
        for p in [video_path, output_path, concat_list_path] + segment_paths:
            if p and os.path.exists(p):
                os.unlink(p)


# ============================================
# SMART HIGHLIGHT REEL — AI STORYTELLING
# ============================================

@app.function(
    image=image,
    secrets=secrets,
    timeout=600,
    scaledown_window=120,
    max_containers=5,
)
def build_smart_reel(
    video_id: str,
    video_storage_path: str,
    user_id: str,
    caption_style: str = "hormozi",
    target_duration: int = 60,
    reel_style: str = "narrative",
):
    """AI selects and arranges clips into a storytelling highlight reel."""
    from datetime import datetime, timezone
    import json as _json

    print(f"🎬 Building Smart Reel for video {video_id}")
    print(f"🎯 Style: {reel_style}, Target: {target_duration}s")

    supabase = init_supabase()

    try:
        # Get all clips for this video
        clips_result = supabase.table("clips").select(
            "id, title, start_time, end_time, duration_seconds, viral_score, viral_analysis, transcription"
        ).eq("video_id", video_id).order("viral_score", desc=True).execute()

        all_clips = clips_result.data or []
        if len(all_clips) < 2:
            print("❌ Need at least 2 clips for a highlight reel")
            return {"success": False, "error": "Need at least 2 clips"}

        print(f"📊 Found {len(all_clips)} clips to choose from")

        # Prepare clip summaries for AI
        clip_summaries = []
        for c in all_clips:
            va = c.get("viral_analysis", {}) or {}
            clip_summaries.append({
                "id": c["id"],
                "title": c.get("title", "Untitled"),
                "start_time": c["start_time"],
                "end_time": c["end_time"],
                "duration": c.get("duration_seconds", 0),
                "viral_score": c.get("viral_score", 0),
                "hook_strength": va.get("hook_strength", 0),
                "reason": va.get("reason", ""),
                "transcript_preview": (c.get("transcription") or "")[:200],
            })

        # Style-specific AI instructions
        style_instructions = {
            "narrative": """Build a STORY arc:
1. HOOK (first clip) — most attention-grabbing, shocking, or curiosity-provoking moment
2. DEVELOPMENT (1-2 clips) — build context, show interesting moments that develop the theme
3. CLIMAX (1 clip) — the most emotional, surprising, or valuable moment
4. RESOLUTION (last clip) — satisfying conclusion, call to action, or memorable ending

The reel should feel like a mini-movie with a beginning, middle, and end.""",

            "best_moments": """Select the TOP moments by viral potential:
- Pick clips with the highest viral_score and hook_strength
- Start with the strongest hook
- Alternate between high-energy and slightly calmer moments
- End with a memorable clip that leaves the viewer wanting more
- Maximize entertainment value""",

            "energy": """Build an ENERGY CRESCENDO:
- Start calm/intriguing
- Each clip should have MORE energy than the previous
- Build tension and excitement progressively
- End with the most explosive, emotional, or powerful moment
- The viewer should feel pumped by the end""",
        }

        style_prompt = style_instructions.get(reel_style, style_instructions["narrative"])

        import google.genai as genai
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

        prompt = f"""You are a professional video editor creating a highlight reel.

STRICT TARGET DURATION: The total duration of ALL selected clips combined MUST be between {max(30, target_duration - 15)} and {target_duration + 15} seconds.
This is a HARD REQUIREMENT. Do the math: add up the durations of your selected clips and verify the total before responding.

AVAILABLE CLIPS (from the same video):
{_json.dumps(clip_summaries, indent=2, ensure_ascii=False)}

STYLE: {reel_style.upper()}
{style_prompt}

YOUR TASK:
1. Select clips whose TOTAL DURATION adds up to approximately {target_duration} seconds
2. CALCULATE the total: add each clip's "duration" field. If total exceeds {target_duration + 15}s, REMOVE clips until it fits.
3. Order them for maximum impact (this is KEY — order matters!)
4. Do NOT select all clips — be selective. Fewer, better clips > many clips.
5. Prefer shorter clips (30-45s) over long ones to stay within the time budget.
6. Do NOT repeat clips
7. Consider the transcripts to understand what is being said and create logical flow

Return ONLY a JSON object with:
{{
  "title": "A catchy title for this highlight reel (5-8 words, in the video's language)",
  "description": "One sentence describing the reel's narrative (in the video's language)",
  "total_duration": <calculated total in seconds>,
  "clips": [
    {{
      "id": "clip-uuid-here",
      "role": "hook|development|climax|resolution|highlight",
      "reason": "Why this clip is in this position (1 sentence)"
    }}
  ]
}}

CRITICAL: total_duration MUST be between {max(30, target_duration - 15)} and {target_duration + 15}.
Select between 2-6 clips. Order matters — the first clip is what viewers see first.
Return ONLY valid JSON, no markdown."""

        # Call Gemini with retry for rate limits
        raw = None
        for attempt in range(3):
            try:
                if attempt > 0:
                    wait = 10 * attempt
                    print(f"⏳ Retrying Gemini in {wait}s (attempt {attempt+1}/3)...")
                    import time
                    time.sleep(wait)
                
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                )
                raw = response.text.strip()
                break
            except Exception as gemini_err:
                if "429" in str(gemini_err) or "RESOURCE_EXHAUSTED" in str(gemini_err):
                    if attempt < 2:
                        continue
                raise
        
        if not raw:
            raise RuntimeError("Gemini failed after 3 attempts")
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        ai_plan = _json.loads(raw)
        selected_ids = [c["id"] for c in ai_plan.get("clips", [])]
        reel_title = ai_plan.get("title", "Highlight Reel")
        reel_description = ai_plan.get("description", "")

        print(f"🤖 AI selected {len(selected_ids)} clips: {reel_title}")
        for i, c in enumerate(ai_plan.get("clips", [])):
            print(f"  {i+1}. [{c.get('role', '?')}] {c.get('reason', '')[:80]}")

        # Build ordered clip list with start/end times
        clip_map = {c["id"]: c for c in all_clips}
        ordered_clips = []
        for sel in ai_plan.get("clips", []):
            cid = sel["id"]
            if cid in clip_map:
                c = clip_map[cid]
                ordered_clips.append({
                    "clip_id": cid,
                    "start_time": float(c["start_time"]),
                    "end_time": float(c["end_time"]),
                    "role": sel.get("role", "highlight"),
                    "reason": sel.get("reason", ""),
                })

        if len(ordered_clips) < 2:
            print("❌ AI selected too few valid clips")
            return {"success": False, "error": "AI selected too few clips"}

        total_dur = sum(c["end_time"] - c["start_time"] for c in ordered_clips)
        print(f"⏱️ AI total duration: {total_dur:.0f}s ({len(ordered_clips)} clips), target: {target_duration}s")

        # Enforce target duration: trim clips from the end if too long
        max_dur = target_duration + 20
        while total_dur > max_dur and len(ordered_clips) > 2:
            removed = ordered_clips.pop()  # remove last clip
            total_dur = sum(c["end_time"] - c["start_time"] for c in ordered_clips)
            print(f"  ✂️ Trimmed: removed clip (was {removed['role']}), new total: {total_dur:.0f}s")

        # Update ai_plan to reflect trimmed clips
        trimmed_ids = [c["clip_id"] for c in ordered_clips]
        ai_plan["clips"] = [c for c in ai_plan.get("clips", []) if c["id"] in trimmed_ids]

        print(f"⏱️ Final reel duration: {total_dur:.0f}s ({len(ordered_clips)} clips)")

        # Create highlight_reels record in DB
        ts = datetime.now(timezone.utc).isoformat()
        reel_data = {
            "user_id": user_id,
            "video_id": video_id,
            "title": reel_title,
            "description": reel_description,
            "status": "rendering",
            "clip_ids": selected_ids,
            "ai_plan": ai_plan,
            "created_at": ts,
        }

        reel_insert = supabase.table("highlight_reels").insert(reel_data).execute()
        reel_id = reel_insert.data[0]["id"]
        print(f"📝 Created reel record: {reel_id}")

        # Now render using existing create_highlight_reel function
        create_highlight_reel.remote(
            reel_id=reel_id,
            video_storage_path=video_storage_path,
            clips=[{"clip_id": c["clip_id"], "start_time": c["start_time"], "end_time": c["end_time"]} for c in ordered_clips],
            caption_style=caption_style,
            add_transitions=True,
        )

        return {"success": True, "reel_id": reel_id, "title": reel_title}

    except Exception as e:
        print(f"❌ Smart reel failed: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


# ============================================
# STALE RENDER & STUCK VIDEO CLEANUP (runs every 10 min)
# ============================================

@app.function(
    image=webhook_image,
    secrets=secrets,
    schedule=modal.Cron("*/10 * * * *"),
)
def cleanup_stale_jobs():
    """Reset stuck renders (>20 min) and stuck videos (>30 min).
    Prevents jobs from being permanently stuck after Modal preemption or crashes."""
    from datetime import datetime, timezone, timedelta

    print("🧹 Running stale job cleanup...")
    supabase = init_supabase()

    # Reset clips stuck in "rendering" for >20 minutes
    cutoff_clip = (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat()
    try:
        result = supabase.table("clips").update({
            "status": "pending",
            "error_message": "Render timed out. Please try again.",
        }).eq("status", "rendering").lt("render_started_at", cutoff_clip).execute()
        if result.data:
            print(f"🔄 Reset {len(result.data)} stuck clip renders")
    except Exception as e:
        print(f"⚠️ Clip cleanup error: {e}")

    # Reset videos stuck in "downloading" for >30 minutes
    cutoff_dl = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    try:
        result2 = supabase.table("videos").update({
            "status": "failed",
            "error_message": "Download timed out. Please try again.",
        }).eq("status", "downloading").lt("updated_at", cutoff_dl).execute()
        if result2.data:
            print(f"🔄 Marked {len(result2.data)} stuck downloads as failed")
    except Exception as e:
        print(f"⚠️ Download cleanup error: {e}")

    # Reset videos stuck in "analyzing" for >45 minutes
    cutoff_analyze = (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat()
    try:
        result3 = supabase.table("videos").update({
            "status": "failed",
            "error_message": "Analysis timed out. Please try again.",
        }).eq("status", "analyzing").lt("updated_at", cutoff_analyze).execute()
        if result3.data:
            print(f"🔄 Marked {len(result3.data)} stuck analyses as failed")
    except Exception as e:
        print(f"⚠️ Analysis cleanup error: {e}")

    # Reset highlight reels stuck in "rendering" for >30 minutes
    try:
        result4 = supabase.table("highlight_reels").update({
            "status": "failed",
        }).eq("status", "rendering").lt("created_at", cutoff_dl).execute()
        if result4.data:
            print(f"🔄 Marked {len(result4.data)} stuck reels as failed")
    except Exception as e:
        print(f"⚠️ Reel cleanup error: {e}")

    print("🧹 Cleanup complete")


# ============================================
# HTTP WEBHOOK ENDPOINT (ASGI)
# ============================================

@app.function(
    image=webhook_image,
    secrets=secrets,
    scaledown_window=300,          # Keep warm 5 min after last request
    min_containers=1,              # Always 1 container ready — zero cold start for API
)
@modal.concurrent(max_inputs=100)  # Handle 100 simultaneous API requests
@modal.asgi_app()
def webhook():
    from fastapi import FastAPI, HTTPException, Request, Depends
    from fastapi.responses import Response
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import requests as req_lib

    web_app = FastAPI()

    # Allow all lovable.app subdomains + production domains
    allowed_origins = [
        "https://hookcut.com",
        "https://www.hookcut.com",
        "https://cutviral.ai",
        "https://www.cutviral.ai",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https://.*\.lovable\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware to handle ALL OPTIONS preflight requests before they hit any route
    @web_app.middleware("http")
    async def cors_preflight_middleware(request: Request, call_next):
        if request.method == "OPTIONS":
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "3600",
                },
            )
        response = await call_next(request)
        return response

    # JWT verification: validates Supabase auth token
    async def verify_auth(request: Request) -> dict:
        """Verify Supabase JWT token from Authorization header.
        Returns user dict with 'id' field, or raises 401."""
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        
        token = auth_header.replace("Bearer ", "")
        
        try:
            supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
            # Verify token by calling Supabase auth API
            resp = req_lib.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
                },
                timeout=5,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            user_data = resp.json()
            if not user_data.get("id"):
                raise HTTPException(status_code=401, detail="Invalid user")
            return user_data
        except HTTPException:
            raise
        except Exception as e:
            print(f"⚠️ Auth verification failed: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")

    class AnalysisRequest(BaseModel):
        video_id: str

    class RenderRequest(BaseModel):
        clip_id: str
        video_storage_path: str
        start_time: float
        end_time: float
        caption_style: str = "hormozi"
        custom_transcription: str = ""
        custom_color: str = ""
        crop_x: float = 0.5            # 0.0=left, 0.5=center, 1.0=right
        subtitle_size: str = "medium"   # small/medium/large
        subtitle_y: float = 0.85        # 0.0=top, 1.0=bottom
        reframe_mode: str = "center"    # "smart", "full", "center"

    class TranscribeClipRequest(BaseModel):
        clip_id: str
        video_storage_path: str
        start_time: float
        end_time: float

    @web_app.post("/analyze")
    async def analyze(req: AnalysisRequest, user: dict = Depends(verify_auth)):
        try:
            print(f"📨 /analyze received video_id={req.video_id} from user={user.get('id', '?')[:8]}")
            trigger_analysis.spawn(req.video_id)
            return {"success": True, "video_id": req.video_id, "status": "started"}
        except Exception as e:
            print(f"❌ /analyze error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @web_app.post("/render")
    async def render(req: RenderRequest, user: dict = Depends(verify_auth)):
        try:
            print(f"📨 /render received clip_id={req.clip_id} from user={user.get('id', '?')[:8]}")
            if req.custom_transcription:
                print(f"📝 Custom transcription: {req.custom_transcription[:80]}...")
            render_clip.spawn(
                clip_id=req.clip_id,
                video_storage_path=req.video_storage_path,
                start_time=req.start_time,
                end_time=req.end_time,
                caption_style=req.caption_style,
                custom_transcription=req.custom_transcription,
                custom_color=req.custom_color,
                crop_x=req.crop_x,
                subtitle_size=req.subtitle_size,
                subtitle_y=req.subtitle_y,
                reframe_mode=req.reframe_mode,
            )
            return {"success": True, "clip_id": req.clip_id, "status": "rendering"}
        except Exception as e:
            print(f"❌ /render error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @web_app.post("/transcribe-clip")
    async def transcribe_clip_endpoint(req: TranscribeClipRequest, user: dict = Depends(verify_auth)):
        try:
            print(f"📝 /transcribe-clip for clip_id={req.clip_id}")
            transcribe_clip_fn.spawn(
                clip_id=req.clip_id,
                video_storage_path=req.video_storage_path,
                start_time=req.start_time,
                end_time=req.end_time,
            )
            return {"success": True, "clip_id": req.clip_id, "status": "transcribing"}
        except Exception as e:
            print(f"❌ /transcribe-clip error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @web_app.get("/health")
    async def health():
        return {"status": "ok", "service": "hookcut-worker", "version": "2.4"}

    @web_app.get("/")
    async def root():
        return {"status": "ok", "service": "hookcut-worker", "version": "2.4"}

    # Debug: list all registered routes
    @web_app.get("/debug/routes")
    async def debug_routes():
        routes = []
        for route in web_app.routes:
            if hasattr(route, "methods") and hasattr(route, "path"):
                routes.append({"path": route.path, "methods": list(route.methods)})
        return {"routes": routes}

    # Live re-transcription for Remix Mode timeline changes
    class TranscribeSegmentRequest(BaseModel):
        video_storage_path: str
        start_time: float
        end_time: float
        clip_id: str = ""

    @web_app.post("/transcribe-segment")
    async def handle_transcribe_segment(req: TranscribeSegmentRequest, user: dict = Depends(verify_auth)):
        """Transcribe a specific segment of video — used when user adjusts timeline in Remix Mode.
        Returns words with timestamps synchronously (not spawned)."""
        try:
            print(f"📨 /transcribe-segment {req.start_time}s-{req.end_time}s from user={user.get('id', '?')[:8]}")
            result = transcribe_video_segment.remote(
                video_storage_path=req.video_storage_path,
                start_time=req.start_time,
                end_time=req.end_time,
                clip_id=req.clip_id,
            )
            return result
        except Exception as e:
            print(f"❌ /transcribe-segment error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # AI Title & Hashtags Generator
    class AITitleRequest(BaseModel):
        clip_id: str
        transcription: str
        platform: str = "tiktok"  # tiktok, youtube, instagram

    @web_app.post("/generate-titles")
    async def generate_titles(req: AITitleRequest, user: dict = Depends(verify_auth)):
        """Generate 3 title variants + hashtags for a clip using Gemini."""
        try:
            print(f"📨 /generate-titles clip={req.clip_id} platform={req.platform} from user={user.get('id', '?')[:8]}")
            result = generate_ai_titles.remote(
                clip_id=req.clip_id,
                transcription=req.transcription,
                platform=req.platform,
            )
            return result
        except Exception as e:
            print(f"❌ /generate-titles error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    class YouTubeImportRequest(BaseModel):
        youtube_url: str
        video_id: str
        user_id: str

    @web_app.post("/youtube-import")
    async def youtube_import(req: YouTubeImportRequest, user: dict = Depends(verify_auth)):
        try:
            import re as _re
            auth_user_id = user.get("id", "")
            # Security: prefer authenticated user_id over request body
            effective_user_id = auth_user_id or req.user_id

            print(f"📨 /youtube-import received url={req.youtube_url} from user={effective_user_id[:8]}")

            # Validate YouTube URL format
            yt_pattern = _re.compile(r'https?://(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)/')
            if not yt_pattern.match(req.youtube_url.strip()):
                raise HTTPException(status_code=400, detail="Invalid YouTube URL format")

            download_youtube_and_analyze.spawn(
                youtube_url=req.youtube_url.strip(),
                video_id=req.video_id,
                user_id=effective_user_id,
            )
            return {"success": True, "video_id": req.video_id, "status": "downloading"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ /youtube-import error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    class HighlightReelClip(BaseModel):
        clip_id: str
        start_time: float
        end_time: float

    class HighlightReelRequest(BaseModel):
        reel_id: str
        video_storage_path: str
        clips: list[HighlightReelClip]
        caption_style: str = "hormozi"
        add_transitions: bool = True

    class SmartReelRequest(BaseModel):
        video_id: str
        video_storage_path: str
        caption_style: str = "hormozi"
        target_duration: int = 60  # target reel length in seconds
        style: str = "narrative"   # "narrative", "best_moments", "energy"

    @web_app.post("/create-highlight-reel")
    async def create_reel(req: HighlightReelRequest, user: dict = Depends(verify_auth)):
        try:
            print(f"📨 /create-highlight-reel received reel_id={req.reel_id} from user={user.get('id', '?')[:8]}")
            create_highlight_reel.spawn(
                reel_id=req.reel_id,
                video_storage_path=req.video_storage_path,
                clips=[c.dict() for c in req.clips],
                caption_style=req.caption_style,
                add_transitions=req.add_transitions,
            )
            return {"success": True, "reel_id": req.reel_id, "status": "rendering"}
        except Exception as e:
            print(f"❌ /create-highlight-reel error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @web_app.post("/create-smart-reel")
    async def create_smart_reel(req: SmartReelRequest, user: dict = Depends(verify_auth)):
        try:
            print(f"📨 /create-smart-reel for video_id={req.video_id}, style={req.style}, target={req.target_duration}s")
            build_smart_reel.spawn(
                video_id=req.video_id,
                video_storage_path=req.video_storage_path,
                user_id=user.get("id", ""),
                caption_style=req.caption_style,
                target_duration=req.target_duration,
                reel_style=req.style,
            )
            return {"success": True, "video_id": req.video_id, "status": "building"}
        except Exception as e:
            print(f"❌ /create-smart-reel error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # ============================================
    # STRIPE CHECKOUT & BILLING
    # ============================================

    class CheckoutRequest(BaseModel):
        price_id: str
        success_url: str = "https://hookcut.com/upgrade?success=true"
        cancel_url: str = "https://hookcut.com/upgrade?canceled=true"

    @web_app.post("/create-checkout")
    async def create_checkout(req: CheckoutRequest, user: dict = Depends(verify_auth)):
        """Create a Stripe Checkout Session for subscription or one-time purchase."""
        import stripe
        stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

        user_id = user.get("id", "")
        user_email = user.get("email", "")

        print(f"💳 Checkout request: price_id={req.price_id}, user={user_id[:8]}, email={user_email}")

        valid_prices = {
            os.environ.get("STRIPE_PRICE_STARTER", ""): "starter",
            os.environ.get("STRIPE_PRICE_PRO", ""): "pro",
            os.environ.get("STRIPE_PRICE_AGENCY", ""): "agency",
            os.environ.get("STRIPE_PRICE_RENDER_PACK", ""): "render_pack",
        }

        print(f"💳 Valid prices: {list(valid_prices.keys())}")

        if req.price_id not in valid_prices:
            print(f"❌ Invalid price_id: '{req.price_id}' not in {list(valid_prices.keys())}")
            raise HTTPException(status_code=400, detail=f"Invalid price_id: {req.price_id}")

        plan = valid_prices[req.price_id]
        is_subscription = plan != "render_pack"

        try:
            from supabase import create_client
            sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
            profile = sb.table("profiles").select("stripe_customer_id").eq("user_id", user_id).maybe_single().execute()
            customer_id = profile.data.get("stripe_customer_id") if profile.data else None

            if not customer_id:
                customer = stripe.Customer.create(
                    email=user_email,
                    metadata={"supabase_user_id": user_id},
                )
                customer_id = customer.id
                sb.table("profiles").update({"stripe_customer_id": customer_id}).eq("user_id", user_id).execute()

            session_params = {
                "customer": customer_id,
                "line_items": [{"price": req.price_id, "quantity": 1}],
                "success_url": req.success_url,
                "cancel_url": req.cancel_url,
                "metadata": {"supabase_user_id": user_id, "plan": plan},
            }

            if is_subscription:
                session_params["mode"] = "subscription"
                session_params["subscription_data"] = {
                    "metadata": {"supabase_user_id": user_id, "plan": plan}
                }
            else:
                session_params["mode"] = "payment"

            session = stripe.checkout.Session.create(**session_params)
            print(f"💳 Checkout created: user={user_id[:8]}, plan={plan}")
            return {"url": session.url, "session_id": session.id}

        except Exception as e:
            print(f"❌ Stripe checkout error: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    @web_app.post("/create-portal")
    async def create_portal(user: dict = Depends(verify_auth)):
        """Create Stripe Customer Portal for managing subscription."""
        import stripe
        stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

        user_id = user.get("id", "")
        try:
            from supabase import create_client
            sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
            profile = sb.table("profiles").select("stripe_customer_id").eq("user_id", user_id).maybe_single().execute()
            customer_id = profile.data.get("stripe_customer_id") if profile.data else None

            if not customer_id:
                raise HTTPException(status_code=400, detail="No billing account found")

            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url="https://hookcut.com/upgrade",
            )
            return {"url": session.url}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @web_app.post("/stripe-webhook")
    async def stripe_webhook(request: Request):
        """Handle Stripe webhook events — NO AUTH (verified via Stripe signature)."""
        import stripe
        stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

        payload = await request.body()
        sig = request.headers.get("stripe-signature", "")
        webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

        try:
            event = stripe.Webhook.construct_event(payload, sig, webhook_secret)
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            print(f"❌ Webhook sig failed: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")

        print(f"📨 Stripe event: {event['type']}")

        from supabase import create_client
        sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

        PLAN_CREDITS = {"starter": 40, "pro": 100, "agency": 250}
        RENDER_PACK_CREDITS = 30

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = session.get("metadata", {}).get("supabase_user_id", "")
            plan = session.get("metadata", {}).get("plan", "")

            if not user_id:
                return {"received": True}

            if plan == "render_pack":
                existing = sb.table("user_credits").select("total_credits").eq("user_id", user_id).maybe_single().execute()
                if existing.data:
                    new_total = existing.data["total_credits"] + RENDER_PACK_CREDITS
                    sb.table("user_credits").update({"total_credits": new_total}).eq("user_id", user_id).execute()
                    print(f"✅ +{RENDER_PACK_CREDITS} render credits for user={user_id[:8]}")
            else:
                credits = PLAN_CREDITS.get(plan, 40)
                sb.table("user_credits").update({
                    "plan": plan,
                    "total_credits": credits, "used_credits": 0,
                }).eq("user_id", user_id).execute()
                sb.table("profiles").update({"plan": plan}).eq("user_id", user_id).execute()
                print(f"✅ Plan activated: user={user_id[:8]}, plan={plan}, credits={credits}")

        elif event["type"] == "customer.subscription.deleted":
            sub = event["data"]["object"]
            user_id = sub.get("metadata", {}).get("supabase_user_id", "")
            if user_id:
                sb.table("user_credits").update({
                    "plan": "free", "total_credits": 10, "used_credits": 0,
                }).eq("user_id", user_id).execute()
                sb.table("profiles").update({"plan": "free"}).eq("user_id", user_id).execute()
                print(f"⬇️ Downgraded to free: user={user_id[:8]}")

        elif event["type"] == "invoice.paid":
            invoice = event["data"]["object"]
            sub_id = invoice.get("subscription")
            if sub_id:
                try:
                    sub = stripe.Subscription.retrieve(sub_id)
                    user_id = sub.get("metadata", {}).get("supabase_user_id", "")
                    plan = sub.get("metadata", {}).get("plan", "")
                    if user_id and plan in PLAN_CREDITS:
                        plan_credits = PLAN_CREDITS[plan]

                        # Preserve addon credits (render packs) during monthly reset.
                        # We reset used_credits to 0 but keep any surplus credits above the plan base.
                        existing = sb.table("user_credits").select(
                            "total_credits, used_credits"
                        ).eq("user_id", user_id).maybe_single().execute()

                        if existing.data:
                            current_total = existing.data.get("total_credits", 0)
                            current_used = existing.data.get("used_credits", 0)
                            # remaining credits right now
                            remaining_now = max(0, current_total - current_used)
                            addon_credits = max(0, remaining_now - plan_credits)
                            new_total = plan_credits + addon_credits
                        else:
                            addon_credits = 0
                            new_total = plan_credits

                        sb.table("user_credits").update({
                            "total_credits": new_total,
                            "used_credits": 0,
                        }).eq("user_id", user_id).execute()

                        print(
                            f"🔄 Monthly reset: user={user_id[:8]}, plan={plan}, "
                            f"base={plan_credits}, addons={addon_credits}, total={new_total}"
                        )
                except Exception as e:
                    print(f"⚠️ invoice.paid error: {e}")

        return {"received": True}

    return web_app


# ============================================
# LOCAL TESTING
# ============================================

@app.local_entrypoint()
def main():
    res = analyze_video_with_gemini.remote(
        video_url="https://example.com/video.mp4",
        video_id="test-video-123",
        user_id="test-user-123",
    )
    print(res)