import React, { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/image-utils";

interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
  "2xl": "h-28 w-28 text-2xl",
};

export function PlayerAvatar({ name, photoUrl, size = "md", className }: PlayerAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the photo URL changes
  React.useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const directImageUrl = normalizeImageUrl(photoUrl);

  return (
    <div
      className={cn(
        sizeClasses[size],
        "relative rounded-full border border-border/50 shrink-0 font-bold overflow-hidden flex items-center justify-center bg-primary/10 text-primary",
        className
      )}
    >
      {directImageUrl && !hasError ? (
        <img
          src={directImageUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="font-bold select-none">
          {initials || <User className="h-4 w-4" />}
        </span>
      )}
    </div>
  );
}

