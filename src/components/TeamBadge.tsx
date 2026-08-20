import { teamColor } from "@/lib/cricket";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/image-utils";

export function TeamBadge({
  shortName,
  logoUrl,
  size = "md",
  className,
}: {
  shortName?: string | null;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeCls =
    size === "sm"
      ? "h-8 w-8 text-[10px]"
      : size === "lg"
        ? "h-14 w-14 text-base"
        : size === "xl"
          ? "h-20 w-20 text-xl"
          : "h-10 w-10 text-xs";

  const directLogoUrl = normalizeImageUrl(logoUrl);

  if (directLogoUrl) {
    return (
      <img
        src={directLogoUrl}
        alt={shortName ?? "team"}
        className={cn("rounded-full object-cover border", sizeCls, className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white shadow-md",
        teamColor(shortName),
        sizeCls,
        className,
      )}
    >
      {(shortName ?? "?").slice(0, 3).toUpperCase()}
    </div>
  );
}
