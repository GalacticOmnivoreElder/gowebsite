"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import logoImg from "../assets/logo.png";
import { UserNav } from "@/reusable-ui/ReusableProfileMenu";
import MobxStore from "@/mobx";
import { observer } from "mobx-react";
import SubscribeButton from "@/components/ui/SubscribeButton";

const Header = observer(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Auth state lives in the MobX store, which differs between the server render
  // (logged-out) and the hydrated client. Gate every auth-dependent branch on
  // `mounted` so the server HTML and the first client render are identical,
  // avoiding a hydration mismatch. Real state shows after mount.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? MobxStore.user : null;
  const authReady = mounted && !MobxStore.loading;

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Don't render the header on admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const isActive = (path) => {
    // For login and signup routes, check for exact match
    if (path === "/login" || path === "/signup") {
      return pathname === path ? "default" : "ghost";
    }
    // For other routes, check if pathname starts with the path
    return pathname?.startsWith(path) ? "default" : "ghost";
  };

  const isProfileActive =
    pathname?.startsWith("/profile") || pathname?.startsWith("/onboarding")
      ? "default"
      : "ghost";

  // Function to handle navigation and close menu
  const handleNavigation = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={handleNavigation}
          >
            <Image src={logoImg} height={40} width={100} alt="Logo" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {user && (
              <Button asChild variant={isProfileActive} size="sm">
                <Link href="/profile">Profile</Link>
              </Button>
            )}
            <Button asChild variant={isActive("/projects")} size="sm">
              <Link href="/projects">Projects</Link>
            </Button>
            <Button asChild variant={isActive("/resources")} size="sm">
              <Link href="/resources">Resources</Link>
            </Button>
            <Button asChild variant={isActive("/education")} size="sm">
              <Link href="/education">Education</Link>
            </Button>
            <Button asChild variant={isActive("/games")} size="sm">
              <Link href="/games">Games</Link>
            </Button>
            <Button asChild variant={isActive("/blog")} size="sm">
              <Link href="/blog">Blog</Link>
            </Button>
            <Button asChild variant={isActive("/membership")} size="sm">
              <Link href="/membership">Membership</Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {authReady && (
            <>
              <SubscribeButton
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hidden md:flex"
                size="sm"
              >
                Subscribe Premium
              </SubscribeButton>

              {user ? (
                <UserNav user={user} logout={MobxStore.logout} />
              ) : (
                <div className="hidden items-center gap-2 md:flex">
                  <Button
                    asChild
                    variant={pathname === "/login" ? "default" : "ghost"}
                    size="sm"
                  >
                    <Link href="/login" onClick={handleNavigation}>
                      Log in
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant={pathname === "/signup" ? "default" : "ghost"}
                    size="sm"
                  >
                    <Link href="/signup" onClick={handleNavigation}>
                      Sign up
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="flex flex-col p-4 space-y-2">
            {user && (
              <Button
                asChild
                variant={isProfileActive}
                className="justify-start"
              >
                <Link href="/profile" onClick={handleNavigation}>
                  Profile
                </Link>
              </Button>
            )}

            <Button
              asChild
              variant={isActive("/projects")}
              className="justify-start"
            >
              <Link href="/projects" onClick={handleNavigation}>
                Projects
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive("/resources")}
              className="justify-start"
            >
              <Link href="/resources" onClick={handleNavigation}>
                Resources
              </Link>
            </Button>
            <Button
              asChild
              variant={isActive("/education")}
              className="justify-start"
            >
              <Link href="/education" onClick={handleNavigation}>
                Education
              </Link>
            </Button>
            <Button
              asChild
              variant={isActive("/games")}
              className="justify-start"
            >
              <Link href="/games" onClick={handleNavigation}>
                Games
              </Link>
            </Button>
            <Button
              asChild
              variant={isActive("/blog")}
              className="justify-start"
            >
              <Link href="/blog" onClick={handleNavigation}>
                Blog
              </Link>
            </Button>

            <Button
              asChild
              variant={isActive("/membership")}
              className="justify-start"
            >
              <Link href="/membership" onClick={handleNavigation}>
                Membership
              </Link>
            </Button>

            {authReady && !user && (
              <>
                <Button
                  asChild
                  variant={pathname === "/login" ? "default" : "ghost"}
                  className="justify-start"
                >
                  <Link href="/login" onClick={handleNavigation}>
                    Log in
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={pathname === "/signup" ? "default" : "ghost"}
                  className="justify-start"
                >
                  <Link href="/signup" onClick={handleNavigation}>
                    Sign up
                  </Link>
                </Button>
              </>
            )}

            {authReady && (
              <SubscribeButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 justify-start">
                Subscribe Premium
              </SubscribeButton>
            )}
          </nav>
        </div>
      )}
    </header>
  );
});

export default Header;
