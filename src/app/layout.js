"use client";

import { Inter } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "next-themes";
import ReusableLayout from "@/reusable-ui/ReusableLayout";
// import CookieConsent from "@/components/cookies/CookieConsent";

const inter = Inter({ subsets: ["latin"] });
// new font

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <ReusableLayout>{children}</ReusableLayout>
        </ThemeProvider>
        {/* <CookieConsent /> */}
      </body>
    </html>
  );
}
