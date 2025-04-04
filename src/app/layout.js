import { Inter } from "next/font/google";
import "../globals.css";
import ReusableLayout from "@/reusable-ui/ReusableLayout";
// import CookieConsent from "@/components/cookies/CookieConsent";

const inter = Inter({ subsets: ["latin"] });
// new font

export const metadata = {
  title: 'Galactic Omnivore',
  description: 'Galactic Omnivore is the only Game Dev. Community in North Macedonia where you can greet, meet and create your own game dev. team.',
  icons: {
    icon: '/favicon.ico', 
  },
}

// Create a client component wrapper for ThemeProvider
import ThemeProviderWrapper from "@/components/ThemeProviderWrapper";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={inter.className}>
        <ThemeProviderWrapper>
          <ReusableLayout>{children}</ReusableLayout>
        </ThemeProviderWrapper>
        {/* <CookieConsent /> */}
      </body>
    </html>
  );
}