"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, CheckCircle2, Play, ArrowRight, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getQuizzes, Quiz } from "@/lib/learning";

export default function QuizzesPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    if (!user) return;
    setQuizzes(getQuizzes(user.email));
  }, [user]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up max-w-4xl mx-auto">
      {/* Header */}
      <header className="space-y-1.5 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <ClipboardCheck className="w-4 h-4" />
          <span>Knowledge Assessments</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Curriculum Quizzes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
          Validate your chart reading and risk comprehension. Passing quizzes with 80%+ certifies mastery of that curriculum level.
        </p>
      </header>

      {/* Quizzes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  {quiz.questionCount} Questions
                </span>

                {quiz.completed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Best: {quiz.bestScore}%</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">Not started</span>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{quiz.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {quiz.description}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">~10-15 mins</span>

              <Link
                href={`/learn/quizzes/${quiz.id}`}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  quiz.completed
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                }`}
              >
                {quiz.completed ? (
                  <>
                    <span>Retake</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Take Quiz</span>
                  </>
                )}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
