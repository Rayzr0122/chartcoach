"use client";

import React from "react";

/**
 * 4-Square App Grid Icon matching the user's exact uploaded button reference
 */
export function BentoGridIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="2" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="2" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="2" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="2" />
    </svg>
  );
}
