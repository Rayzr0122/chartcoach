"use client";

import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  collapsed?: boolean;
  className?: string;
  href?: string;
}

export function LogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 flex items-center justify-center ${className}`}>
      <img
        src="/assets/chartcoach_icon.png"
        alt="ChartCoach"
        className="w-full h-full object-contain select-none pointer-events-none"
      />
    </div>
  );
}

export default function ChartCoachLogo({
  size = "md",
  showText = true,
  collapsed = false,
  className = "",
  href = "/dashboard",
}: LogoProps) {
  const heightClasses = {
    sm: "h-6 sm:h-7",
    md: "h-7 sm:h-8",
    lg: "h-8 sm:h-9",
  };

  const content = (
    <div className={`flex items-center transition-opacity ${className}`}>
      {collapsed ? (
        <div className="w-10 h-10 flex items-center justify-center mx-auto">
          <img
            src="/assets/chartcoach_icon.png"
            alt="ChartCoach"
            className="w-8 h-8 object-contain select-none pointer-events-none"
          />
        </div>
      ) : (
        <img
          src="/assets/chartcoach logo final trimmed.png"
          alt="ChartCoach - Your Personal AI Coach"
          className={`${heightClasses[size]} w-auto max-w-[170px] object-contain select-none pointer-events-none`}
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center group">
        {content}
      </Link>
    );
  }

  return content;
}
