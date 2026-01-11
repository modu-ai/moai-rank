'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

const REPOS = [
  { name: 'MoAI-ADK', repo: 'modu-ai/moai-adk' },
  { name: 'MoAI-Rank', repo: 'modu-ai/moai-rank' },
];

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function GitHubButton() {
  const [stars, setStars] = useState<Record<string, number | null>>({});

  useEffect(() => {
    async function fetchStars() {
      for (const { repo } of REPOS) {
        try {
          const response = await fetch(`https://api.github.com/repos/${repo}`);
          if (response.ok) {
            const data = await response.json();
            setStars((prev) => ({ ...prev, [repo]: data.stargazers_count }));
          }
        } catch {
          // Silently fail for star count
        }
      }
    }
    fetchStars();
  }, []);

  return (
    <div className="flex items-center gap-1">
      {REPOS.map(({ name, repo }) => (
        <Button key={repo} variant="outline" size="sm" asChild className="gap-1.5">
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${name} on GitHub`}
          >
            <GitHubIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{name}</span>
            {stars[repo] !== undefined && stars[repo] !== null && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span className="text-xs font-medium text-foreground">
                  {formatStarCount(stars[repo])}
                </span>
              </span>
            )}
          </a>
        </Button>
      ))}
    </div>
  );
}
