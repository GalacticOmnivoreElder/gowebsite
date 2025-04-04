import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import MobxStore from "@/mobx";
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Twitch } from "lucide-react";

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
    },
    { 
      icon: <Twitter className="h-5 w-5" />, 
      src: "https://twitter.com/GalacticOmnivor" 
    },
    {
      icon: <Instagram className="h-5 w-5" />,
      src: "https://www.instagram.com/galacticomnivore/",
    },
    {
      icon: <Linkedin className="h-5 w-5" />,
      src: "https://www.linkedin.com/company/galactic-omnivore/",
    },
    {
      icon: <Youtube className="h-5 w-5" />,
      src: "https://www.youtube.com/@galacticomnivore",
    },
    {
      icon: <Twitch className="h-5 w-5" />,
      src: "https://www.twitch.tv/galactic_omnivore",
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
              Empowering game developers with monthly themed asset packs,
              tutorials, and code snippets to bring your creative visions to
              life.
            </p>
            <div className="flex gap-4 mt-4">
              {socialMedia.map((social, index) => (
                <Link
                  key={index}
                  href={social.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {social.icon}
                  <span className="sr-only">
                    {social.src.includes("facebook") ? "Facebook" : 
                     social.src.includes("twitter") ? "Twitter" : 
                     social.src.includes("instagram") ? "Instagram" : 
                     social.src.includes("linkedin") ? "LinkedIn" : 
                     social.src.includes("youtube") ? "YouTube" : 
                     social.src.includes("twitch") ? "Twitch" : "Social Media"}
                  </span>
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
                  Blog
                </Link>
              </li>

              <li>
                <Link
                  href="/packages"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Packages
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
            <h3 className="font-medium text-sm mb-3">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About Us
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
          </div>
        </div>
{/* disabled-feature */}
        {/* <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            MobxStore.cookieSettingsOpen = true;
          }}
        >
          Manage Cookies
        </Button> */}
      </div>
    </footer>
  );
}
