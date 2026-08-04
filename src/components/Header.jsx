"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { observer } from "mobx-react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import SubscribeButton from "@/components/ui/SubscribeButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";
import {
  learningNavigation,
  primaryNavigation,
} from "@/lib/navigation";
import MobxStore from "@/mobx";
import { UserNav } from "@/reusable-ui/ReusableProfileMenu";
import logoImg from "../assets/logo.png";

const Header = observer(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? MobxStore.user : null;
  const authReady = mounted && !MobxStore.loading;

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const pathIsActive = (path) =>
    pathname === path || pathname?.startsWith(`${path}/`);
  const isLearningActive = learningNavigation.some((item) =>
    pathIsActive(item.path)
  );
  const isLearningItemActive = (item) =>
    item.path !== "/education" && pathIsActive(item.path);
  const isProfileActive =
    pathIsActive("/profile") || pathIsActive("/onboarding");

  const handleNavigation = () => {
    setIsMenuOpen(false);
  };

  const renderPrimaryLink = (item) => (
    <Button
      key={item.href}
      asChild
      variant={pathIsActive(item.href) ? "default" : "ghost"}
      size="sm"
    >
      <Link
        href={item.href}
        aria-current={pathIsActive(item.href) ? "page" : undefined}
      >
        {item.label}
      </Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={handleNavigation}
          >
            <Image
              src={logoImg}
              height={40}
              width={100}
              alt="Galactic Omnivore"
              priority
            />
          </Link>

          <nav
            className="ml-6 hidden items-center gap-1 lg:flex"
            aria-label="Primary navigation"
          >
            {user && (
              <Button
                asChild
                variant={isProfileActive ? "default" : "ghost"}
                size="sm"
              >
                <Link
                  href="/profile"
                  aria-current={isProfileActive ? "page" : undefined}
                >
                  Profile
                </Link>
              </Button>
            )}

            {primaryNavigation.slice(0, 2).map(renderPrimaryLink)}

            <NavigationMenu delayDuration={120} skipDelayDuration={300}>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      "h-9 bg-transparent px-3 text-sm hover:bg-accent focus:bg-accent",
                      isLearningActive &&
                        "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground data-[state=open]:bg-primary/90"
                    )}
                  >
                    Learn
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[min(24rem,calc(100vw-2rem))] gap-1 p-3">
                      {learningNavigation.map((item) => {
                        const active = isLearningItemActive(item);
                        return (
                          <li key={item.label}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "block rounded-md border border-transparent px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  active && "border-primary/45 bg-primary/10"
                                )}
                              >
                                <span className="block text-sm font-semibold text-foreground">
                                  {item.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                  {item.description}
                                </span>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {primaryNavigation.slice(2).map(renderPrimaryLink)}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {authReady && (
            <>
              <SubscribeButton
                className="hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 lg:flex"
                size="sm"
              >
                Review membership
              </SubscribeButton>

              {user ? (
                <>
                  <NotificationBell />
                  <UserNav user={user} logout={MobxStore.logout} />
                </>
              ) : (
                <div className="hidden items-center gap-2 lg:flex">
                  <Button
                    asChild
                    variant={pathname === "/login" ? "default" : "ghost"}
                    size="sm"
                  >
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button
                    asChild
                    variant={pathname === "/signup" ? "default" : "ghost"}
                    size="sm"
                  >
                    <Link href="/signup">Sign up</Link>
                  </Button>
                </div>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t bg-background/98 lg:hidden">
          <nav
            id="mobile-primary-navigation"
            className="container flex max-h-[calc(100vh-4rem)] flex-col gap-2 overflow-y-auto py-4"
            aria-label="Mobile navigation"
          >
            {user && (
              <Button
                asChild
                variant={isProfileActive ? "default" : "ghost"}
                className="justify-start"
              >
                <Link href="/profile" onClick={handleNavigation}>
                  Profile
                </Link>
              </Button>
            )}

            {primaryNavigation.slice(0, 2).map((item) => (
              <Button
                key={item.href}
                asChild
                variant={pathIsActive(item.href) ? "default" : "ghost"}
                className="justify-start"
              >
                <Link href={item.href} onClick={handleNavigation}>
                  {item.label}
                </Link>
              </Button>
            ))}

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="learn" className="border-0">
                <AccordionTrigger
                  className={cn(
                    "rounded-md px-4 py-2 text-sm hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isLearningActive &&
                      "border border-primary/45 bg-primary/10 text-foreground"
                  )}
                >
                  Learn
                </AccordionTrigger>
                <AccordionContent className="px-2 pt-2">
                  <div className="grid gap-2">
                    {learningNavigation.map((item) => {
                      const active = isLearningItemActive(item);
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={handleNavigation}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "rounded-md border border-border bg-card/50 px-3 py-2.5 text-sm transition-colors hover:border-primary/45 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active && "border-primary/55 bg-primary/10"
                          )}
                        >
                          <span className="block font-semibold">{item.label}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                            {item.description}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {primaryNavigation.slice(2).map((item) => (
              <Button
                key={item.href}
                asChild
                variant={pathIsActive(item.href) ? "default" : "ghost"}
                className="justify-start"
              >
                <Link href={item.href} onClick={handleNavigation}>
                  {item.label}
                </Link>
              </Button>
            ))}

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
              <SubscribeButton className="justify-start bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Review membership
              </SubscribeButton>
            )}
          </nav>
        </div>
      )}
    </header>
  );
});

export default Header;
