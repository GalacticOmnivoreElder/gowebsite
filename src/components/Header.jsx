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

const Header = observer(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

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
            {MobxStore.user && (
              <Button asChild variant={isActive("/profile")} size="sm">
                <Link href="/profile">Dashboard</Link>
              </Button>
            )}
            <Button asChild variant={isActive("/projects")} size="sm">
              <Link href="/projects">Projects</Link>
            </Button>
            <Button asChild variant={isActive("/resources")} size="sm">
              <Link href="/resources">Resources</Link>
            </Button>
            <Button asChild variant={isActive("/games")} size="sm">
              <Link href="/games">Games</Link>
            </Button>
            <Button asChild variant={isActive("/blog")} size="sm">
              <Link href="/blog">Blog</Link>
            </Button>
            <Button asChild variant={isActive("/pricing")} size="sm">
              <Link href="/pricing">Pricing</Link>
            </Button>
            <Button asChild variant={isActive("/membership")} size="sm">
              <Link href="/membership">Join Us</Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {!MobxStore.loading && (
            <>
              {MobxStore.user ? (
                <UserNav user={MobxStore.user} logout={MobxStore.logout} />
              ) : (
                <div className="flex items-center gap-2">
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
            {MobxStore.user && (
              <Button
                asChild
                variant={isActive("/profile")}
                className="justify-start"
              >
                <Link href="/profile" onClick={handleNavigation}>
                  Dashboard
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
              variant={isActive("/pricing")}
              className="justify-start"
            >
              <Link href="/pricing" onClick={handleNavigation}>
                Pricing
              </Link>
            </Button>
            <Button
              asChild
              variant={isActive("/membership")}
              className="justify-start"
            >
              <Link href="/membership" onClick={handleNavigation}>
                Join Us
              </Link>
            </Button>

            {MobxStore.user && (
              <Button
                asChild
                variant={isActive("/profile")}
                className="justify-start"
              >
                <Link href="/profile" onClick={handleNavigation}>
                  Profile
                </Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
});

export default Header;
