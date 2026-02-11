export const metadata = { title: 'Terms - ProConnect' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-lg">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-8">
          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using ProConnect, you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              ProConnect is an image sharing platform that allows users to upload, share, and discover images. 
              Our service includes features such as collections, likes, comments, and social interactions.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Image upload and sharing capabilities</li>
              <li>Social features including likes, comments, and follows</li>
              <li>Collection creation and management</li>
              <li>Search and discovery tools</li>
              <li>User profiles and networking</li>
            </ul>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">3. User Accounts</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>When you create an account with us, you must provide accurate and complete information. You are responsible for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining the security of your account and password</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Ensuring your account information is up to date</li>
              </ul>
            </div>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">4. Content Guidelines</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>You retain ownership of content you upload, but grant us a license to use it. You agree not to upload content that:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Is illegal, harmful, threatening, or abusive</li>
                <li>Infringes on intellectual property rights</li>
                <li>Contains explicit sexual content or nudity</li>
                <li>Promotes violence or discrimination</li>
                <li>Contains spam or misleading information</li>
                <li>Violates any applicable laws or regulations</li>
              </ul>
            </div>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">5. Privacy and Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, 
              to understand our practices regarding the collection and use of your information.
            </p>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">6. Intellectual Property</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>The service and its original content, features, and functionality are owned by ProConnect and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
              <p>You retain ownership of your content but grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content in connection with the service.</p>
            </div>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">7. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, 
              under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall ProConnect, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, 
              incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, 
              or other intangible losses, resulting from your use of the service.
            </p>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice 
              prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>

          <section className="bg-card/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4 text-primary">10. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border/50">
              <p className="text-primary font-medium">Email:</p>
              <p className="text-muted-foreground">rehman.contact9@gmail.com</p>
              <p className="text-primary font-medium mt-2">Address:</p>
              <p className="text-muted-foreground">ProConnect Support Team<br />
              [Your Company Address]<br />
              [City, State, ZIP]</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


