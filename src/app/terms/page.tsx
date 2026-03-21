export const metadata = {
  title: "Terms of Service - Cloud Agentist",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: March 21, 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Cloud Agentist at cloudagentist.com (&quot;the Service&quot;), you agree
              to be bound by these Terms of Service. If you do not agree, do not use the Service.
              Cloud Agentist is currently in beta and is provided as-is.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Description of Service</h2>
            <p>
              Cloud Agentist is a persistent AI assistant platform that helps you manage tasks
              including scheduling (via AgendaMerge), wishlists and gifting (via Wishlistamist), and
              other capabilities. The Service uses AI models to process your requests and propose
              actions on your behalf, subject to your approval for sensitive operations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Account and Access</h2>
            <p>
              You must sign in using a supported identity provider (Google, GitHub, or email/password
              via Auth0) to use the Service. You are responsible for maintaining the security of your
              account credentials. You must be at least 16 years of age to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Use the Service for any unlawful purpose or to violate any laws.</li>
              <li>Attempt to gain unauthorized access to the Service or its related systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Use the Service to generate harmful, abusive, or misleading content.</li>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service.</li>
              <li>Exceed reasonable usage limits or abuse API endpoints.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. AI-Proposed Actions and Approvals</h2>
            <p>
              The AI assistant may propose actions on your behalf (such as creating calendar events
              or managing wishlists). Sensitive actions require your explicit approval before
              execution. You are responsible for reviewing and approving or denying proposed actions.
              Cloud Agentist is not liable for the consequences of actions you approve.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a href="/privacy" className="text-indigo-400 hover:text-indigo-300">
                Privacy Policy
              </a>
              , which describes how we collect, use, and protect your data. Your conversations are
              processed by third-party AI providers (Anthropic Claude and OpenAI) to generate
              responses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Intellectual Property</h2>
            <p>
              You retain ownership of the content you provide to the Service (messages, calendar
              data, wishlists, etc.). Cloud Agentist retains ownership of the Service itself,
              including its software, design, and documentation. AI-generated responses are provided
              for your use but may not be claimed as solely your own original work.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Disclaimers</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
              either express or implied. Cloud Agentist does not guarantee that AI responses will be
              accurate, complete, or appropriate. The Service is in beta; expect bugs, downtime, and
              breaking changes. We do not provide financial, legal, medical, or other professional
              advice through the AI assistant.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Cloud Agentist shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of
              data, profits, or goodwill arising from your use of the Service. Our total liability
              for any claim shall not exceed the amount you paid for the Service in the 12 months
              preceding the claim, or $50, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Termination</h2>
            <p>
              You may stop using the Service and delete your account at any time. We may suspend or
              terminate your access if you violate these terms or engage in abusive behavior. Upon
              termination, your right to use the Service ceases immediately. We will delete your
              personal data in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Changes to Terms</h2>
            <p>
              We may update these terms as the Service evolves. We will notify registered users of
              material changes. Continued use of the Service after changes constitutes acceptance of
              the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Contact</h2>
            <p>
              For questions about these terms, email{" "}
              <a href="mailto:support@cloudagentist.com" className="text-indigo-400 hover:text-indigo-300">
                support@cloudagentist.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
