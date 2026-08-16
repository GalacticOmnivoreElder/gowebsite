import { Inter } from "next/font/google";
import "../globals.css";
import ReusableLayout from "@/reusable-ui/ReusableLayout";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  seoJsonLd,
} from "@/lib/seo";
// import CookieConsent from "@/components/cookies/CookieConsent";

const inter = Inter({ subsets: ["latin"] });
// new font

export const viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#CA2280",
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Game development community",
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} game development community`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: [
      {
        url: "/galactic-omnivore-skull-v1-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/galactic-omnivore-skull-v1-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: "/galactic-omnivore-skull-v1-32.png",
    apple: [
      {
        url: "/galactic-omnivore-skull-v1-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
};

// Create a client component wrapper for ThemeProvider
import ThemeProviderWrapper from "@/components/ThemeProviderWrapper";
import { Toaster } from "@/components/ui/toaster";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import CookieConsent from "@/components/cookies/CookieConsent";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seoJsonLd),
          }}
        />
        <ThemeProviderWrapper>
          <AnalyticsProvider>
            <ReusableLayout>{children}</ReusableLayout>
            <Toaster />
            <CookieConsent />
          </AnalyticsProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
