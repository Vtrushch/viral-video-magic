import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyHookCut from "@/components/landing/Features";
import ComparisonAndCTA from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    // Only handle simple anchor hashes (e.g. #pricing), skip OAuth tokens like #access_token=...
    if (location.hash && /^#[a-zA-Z][\w-]*$/.test(location.hash)) {
      const el = document.getElementById(location.hash.substring(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen dark">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "@id": "https://hookcut.com/#software",
            "name": "HookCut",
            "applicationCategory": "VideoApplication",
            "applicationSubCategory": "Video Editing Software",
            "operatingSystem": "Web, Any",
            "url": "https://hookcut.com",
            "description": "HookCut uses AI to automatically find the best moments in long videos and clip them into short viral clips for TikTok, Instagram Reels, and YouTube Shorts. Upload any video, get 8–15 clips with automatic captions, face tracking, and viral score ranking in 20–30 minutes.",
            "screenshot": [{ "@type": "ImageObject", "url": "https://hookcut.com/screenshot-dashboard.png", "caption": "HookCut dashboard showing AI-extracted clips with viral scores" }],
            "featureList": [
              "AI-powered clip extraction from long videos",
              "Viral potential score (0-100) for each clip",
              "Automatic word-by-word captions — Hormozi style, MrBeast style, Classic, Minimal",
              "Face tracking for automatic 9:16 vertical reframing",
              "Preview before rendering — see clip before using credits",
              "YouTube link import — no download needed",
              "Loom recording support",
              "No watermarks on exported clips",
              "Supports videos up to 4 hours",
              "Per-clip pricing — pay only for clips you keep"
            ],
            "offers": [
              { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "description": "3 clips free, no credit card required, no watermarks" },
              { "@type": "Offer", "name": "Starter", "price": "9", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "For individual content creators" },
              { "@type": "Offer", "name": "Pro", "price": "19", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "For active creators and agencies" }
            ],
            "publisher": { "@id": "https://hookcut.com/#organization" },
            "isPartOf": { "@id": "https://hookcut.com/#website" }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "What is HookCut?", "acceptedAnswer": { "@type": "Answer", "text": "HookCut is an AI-powered video repurposing tool that automatically clips long-form videos into short viral clips for TikTok, Instagram Reels, and YouTube Shorts. It uses AI to find the best moments in any video, adds automatic word-by-word captions, and applies face tracking to reframe horizontal video to vertical 9:16 format. Each clip receives a viral potential score from 0 to 100." } },
              { "@type": "Question", "name": "How does HookCut work?", "acceptedAnswer": { "@type": "Answer", "text": "Upload any long video (MP4, MOV file, YouTube link, or Loom link). HookCut's AI analyzes both audio and video signals to identify the 8–15 best moments. Each clip is automatically formatted to vertical 9:16 with face tracking, captions are added in your chosen style, and each clip receives a viral score. You preview every clip before rendering and only use credits for the clips you actually keep. The whole process takes 20–30 minutes for a 60-minute video." } },
              { "@type": "Question", "name": "How much does HookCut cost?", "acceptedAnswer": { "@type": "Answer", "text": "HookCut has three plans. Free: 3 clips at no cost, no credit card required. Starter: $9 per month for individual creators. Pro: $19 per month for active creators and agencies. Unlike competitors like Opus Clip, HookCut charges per clip rather than per minute of uploaded video — so you only pay for clips you actually keep." } },
              { "@type": "Question", "name": "What is the difference between HookCut and Opus Clip?", "acceptedAnswer": { "@type": "Answer", "text": "Both HookCut and Opus Clip use AI to extract short clips from long videos. Key differences: HookCut shows a preview before rendering (Opus Clip renders first then shows you); HookCut charges $9/month starting price vs Opus Clip's $15/month; HookCut uses per-clip pricing while Opus Clip charges per minute of input video. Opus Clip offers direct social media publishing which HookCut does not yet have. HookCut is generally better for creators who upload long videos and only need a few clips." } },
              { "@type": "Question", "name": "What types of videos can HookCut process?", "acceptedAnswer": { "@type": "Answer", "text": "HookCut supports MP4 and MOV video files up to 4 hours in length, YouTube video links (no download required), and Loom recording links. Minimum recommended resolution is 720p. HookCut works best with talking head videos, webinars, interviews, podcast recordings, lectures, and conference keynotes." } },
              { "@type": "Question", "name": "Does HookCut add watermarks?", "acceptedAnswer": { "@type": "Answer", "text": "No. HookCut exports clean MP4 files without any watermarks on all plans, including the free plan. This is important for publishing to Instagram Reels and YouTube Shorts, which reduce reach for videos with competitor watermarks." } },
              { "@type": "Question", "name": "What caption styles does HookCut support?", "acceptedAnswer": { "@type": "Answer", "text": "HookCut supports four caption styles: Hormozi style (bold white text, one to two words at a time, current word highlighted in a contrasting color — highest completion rate for educational content); MrBeast style (large colorful words that pop on screen — best for entertainment); Classic style (subtitle bar at the bottom — for corporate and LinkedIn content); and Minimal style (thin font, minimal styling — for aesthetic and fashion content). All styles synchronize captions word-by-word with the audio." } },
              { "@type": "Question", "name": "What is the viral score in HookCut?", "acceptedAnswer": { "@type": "Answer", "text": "The viral score (0–100) is HookCut's AI ranking of each clip's potential performance on social media. The AI evaluates voice energy peaks, hook strength in the first 3 seconds, whether the clip is self-contained without requiring context, and the expected completion rate. Clips scoring 70 or above typically perform best. The score is a guide, not a guarantee — always review the preview yourself before publishing." } },
              { "@type": "Question", "name": "How long does HookCut take to process a video?", "acceptedAnswer": { "@type": "Answer", "text": "Processing time depends on video length. A 60-minute video typically takes 10–20 minutes for HookCut to analyze and prepare clip candidates. You do not need to wait by the screen — HookCut sends a notification when processing is complete." } },
              { "@type": "Question", "name": "Can HookCut process videos in languages other than English?", "acceptedAnswer": { "@type": "Answer", "text": "HookCut works best with English-language content for transcription accuracy of 95–98%. It also supports Spanish and Ukrainian content with good accuracy. For other languages, transcription quality may vary and manual caption correction may be needed." } }
            ]
          })}
        </script>
      </Helmet>
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhyHookCut />
      <ComparisonAndCTA />
      <Footer />
    </div>
  );
};

export default Index;
