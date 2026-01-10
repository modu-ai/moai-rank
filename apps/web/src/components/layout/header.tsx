import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Trophy, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Trophy className="h-5 w-5 text-amber-500" />
          <span>MoAI Rank</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-4 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Leaderboard
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {userId ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="sm:hidden">
                <Link href="/dashboard" aria-label="Dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
              </Button>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Get Started</Button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
