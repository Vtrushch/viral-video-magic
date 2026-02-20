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
            <p>Truhand LLC ("Company", "we", "us") operates CutViral.ai. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p className="mb-2"><strong className="text-foreground">Account Information:</strong> When you create an account, we collect your email address, name, and authentication credentials.</p>
            <p className="mb-2"><strong className="text-foreground">User Content:</strong> Videos you upload, generated clips, transcriptions, and related metadata.</p>
            <p className="mb-2"><strong className="text-foreground">Usage Data:</strong> Information about how you interact with the Service, including pages visited, features used, and timestamps.</p>
            <p><strong className="text-foreground">Payment Information:</strong> Payment details are processed by Stripe and we do not store your full credit card information on our servers.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, maintain, and improve the Service</li>
              <li>To process your video content and generate clips</li>
              <li>To manage your account and provide customer support</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send you service-related communications</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Storage and Security</h2>
            <p>Your data is stored on secure cloud infrastructure. We implement industry-standard security measures including encryption in transit (TLS) and at rest. Video files are stored in isolated, access-controlled storage buckets.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Third-Party Services</h2>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Cloud Infrastructure:</strong> For hosting and data storage</li>
              <li><strong className="text-foreground">Stripe:</strong> For payment processing</li>
              <li><strong className="text-foreground">AI Processing:</strong> For video analysis and content generation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Data Retention</h2>
            <p>We retain your personal data and content for as long as your account is active. You may delete individual videos and clips at any time. Upon account deletion, all associated data will be permanently removed within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Cookies</h2>
            <p>We use essential cookies to maintain your session and preferences. We do not use tracking cookies or share data with advertising networks.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Children's Privacy</h2>
            <p>The Service is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p className="mt-2">Truhand LLC<br />Chicago, IL, United States<br />Email: <a href="mailto:support@cutviral.ai" className="text-primary hover:underline">support@cutviral.ai</a></p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
