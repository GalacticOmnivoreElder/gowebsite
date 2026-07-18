import { Inter } from "next/font/google";
import "../globals.css";
import ReusableLayout from "@/reusable-ui/ReusableLayout";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  organizationJsonLd,
} from "@/lib/seo";
// import CookieConsent from "@/components/cookies/CookieConsent";

const inter = Inter({ subsets: ["latin"] });
// new font

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "Galactic Omnivore",
    "Macedonia game development",
    "game dev community",
    "Skopje game development",
    "game development education",
    "indie game development",
    "game development projects",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Game development community",
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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logos/logo9.png",
  },
  manifest: "/manifest.webmanifest",
};

// Create a client component wrapper for ThemeProvider
import ThemeProviderWrapper from "@/components/ThemeProviderWrapper";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <ThemeProviderWrapper>
          <ReusableLayout>{children}</ReusableLayout>
          <Toaster />
        </ThemeProviderWrapper>
        {/* <CookieConsent /> */}
      </body>
    </html>
  );
}
