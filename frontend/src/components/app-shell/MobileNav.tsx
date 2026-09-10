"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Route, User } from "lucide-react";
import { BentoGridIcon } from "@/components/brand/Icons";

export default function MobileNav() {
  const pathname = usePathname();

  const items = [
    {
      label: "Home",
      href: "/dashboard",
      icon: BentoGridIcon,
      exact: true,
    },
    {
      label: "Courses",
      href: "/learn/courses",
      icon: Library,
      exact: false,
    },
    {
      label: "Path",
      href: "/learn/path",
      icon: Route,
      exact: true,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: User,
      exact: true,
    },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2 flex items-center justify-around"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors ${
              active ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-slate-400"}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
