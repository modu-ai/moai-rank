import { Link } from '@/i18n/routing';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UserNotFound() {
  return (
    <div className="container mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-24 text-center">
      <UserX className="mb-6 h-16 w-16 text-muted-foreground/50" />
      <h1 className="mb-2 text-2xl font-bold">User Not Found</h1>
      <p className="mb-8 text-muted-foreground">
        The user you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <Button asChild>
        <Link href="/">Back to Leaderboard</Link>
      </Button>
    </div>
  );
}
