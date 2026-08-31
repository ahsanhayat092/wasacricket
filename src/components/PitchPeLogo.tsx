import React from "react";
import { Link } from "react-router";

export type PitchPeLogoVariant = "auto" | "compact" | "primary" | "dark" | "light" | "white" | "mark";

interface PitchPeLogoProps {
  variant?: PitchPeLogoVariant;
  className?: string;
  linkTo?: string;
  alt?: string;
}

export function PitchPeLogo({
  variant = "compact",
  className = "h-8 w-auto",
  linkTo,
  alt = "PitchPe — Cricket Platform",
}: PitchPeLogoProps) {
  let content: React.ReactNode;

  if (variant === "compact" || variant === "auto") {
    // Theme-aware compact header logo:
    // Light Mode -> Green Icon + Dark Wordmark (#111827)
    // Dark Mode  -> Green Icon + White Wordmark (#FFFFFF)
    content = (
      <>
        <img
          src="/pitchpe-logo-compact-light.svg"
          alt={alt}
          className={`select-none object-contain dark:hidden block ${className}`}
          loading="eager"
        />
        <img
          src="/pitchpe-logo-compact.svg"
          alt={alt}
          className={`select-none object-contain dark:block hidden ${className}`}
          loading="eager"
        />
      </>
    );
  } else if (variant === "primary") {
    // Theme-aware horizontal primary logo:
    content = (
      <>
        <img
          src="/pitchpe-logo-primary.svg"
          alt={alt}
          className={`select-none object-contain dark:hidden block ${className}`}
          loading="eager"
        />
        <img
          src="/pitchpe-logo-dark.svg"
          alt={alt}
          className={`select-none object-contain dark:block hidden ${className}`}
          loading="eager"
        />
      </>
    );
  } else {
    const getSingleAssetPath = () => {
      switch (variant) {
        case "dark":
          return "/pitchpe-logo-compact.svg";
        case "light":
          return "/pitchpe-logo-compact-light.svg";
        case "white":
          return "/pitchpe-logo-white.svg";
        case "mark":
          return "/pitchpe-logo-mark.svg";
        default:
          return "/pitchpe-logo-compact.svg";
      }
    };

    content = (
      <img
        src={getSingleAssetPath()}
        alt={alt}
        className={`select-none object-contain ${className}`}
        loading="eager"
      />
    );
  }

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-flex items-center group transition-transform active:scale-95 focus:outline-none shrink-0"
      >
        {content}
      </Link>
    );
  }

  return <>{content}</>;
}
