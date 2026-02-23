import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: February 19, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Agreement to Terms</h2>
            <p>By accessing or using HookCut.com ("Service"), operated by Truhand LLC ("Company", "we", "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>HookCut.com is an AI-powered video repurposing platform that helps users transform long-form video content into short-form clips optimized for social media platforms. The Service includes video analysis, clip generation, subtitle creation, and related features.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. User Accounts</h2>
            <p>To use certain features of the Service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. User Content</h2>
            <p className="mb-3">You retain all ownership rights to the video content you upload to the Service ("User Content"). By uploading content, you grant us a limited, non-exclusive license to process, store, and transform your content solely for the purpose of providing the Service to you.</p>
            <p>You represent and warrant that: (a) you own or have the necessary rights to upload and process the content; (b) your content does not infringe upon the intellectual property rights of any third party; (c) your content does not contain illegal, harmful, or objectionable material.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Credits and Payments</h2>
            <p className="mb-3">The Service uses a credit-based system. Free accounts receive a limited number of render credits. Paid plans offer additional credits and features as described on our pricing page. All payments are processed through our third-party payment provider (Stripe). Paid subscriptions renew automatically unless cancelled before the renewal date.</p>
            <p>Refunds may be issued at our discretion within 7 days of purchase if no credits have been used. Once credits are consumed, they are non-refundable.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service to process content you do not have rights to</li>
              <li>Attempt to circumvent credit limits or usage restrictions</li>
              <li>Upload content that is illegal, harmful, threatening, or infringes on others' rights</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. AI-Generated Content</h2>
            <p>The Service uses artificial intelligence to analyze videos, generate clips, create subtitles, and suggest titles and hashtags. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You are responsible for reviewing and verifying all output before publishing or distributing it.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Data Storage and Retention</h2>
            <p>Uploaded videos are stored securely for processing purposes. We retain your videos and generated clips for as long as your account is active. You may delete your content at any time through the dashboard. Upon account deletion, all associated data will be removed within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Truhand LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses resulting from your use of or inability to use the Service. Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Termination</h2>
            <p>We may terminate or suspend your access to the Service at any time, with or without cause, with or without notice. You may cancel your account at any time through your account settings. Upon termination, your right to use the Service will immediately cease.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. We will notify users of material changes by posting the updated terms on the Service and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the modified terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">13. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of Illinois, United States, without regard to its conflict of law provisions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">14. Contact</h2>
            <p className="mb-2">If you have any questions about these Terms, please contact us at:</p>
            <p>Truhand LLC<br />Chicago, IL, United States<br />Email: <a href="mailto:support@hookcut.com" className="text-primary hover:underline">support@hookcut.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
