import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="March 10, 2024">
      <h2>1. Information We Collect</h2>
      <p>We collect information that you provide directly to us, including:</p>
      <ul>
        <li>Account information (name, email, password)</li>
        <li>Payment information</li>
        <li>Usage data and preferences</li>
        <li>Communications with our support team</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the collected information to:</p>
      <ul>
        <li>Provide and maintain our services</li>
        <li>Process your payments</li>
        <li>Send you important updates and notifications</li>
        <li>Improve our services</li>
        <li>Respond to your requests and support needs</li>
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
      </ul>
    </LegalPageLayout>
  );
}
