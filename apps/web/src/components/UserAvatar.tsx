import { cn } from '@/lib/utils';
import type { MeResponse } from '@hisobotchi/shared';

type AvatarUser = Pick<MeResponse, 'firstName' | 'username' | 'photoUrl'> | null;

/**
 * Round avatar: shows the Telegram profile photo when available, otherwise the
 * first letter of the name/username. Size + text size come from `className`.
 */
export function UserAvatar({ user, className }: { user: AvatarUser; className?: string }) {
  if (user?.photoUrl) {
    return (
      <img
        src={user.photoUrl}
        alt=""
        className={cn('shrink-0 rounded-full object-cover', className)}
      />
    );
  }
  const initial = (user?.firstName ?? user?.username ?? '?').charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-primary/15 font-medium text-primary',
        className,
      )}
    >
      {initial}
    </div>
  );
}
