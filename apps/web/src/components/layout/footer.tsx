import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 md:flex-row md:justify-between">
        <p className="text-center text-sm text-muted-foreground">
          Built with Next.js 16, Clerk, and Neon
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/goosiux/moai-rank"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="View source on GitHub"
          >
            <Github className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
