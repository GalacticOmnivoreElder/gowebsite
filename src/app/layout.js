import { ThemeProvider } from "@/components/theme-provider";
import "../globals.css";
import { Inter, Orbitron } from "next/font/google";
import Head from "next/head";

const inter = Inter({ subsets: ["latin"] });
const orbitron = Orbitron({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <title>Galactic Omnivore</title>
      </Head>
      <body className={orbitron.className}>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
