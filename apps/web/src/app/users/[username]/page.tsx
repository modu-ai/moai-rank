import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Zap,
  Activity,
  ArrowLeft,
  EyeOff,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber, formatRelativeDate } from "@/lib/utils";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface PublicUserProfile {
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
  stats: {
    totalTokens: number;
    totalSessions: number;
    currentRank: number | null;
    compositeScore: number | null;
  };
  isPrivate: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: PublicUserProfile;
}

async function getUserProfile(username: string): Promise<ApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/users/${username}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      return { success: false };
    }

    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }

    return response.json();
  } catch (error) {
    console.error("User profile fetch error:", error);
    return { success: false };
  }
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s Profile`,
    description: `View ${username}'s AI token usage statistics and ranking on MoAI Rank.`,
  };
}

function getRankBadgeVariant(rank: number | null) {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "secondary";
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const result = await getUserProfile(username);

  if (!result.success || !result.data) {
    notFound();
  }

  const profile = result.data;

  if (profile.isPrivate) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leaderboard
          </Link>
        </Button>

        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback>
                  <EyeOff className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">Private Profile</CardTitle>
            <CardDescription>
              This user has enabled privacy mode and their statistics are
              hidden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Member since {formatRelativeDate(profile.joinedAt)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leaderboard
        </Link>
      </Button>

      <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-24 w-24">
          {profile.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt={profile.username} />
          ) : null}
          <AvatarFallback>
            <User className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{profile.username}</h1>
            {profile.stats.currentRank && (
              <Badge variant={getRankBadgeVariant(profile.stats.currentRank)}>
                #{profile.stats.currentRank}
              </Badge>
            )}
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Joined {formatRelativeDate(profile.joinedAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Current Rank"
          value={
            profile.stats.currentRank
              ? `#${profile.stats.currentRank}`
              : "Unranked"
          }
          description="All-time ranking"
        />
        <StatCard
          icon={Zap}
          label="Total Tokens"
          value={formatNumber(profile.stats.totalTokens)}
          description="Lifetime usage"
        />
        <StatCard
          icon={Activity}
          label="Sessions"
          value={formatNumber(profile.stats.totalSessions)}
          description="Total sessions tracked"
        />
        <StatCard
          icon={Trophy}
          label="Composite Score"
          value={
            profile.stats.compositeScore
              ? formatNumber(Math.round(profile.stats.compositeScore))
              : "-"
          }
          description="Ranking score"
        />
      </div>
    </div>
  );
}
