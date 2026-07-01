import Image from "next/image";
import { resolveAvatarDisplaySrc } from "@/lib/storage/avatar-url";

const SIZE_CLASS = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
} as const;

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  ringClassName?: string;
}

export function ProfileAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
  ringClassName = "ring-blue-50",
}: ProfileAvatarProps) {
  const src = resolveAvatarDisplaySrc(avatarUrl);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-blue-100 ring-2 ${ringClassName} ${SIZE_CLASS[size]} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={`${name}'s profile photo`}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-bold text-blue-600">
          {initial}
        </div>
      )}
    </div>
  );
}
