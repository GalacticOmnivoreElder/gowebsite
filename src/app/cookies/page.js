import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default function CookiesPage() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated="March 10, 2024">
      <h2>1. What Are Cookies</h2>
      <p>
        Cookies are small text files stored on your device when you visit our
        website. They help us provide and improve our services.
      </p>

      <h2>2. Types of Cookies We Use</h2>

      <h3>Essential Cookies</h3>
      <p>
        These cookies are necessary for the website to function properly and
        cannot be disabled. They include:
      </p>
      <ul>
        <li>Authentication cookies from Firebase to keep you signed in</li>
        <li>Session security tokens</li>
        <li>Basic website functionality cookies</li>
      </ul>

      <h3>Functional Cookies (Optional)</h3>
      <p>
        These cookies enable enhanced functionality and personalization,
        including:
      </p>
      <ul>
        <li>Remember your preferences and settings</li>
        <li>Customize your experience</li>
      </ul>

      <h3>Analytics Cookies (Optional)</h3>
      <p>
        These cookies help us understand how visitors interact with our website:
      </p>
      <ul>
        <li>Anonymous usage statistics</li>
        <li>Website performance monitoring</li>
      </ul>

      <h2>3. Firebase Authentication Cookies</h2>
      <p>
        We use Firebase Authentication for user management, which sets essential
        cookies to:
      </p>
      <ul>
        <li>Keep you securely signed in</li>
        <li>Protect your account</li>
        <li>Maintain your session</li>
      </ul>

      <h2>4. Managing Your Cookie Preferences</h2>
      <p>You can manage your cookie preferences at any time by:</p>
      <ul>
        <li>Using the cookie settings in our website footer</li>
        <li>Adjusting your browser settings</li>
        <li>Contacting our support team</li>
      </ul>

      <h2>5. Updates to This Policy</h2>
      <p>
        We may update this Cookie Policy to reflect changes in our practices or
        for operational, legal, or regulatory reasons. The date at the top of
        this page indicates when the policy was last updated.
      </p>
    </LegalPageLayout>
  );
}
