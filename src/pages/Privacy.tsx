import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: February 19, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>Truhand LLC ("Company", "we", "us") operates HookCut.com ("Service"). This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Service. We are committed to protecting your privacy and handling your data transparently.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-foreground mt-4 mb-1">2.1 Account Information</h3>
            <p className="mb-3">When you create an account, we collect: email address, name (if provided), and authentication data through our identity provider.</p>
            <h3 className="text-base font-medium text-foreground mt-4 mb-1">2.2 User Content</h3>
            <p className="mb-3">We process the video files you upload, including any audio, visual, and textual content within them. This content is processed by AI services to generate clips, transcriptions, and subtitles.</p>
            <h3 className="text-base font-medium text-foreground mt-4 mb-1">2.3 Usage Data</h3>
            <p className="mb-3">We automatically collect information about how you interact with the Service, including: pages visited, features used, clips rendered, timestamps of activity, browser type, device information, and IP address.</p>
            <h3 className="text-base font-medium text-foreground mt-4 mb-1">2.4 Payment Information</h3>
            <p>Payment processing is handled by Stripe. We do not store your credit card numbers or banking details. We receive only confirmation of payment status and subscription details from Stripe.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <p className="mb-2">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process your videos and generate clips with AI-powered analysis</li>
              <li>Manage your account and process payments</li>
              <li>Send important service-related notifications</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Detect and prevent fraud or abuse of the Service</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Third-Party Services</h2>
            <p className="mb-2">We use the following third-party services to operate HookCut.com:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li><strong className="text-foreground">Cloud Infrastructure</strong> — database, authentication, and file storage</li>
              <li><strong className="text-foreground">Google Gemini AI</strong> — video analysis and content generation</li>
              <li><strong className="text-foreground">Groq (Whisper)</strong> — audio transcription in 99 languages</li>
              <li><strong className="text-foreground">Modal</strong> — cloud computing infrastructure for video processing</li>
              <li><strong className="text-foreground">Stripe</strong> — payment processing</li>
            </ul>
            <p>Each of these services has their own privacy policies. We encourage you to review them. Your video content is processed by these services solely for the purpose of providing the Service and is not used for training AI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Storage and Security</h2>
            <p>Your data is stored on secure cloud servers. We implement industry-standard security measures including encryption in transit (TLS), encryption at rest, and access controls. Video files are stored in private storage buckets accessible only to authenticated users.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Data Retention</h2>
            <p>We retain your data for as long as your account is active. You can delete individual videos and clips at any time from your dashboard. If you delete your account, all associated data (including uploaded videos, generated clips, and personal information) will be permanently deleted within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Your Rights</h2>
            <p className="mb-2">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability — receive your data in a structured format</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p>To exercise any of these rights, please contact us at{" "}
              <a href="mailto:support@hookcut.com" className="text-primary hover:underline">support@hookcut.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Cookies</h2>
            <p>We use essential cookies to maintain your authentication session and preferences. We do not use tracking cookies or third-party advertising cookies. Analytics cookies may be used to understand usage patterns and improve the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Children's Privacy</h2>
            <p>The Service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. International Data Transfers</h2>
            <p>Your data may be processed in the United States and other countries where our service providers operate. By using the Service, you consent to the transfer of your data to these locations. We ensure that appropriate safeguards are in place to protect your data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy and changing the "Last updated" date. We encourage you to review this policy periodically.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Contact Us</h2>
            <p className="mb-2">If you have any questions about this Privacy Policy or our data practices, contact us at:</p>
            <p>Truhand LLC<br />Chicago, IL, United States<br />Email: <a href="mailto:support@hookcut.com" className="text-primary hover:underline">support@hookcut.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
