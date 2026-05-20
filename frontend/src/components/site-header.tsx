'use client';

import { Show, UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { MAIN_NAV_ITEMS, MobileNavSheet } from '@/components/mobile-nav-sheet';
import { buttonVariants } from '@/components/ui/button-variants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span className="truncate font-sans text-base">Recipe Studio</span>
        </Link>

        {/* Desktop / tablet: horizontal nav */}
        <nav
          className="hidden items-center gap-1 text-sm font-medium md:gap-2 md:flex"
          aria-label="Main"
        >
          {MAIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'shrink-0',
                pathname === item.href && 'bg-muted text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
          <Show when="signed-in">
            <Link
              href="/messages"
              aria-label="Messages"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                pathname === '/messages' && 'bg-muted text-foreground',
              )}
            >
              <Send className="size-4" aria-hidden />
            </Link>
          </Show>
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ size: 'sm' }))}
            >
              Sign up
            </Link>
          </Show>
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'size-8',
                },
              }}
            />
          </Show>
        </nav>

        {/* Small screens: account + burger */}
        <div className="flex items-center gap-1 md:hidden">
          <Show when="signed-in">
            <Link
              href="/messages"
              aria-label="Messages"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                pathname === '/messages' && 'bg-muted text-foreground',
              )}
            >
              <Send className="size-4" aria-hidden />
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'size-8',
                },
              }}
            />
          </Show>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation-sheet"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Menu className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <MobileNavSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        footer={
          isLoaded && !isSignedIn ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Account</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/sign-in"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'min-w-24 flex-1 justify-center',
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'min-w-24 flex-1 justify-center',
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            </div>
          ) : undefined
        }
      />
    </header>
  );
}
