import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * User avatar: shows the Telegram profile photo when available, otherwise the
 * first letter of the name. Falls back to the initial if the image fails to load.
 */
export function UserAvatar({
  photoUrl,
  name,
  className,
}: {
  photoUrl?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? '?').charAt(0).toUpperCase();
  const showImage = photoUrl && !failed;

  return (
    <div
      className={cn(
        'grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-sm font-medium text-primary',
        className,
      )}
      title={name ?? ''}
    >
      {showImage ? (
        <img
          src={photoUrl}
          alt={name ?? ''}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
