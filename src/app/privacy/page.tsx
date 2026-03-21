export const metadata = {
  title: "Privacy Policy - Cloud Agentist",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: March 21, 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. What This Policy Covers</h2>
            <p>
              This privacy policy describes how Cloud Agentist (&quot;we&quot;, &quot;us&quot;, &quot;the product&quot;)
              collects, uses, stores, and protects your information when you use the Cloud Agentist
              platform at cloudagentist.com and its associated services, including AgendaMerge and
              Wishlistamist. Cloud Agentist is currently in beta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-slate-100">Account information:</strong> When you sign in via Auth0,
                we receive your name, email address, and profile picture from your identity provider
                (Google, GitHub, or email/password).
              </li>
              <li>
                <strong className="text-slate-100">Conversations:</strong> Messages you send to and receive
                from your AI assistant, including proposed actions and approval decisions.
              </li>
              <li>
                <strong className="text-slate-100">Calendar and scheduling data:</strong> Events, availability,
                and scheduling preferences you share through the AgendaMerge capability.
              </li>
              <li>
                <strong className="text-slate-100">Wishlist data:</strong> Wishlists, gift ideas, and related
                preferences you create through the Wishlistamist capability.
              </li>
              <li>
                <strong className="text-slate-100">Memories and goals:</strong> Information your AI assistant
                learns about your preferences, goals, and facts you share during conversations.
              </li>
              <li>
                <strong className="text-slate-100">Activity and event logs:</strong> Records of interactions,
                actions taken, and approval decisions for audit and transparency purposes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. How We Use AI</h2>
            <p>
              Cloud Agentist uses third-party AI models to power your assistant. Your conversations
              and relevant context are sent to AI providers (currently Anthropic Claude and OpenAI)
              to generate responses and propose actions. These providers process your data according
              to their own privacy policies and data processing agreements. We do not use your
              conversations to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Data Storage and Security</h2>
            <p>
              Your data is stored on Google Cloud Platform (GCP) infrastructure, including Cloud Run
              services and Cloud SQL (PostgreSQL) databases. We use encryption in transit (TLS) and
              at rest. Authentication is handled through Auth0 using industry-standard OAuth 2.0 and
              JWT tokens. Sensitive credentials are managed through a credential vault broker and are
              never exposed to AI providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Data Sharing</h2>
            <p>We do not sell your personal data. We share data only with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong className="text-slate-100">AI providers</strong> (Anthropic, OpenAI) to process
                your conversations and generate responses.
              </li>
              <li>
                <strong className="text-slate-100">Auth0</strong> for authentication and identity management.
              </li>
              <li>
                <strong className="text-slate-100">Google Cloud Platform</strong> as our infrastructure provider.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-slate-100">Access</strong> the personal data we hold about you.</li>
              <li><strong className="text-slate-100">Delete</strong> your account and associated data.</li>
              <li><strong className="text-slate-100">Export</strong> your data in a portable format.</li>
              <li><strong className="text-slate-100">Review</strong> your AI interaction history and memories through the dashboard.</li>
              <li><strong className="text-slate-100">Revoke</strong> approval for any pending AI-proposed actions.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at the email below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. Conversation history and
              event logs are stored using append-only records for audit transparency. If you delete
              your account, we will remove your personal data within 30 days, except where retention
              is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Beta Disclaimer</h2>
            <p>
              Cloud Agentist is currently in beta. Features, data handling practices, and this policy
              may change as the product evolves. We will notify registered users of material changes
              to this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Contact</h2>
            <p>
              For privacy questions or data requests, email{" "}
              <a href="mailto:privacy@cloudagentist.com" className="text-indigo-400 hover:text-indigo-300">
                privacy@cloudagentist.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
