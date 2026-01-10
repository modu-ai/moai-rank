'use client';

import { useEffect, useState } from 'react';
import { Github, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GITHUB_REPO = 'modu-ai/moai-rank';

interface GitHubStats {
  stars: number;
  loading: boolean;
}

export function GitHubButton() {
  const [stats, setStats] = useState<GitHubStats>({ stars: 0, loading: true });

  useEffect(() => {
    async function fetchGitHubStats() {
      try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
          const data = await response.json();
          setStats({ stars: data.stargazers_count || 0, loading: false });
        } else {
          setStats({ stars: 0, loading: false });
        }
      } catch {
        setStats({ stars: 0, loading: false });
      }
    }

    fetchGitHubStats();
  }, []);

  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <Button variant="outline" size="sm" asChild className="gap-1.5">
      <a
        href={`https://github.com/${GITHUB_REPO}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Star on GitHub"
      >
        <Github className="h-4 w-4" />
        <span className="hidden sm:inline">Star</span>
        {!stats.loading && stats.stars > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {formatCount(stats.stars)}
          </span>
        )}
      </a>
    </Button>
  );
}
