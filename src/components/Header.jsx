"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X } from "lucide-react";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { ModeToggle } from "./ui/themeButton";
import Image from "next/image";
import logoImg from "../assets/logo.png";
export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Don't render the header on admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false); // Close menu after sign out
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isActive = (path) => {
    return pathname === path ? "default" : "ghost";
  };

  // Function to handle navigation and close menu
  const handleNavigation = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2" onClick={handleNavigation}>
          <Image src={logoImg} height={40} width={100} alt="Logo" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {user && (
              <Button asChild variant={isActive("/dashboard")} size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )}
            <Button asChild variant={isActive("/packages")} size="sm">
              <Link href="/packages">Packages</Link>
            </Button>
            <Button asChild variant={isActive("/games")} size="sm">
              <Link href="/games">Games</Link>
            </Button>
            <Button asChild variant={isActive("/blog")} size="sm">
              <Link href="/blog">Blog</Link>
            </Button>
            <Button asChild variant={isActive("/initiatives")} size="sm">
              <Link href="/initiatives">Initiatives</Link>
            </Button>
            <Button asChild variant={isActive("/pricing")} size="sm">
              <Link href="/pricing">Pricing</Link>
            </Button>
            <Button asChild variant={isActive("/membership")} size="sm">
              <Link href="/membership">Membership</Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ModeToggle />

          {!loading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarImage
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                      />
                      <AvatarFallback>
                        {user.displayName
                          ? user.displayName.charAt(0).toUpperCase()
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" onClick={handleNavigation}>Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=downloads" onClick={handleNavigation}>Downloads</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=settings" onClick={handleNavigation}>Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login" onClick={handleNavigation}>Log in</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/signup" onClick={handleNavigation}>Sign up</Link>
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
                variant={isActive("/dashboard")}
                className="justify-start"
              >
                <Link href="/dashboard" onClick={handleNavigation}>Dashboard</Link>
              </Button>
            )}
          
            <Button
              asChild
              variant={isActive("/packages")}
              className="justify-start"
            >
              <Link href="/packages" onClick={handleNavigation}>Packages</Link>
            </Button>
            <Button
              asChild
              variant={isActive("/games")}
              className="justify-start"
            >
              <Link href="/games" onClick={handleNavigation}>Games</Link>
            </Button>
            <Button
              asChild
              variant={isActive("/blog")}
              className="justify-start"
            >
              <Link href="/blog" onClick={handleNavigation}>Blog</Link>
            </Button>
            <Button
              asChild
              variant={isActive("/initiatives")}
              className="justify-start"
            >
              <Link href="/initiatives" onClick={handleNavigation}>Initiatives</Link>
            </Button>

            <Button
              asChild
              variant={isActive("/pricing")}
              className="justify-start"
            >
              <Link href="/pricing" onClick={handleNavigation}>Pricing</Link>
            </Button>
            <Button
              asChild
              variant={isActive("/membership")}
              className="justify-start"
            >
              <Link href="/membership" onClick={handleNavigation}>Membership</Link>
            </Button>

            {user && (
              <Button
                asChild
                variant={isActive("/profile")}
                className="justify-start"
              >
                <Link href="/profile" onClick={handleNavigation}>Profile</Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
