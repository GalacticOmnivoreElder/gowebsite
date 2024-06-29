import { ThemeProvider } from "@/components/theme-provider";
import "../globals.css";
import { Inter, Orbitron } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const orbitron = Orbitron({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head></head>
      <body className={orbitron.className}>
        <ThemeProvider attribute="class" defaultTheme="system">
          {/* <ReusableLayout>{children}</ReusableLayout> */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
