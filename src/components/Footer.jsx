import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Instagram, Linkedin, Youtube, Twitch } from "lucide-react";
import Image from "next/image";
import discordImg from "@/assets/discord.png";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { CookieSettingsButton } from "@/components/cookies/CookieConsent";
import { trackEvent } from "@/lib/analytics/client";

// Custom X (Twitter) icon component
const TwitterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

export default function Footer() {
  const pathname = usePathname();

  // Don't render the footer on admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const socialMedia = [
    {
      icon: <Facebook className="h-5 w-5" />,
      src: "https://www.facebook.com/profile.php?id=100088917386120",
      name: "Facebook",
    },
    {
      icon: <TwitterIcon />,
      src: "https://twitter.com/GalacticOmnivor",
      name: "Twitter",
    },
    {
      icon: <Instagram className="h-5 w-5" />,
      src: "https://www.instagram.com/galacticomnivore/",
      name: "Instagram",
    },
    {
      icon: <Linkedin className="h-5 w-5" />,
      src: "https://www.linkedin.com/company/galactic-omnivore/",
      name: "LinkedIn",
    },
    {
      icon: <Youtube className="h-5 w-5" />,
      src: "https://www.youtube.com/@galacticomnivore",
      name: "YouTube",
    },
    {
      icon: <Twitch className="h-5 w-5" />,
      src: "https://www.twitch.tv/galactic_omnivore",
      name: "Twitch",
    },
    {
      icon: (
        <Image
          src={discordImg}
          alt=""
          width={20}
          height={20}
          className="h-5 w-5"
        />
      ),
      src: "https://discord.gg/ZbSShxu6K4",
      name: "Discord",
    },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="font-bold text-xl">
              Galactic Omnivore
            </Link>
            <p className="mt-2 text-muted-foreground max-w-md">
              A North Macedonian nonprofit community and platform helping game
              creators move toward the next playable milestone.
            </p>
            <div className="flex gap-4 mt-4">
              {socialMedia.map((social) => (
                <Link
                  key={social.name}
                  href={social.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent("external_link_clicked", {
                      destination_category: social.name.toLowerCase(),
                      link_context: "footer_social",
                    })
                  }
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Link to ${social.name}`}
                >
                  {social.icon}
                  <span className="sr-only">{social.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  GO Signal
                </Link>
              </li>
              <li>
                <Link
                  href="/education"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Education
                </Link>
              </li>

              <li>
                <Link
                  href="/resources"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Resources
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-3">Organization</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About GO
                </Link>
              </li>
              <li>
                <Link
                  href="/membership"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Membership
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <NewsletterSignup source="footer" variant="footer" />
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Galactic Omnivore. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/cookies"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cookie Policy
            </Link>
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
