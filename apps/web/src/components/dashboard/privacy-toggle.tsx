"use client";

import { useState } from "react";
import { EyeOff, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PrivacyToggleProps {
  initialValue: boolean;
}

export function PrivacyToggle({ initialValue }: PrivacyToggleProps) {
  const [privacyMode, setPrivacyMode] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);

    try {
      const response = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ privacyMode: checked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      const result = await response.json();
      if (result.success) {
        setPrivacyMode(checked);
      }
    } catch (error) {
      console.error("Failed to update privacy mode:", error);
      // Revert on error
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5" />
          Privacy Mode
        </CardTitle>
        <CardDescription>
          Hide your username and stats from the public leaderboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {privacyMode ? "Enabled" : "Disabled"}
            </p>
            <p className="text-xs text-muted-foreground">
              {privacyMode
                ? "Your profile is hidden from the leaderboard"
                : "Your profile is visible on the leaderboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch
              checked={privacyMode}
              onCheckedChange={handleToggle}
              disabled={isUpdating}
              aria-label="Toggle privacy mode"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
