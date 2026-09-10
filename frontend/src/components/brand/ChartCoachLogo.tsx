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
    <div className={`relative shrink-0 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* 4 Ascending Vibrant Blue Bars */}
        <rect x="2" y="18" width="5" height="11" rx="2.5" fill="#2563EB" />
        <rect x="9.5" y="13" width="5" height="16" rx="2.5" fill="#2563EB" />
        <rect x="17" y="8" width="5" height="21" rx="2.5" fill="#2563EB" />
        <rect x="24.5" y="3" width="5" height="26" rx="2.5" fill="#2563EB" />
      </svg>
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
  const iconSizeClasses = {
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const content = (
    <div className={`flex items-center gap-2.5 transition-opacity ${className}`}>
      <LogoIcon className={iconSizeClasses[size]} />

      {showText && !collapsed && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold tracking-tight text-slate-900 ${textClasses[size]}`}>
            ChartCoach
          </span>
          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
            Learn. Analyse. Trade Smarter.
          </span>
        </div>
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
