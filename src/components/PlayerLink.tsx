import { usePlayerModal } from "@/context/PlayerModalContext";
import { cn } from "@/lib/utils";
import React from "react";

export function PlayerLink({
  playerId,
  name,
  className,
  children,
  showIndicator = false,
}: {
  playerId?: string | null;
  name?: string | null;
  className?: string;
  children?: React.ReactNode;
  showIndicator?: boolean;
}) {
  const { openPlayerProfile } = usePlayerModal();

  const handleClick = (e: React.MouseEvent) => {
    if (!playerId) return;
    e.preventDefault();
    e.stopPropagation();
    openPlayerProfile(playerId);
  };

  if (!playerId) {
    return <span className={className}>{children ?? name ?? "Player"}</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Click to view ${name ?? "player"}'s tournament performance`}
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-left hover:text-emerald-500 hover:underline underline-offset-2 transition-colors cursor-pointer focus:outline-hidden",
        className
      )}
    >
      {children ?? name ?? "Player"}
      {showIndicator && (
        <span className="text-[10px] text-muted-foreground opacity-60 group-hover:opacity-100">
          ↗
        </span>
      )}
    </button>
  );
}
