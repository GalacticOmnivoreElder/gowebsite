import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="March 10, 2024">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using Galactic Omnivore&apos;s services, you agree to
        be bound by these Terms of Service. If you do not agree to these terms,
        please do not use our services.
      </p>

      <h2>2. Subscription Services</h2>
      <p>
        Galactic Omnivore provides subscription-based access to game development
        assets and resources. By subscribing to our services, you agree to:
      </p>
      <ul>
        <li>Pay the subscription fees as specified</li>
        <li>Use the assets in accordance with our licensing terms</li>
        <li>Maintain the confidentiality of your account credentials</li>
      </ul>

      <h2>3. Intellectual Property Rights</h2>
      <p>
        All assets, content, and materials provided through our services are
        protected by intellectual property rights. Subscribers receive a
        non-exclusive license to use these materials as specified in our asset
        usage terms.
      </p>

      <h2>4. User Conduct</h2>
      <p>Users must not:</p>
      <ul>
        <li>Share or redistribute subscription content</li>
        <li>Attempt to circumvent our security measures</li>
        <li>Use our services for any illegal purposes</li>
        <li>Harass or harm other users</li>
      </ul>

      <h2>5. Termination</h2>
      <p>
        We reserve the right to terminate or suspend access to our services for
        violations of these terms or for any other reason at our discretion.
      </p>

      <h2>6. Changes to Terms</h2>
      <p>
        We may modify these terms at any time. Continued use of our services
        after such changes constitutes acceptance of the new terms.
      </p>
    </LegalPageLayout>
  );
}
