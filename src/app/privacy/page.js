import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="August 4, 2026">
      <h2>1. Information We Collect</h2>
      <p>We collect information that you provide directly to us, including:</p>
      <ul>
        <li>Account information (name, email, password)</li>
        <li>Payment information</li>
        <li>Usage data and preferences</li>
        <li>Communications with our support team</li>
        <li>
          Newsletter consent records, topic choices, signup source, and
          subscription status
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the collected information to:</p>
      <ul>
        <li>Provide and maintain our services</li>
        <li>Process your payments</li>
        <li>Send you important updates and notifications</li>
        <li>Improve our services</li>
        <li>
          Understand consented public-site usage through Firebase / Google
          Analytics 4 and investigate public-page UX friction through masked
          Microsoft Clarity recordings
        </li>
        <li>Respond to your requests and support needs</li>
        <li>
          Deliver newsletters only when you have given specific consent, and
          maintain suppression records so an unsubscribed address is not
          accidentally re-added
        </li>
      </ul>

      <h2>3. Information Sharing</h2>
      <p>
        We do not sell your personal information. We may share your information
        with:
      </p>
      <ul>
        <li>Service providers who assist in our operations</li>
        <li>Legal authorities when required by law</li>
        <li>Third parties with your explicit consent</li>
      </ul>
      <p>
        These providers include Firebase for authentication, application data,
        and consented analytics; Microsoft Clarity for consented, masked UX
        recordings on selected public pages; Polar for membership billing; and
        Resend for transactional and newsletter delivery. Each provider
        processes only the information needed for its role.
      </p>

      <h2>4. Data Security</h2>
      <p>
        We implement appropriate security measures to protect your personal
        information from unauthorized access, alteration, or destruction.
      </p>

      <h2>5. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access your personal information</li>
        <li>Correct inaccurate information</li>
        <li>Request deletion of your information</li>
        <li>Opt-out of marketing communications</li>
        <li>Withdraw newsletter consent at any time without affecting your account</li>
        <li>Request deletion or anonymization where applicable</li>
      </ul>

      <h2>6. Mentorship Reviews and Public References</h2>
      <p>
        After a completed engagement, each participant may submit one private
        direct review. There are no stars, rankings, numeric scores, or
        automatic aggregates. A student may separately write a public excerpt
        and consent to sharing it; GO must approve it, and the mentor chooses
        whether it appears on their mentor profile and GameDev Passport.
        Consent can be revoked, and reports or correction requests remove the
        excerpt from public eligibility.
      </p>

      <h2>7. Newsletter Consent and Unsubscribe</h2>
      <p>
        Newsletter signup is optional and separate from account creation,
        membership purchases, and acceptance of our Terms. We use double
        opt-in, which means an address is not activated until the confirmation
        link is used. We record the consent wording and version, policy
        version, source, and relevant timestamps so consent can be audited.
      </p>
      <p>
        Every newsletter includes preference and unsubscribe options that do
        not require an account login. Unsubscribing stops future marketing but
        does not stop essential account, security, service, or billing
        messages. We retain a minimal suppression record to prevent accidental
        re-import. A new explicit double opt-in is required to resubscribe.
      </p>

      <h2>8. Delivery and Engagement Data</h2>
      <p>
        We process delivery events such as sent, delivered, delayed, failed,
        bounced, complained, and suppressed to operate the service and protect
        sender reputation. Bounces and complaints immediately suppress future
        marketing. Open and click events are optional and are stored only when
        engagement tracking is explicitly enabled; these signals are
        approximate and are never used to make account, access, or billing
        decisions.
      </p>

      <h2>9. Retention</h2>
      <p>
        Email delivery and outbox records are scheduled for deletion after
        approximately 90 days, webhook deduplication records after 30 days, and
        newsletter consent audit events after approximately three years.
        Hash-only email event deduplication records may be retained to prevent
        duplicate transactional messages. Active consent and minimal
        unsubscribe, bounce, complaint, or suppression records may be retained
        while needed to honor your choices and legal obligations. Support or
        legal requirements may require a different period.
      </p>

      <h2>10. Contact and Review</h2>
      <p>
        Contact us through the website to exercise your rights or ask about
        this processing. This policy wording should be reviewed by Galactic
        Omnivore&apos;s business or legal owner before production launch and
        is not presented as legal advice.
      </p>
    </LegalPageLayout>
  );
}
