import Link from "next/link";
import { ArrowRight, BookOpen, Check, CirclePlay } from "lucide-react";
import { DashboardData } from "@/lib/learning";

type GettingStartedCardProps = {
  currentLearning: DashboardData["currentLearning"];
  lessonsCompleted: number;
};

export default function GettingStartedCard({ currentLearning, lessonsCompleted }: GettingStartedCardProps) {
  const hasStarted = lessonsCompleted > 0;
  const lessonHref = currentLearning
    ? `/learn/courses/${currentLearning.courseId}/lessons/${currentLearning.lessonId}`
    : "/learn/courses";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-5 text-white shadow-[0_20px_45px_-22px_rgba(37,99,235,0.75)] sm:p-6">
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-blue-50 ring-1 ring-white/15">
            <BookOpen className="h-3.5 w-3.5" />
            Your learning plan
          </span>
          <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold text-emerald-50 ring-1 ring-emerald-200/20">
            {hasStarted ? "You’re on your way" : "A fresh start"}
          </span>
        </div>

        <h2 className="mt-5 text-xl font-extrabold tracking-tight sm:text-2xl">
          {hasStarted ? "One focused session is enough for today." : "Your trading learning starts here."}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">
          {hasStarted
            ? "Keep building the habits that make practice feel clear and consistent."
            : "Start with the basics, practise at your own pace, and grow your confidence one step at a time."}
        </p>

        <div className="mt-5 grid gap-2.5 text-xs sm:grid-cols-3">
          {["Learn a simple idea", "See it on a chart", "Practise without risk"].map((step, index) => (
            <div key={step} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">{index + 1}</span>
              <span className="font-medium text-white">{step}</span>
              {index === 0 && hasStarted && <Check className="ml-auto h-3.5 w-3.5 text-emerald-300" />}
            </div>
          ))}
        </div>

        <Link href={lessonHref} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-50">
          <CirclePlay className="h-4 w-4" />
          {hasStarted ? "Continue learning" : "Start your first lesson"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
