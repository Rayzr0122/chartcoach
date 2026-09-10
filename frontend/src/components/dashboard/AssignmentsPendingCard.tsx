"use client";

import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

export default function AssignmentsPendingCard() {
  const assignments = [
    {
      id: "assign-1",
      title: "Trading 101 Foundations Quiz",
      subtitle: "A short check-in · 4 questions",
      isPending: true,
      cardBg: "bg-[#FEFCE8] border-amber-200/80 hover:border-amber-300",
      iconBg: "bg-[#F59E0B]",
      href: "/learn/quizzes/quiz-trading-101",
    },
    {
      id: "assign-2",
      title: "Chart Reading 101 Knowledge Check",
      subtitle: "Completed · Nice work",
      isPending: false,
      cardBg: "bg-white border-slate-100 hover:border-slate-200",
      iconBg: "bg-[#3B82F6]",
      href: "/learn/quizzes/quiz-chart-reading-101",
    },
    {
      id: "assign-3",
      title: "Reading the Market Structure Challenge",
      subtitle: "Completed · Nice work",
      isPending: false,
      cardBg: "bg-white border-slate-100 hover:border-slate-200",
      iconBg: "bg-[#3B82F6]",
      href: "/learn/quizzes/quiz-reading-the-market",
    },
  ];

  return (
    <section className="space-y-3.5">
      {/* Section Header matching reference */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-slate-800 tracking-tight">
          Quick practice
        </h3>
        <Link
          href="/learn/quizzes"
          className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors"
        >
          See all
        </Link>
      </div>

      {/* Stacked Assignment Cards matching reference */}
      <div className="space-y-3">
        {assignments.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`group flex items-center justify-between p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${item.cardBg}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl ${item.iconBg} text-white flex items-center justify-center shrink-0 shadow-xs`}
              >
                <FileText className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                  {item.subtitle}
                </p>
              </div>
            </div>

            <div className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all pl-2 shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
