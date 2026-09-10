"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getQuiz, saveQuizResult, Quiz } from "@/lib/learning";

type PageProps = {
  params: Promise<{ quizId: string }>;
};

export default function QuizDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { quizId } = resolvedParams;

  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  // Quiz active state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    if (!user) return;
    const foundQuiz = getQuiz(quizId, user.email);
    setQuiz(foundQuiz);
    setLoading(false);
  }, [quizId, user]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-44 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!quiz) {
    notFound();
  }

  const currentQ = quiz.questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  function handleSelectOption(optIdx: number) {
    if (submittedAnswers[currentIndex]) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optIdx }));
  }

  function handleNextOrFinish() {
    if (!quiz) return;
    // Record answer submission
    setSubmittedAnswers((prev) => ({ ...prev, [currentIndex]: true }));

    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Calculate final score
      let correctCount = 0;
      quiz.questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctIndex) {
          correctCount++;
        }
      });
      const scorePct = Math.round((correctCount / quiz.questions.length) * 100);
      if (user) {
        saveQuizResult(quiz.id, scorePct, user.email);
      }
      setQuizFinished(true);
    }
  }

  function handleRetake() {
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setCurrentIndex(0);
    setQuizFinished(false);
    setReviewMode(false);
  }

  // Calculate results if finished
  if (quizFinished && !reviewMode) {
    let correctCount = 0;
    const strongAreas: string[] = [];
    const reviewAreas: string[] = [];

    quiz.questions.forEach((q, idx) => {
      const isCorrect = selectedAnswers[idx] === q.correctIndex;
      if (isCorrect) {
        correctCount++;
        if (!strongAreas.includes(q.topic)) strongAreas.push(q.topic);
      } else {
        if (!reviewAreas.includes(q.topic)) reviewAreas.push(q.topic);
      }
    });

    const scorePct = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = scorePct >= 75;

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
        {/* Results Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-xs ${
              passed ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}
          >
            {passed ? "🏆" : "📝"}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quiz Completed</h1>
            <p className="text-xs text-slate-500 mt-0.5">{quiz.title}</p>
          </div>

          <div className="py-3">
            <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono">
              {scorePct}%
            </span>
            <span className="text-xs text-slate-400 block mt-1">
              {correctCount} of {quiz.questions.length} questions answered correctly
            </span>
          </div>

          {/* Strong vs Review areas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Strong Areas
              </span>
              {strongAreas.length > 0 ? (
                <ul className="text-xs text-emerald-950 font-medium space-y-0.5">
                  {strongAreas.map((topic) => (
                    <li key={topic}>✓ {topic}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-slate-400">Needs improvement</span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Review Areas
              </span>
              {reviewAreas.length > 0 ? (
                <ul className="text-xs text-slate-700 font-medium space-y-0.5">
                  {reviewAreas.map((topic) => (
                    <li key={topic}>· {topic}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-emerald-600 font-bold">Flawless comprehension!</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setReviewMode(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Review Answers
            </button>

            <button
              type="button"
              onClick={handleRetake}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>

            <Link
              href={`/learn/courses/${quiz.courseId}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="space-y-2 pb-3 border-b border-slate-200/80">
        <Link
          href="/learn/quizzes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Assessment</span>
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">{quiz.title}</h1>
          <span className="text-xs font-mono font-semibold text-slate-400 shrink-0">
            {currentIndex + 1} / {quiz.questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            {currentQ.topic}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-2.5 leading-snug">
            {currentQ.prompt}
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentIndex] === idx;
            let style = "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800";

            if (reviewMode) {
              if (idx === currentQ.correctIndex) {
                style = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20";
              } else if (isSelected) {
                style = "border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-400/20";
              } else {
                style = "border-slate-100 text-slate-400";
              }
            } else if (isSelected) {
              style = "border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20";
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(idx)}
                disabled={reviewMode}
                className={`w-full p-4 rounded-xl border text-left text-xs sm:text-[13px] transition-all flex items-start gap-3 cursor-pointer ${style}`}
              >
                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="leading-relaxed">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation in review mode */}
        {reviewMode && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
            <span className="font-bold block">Explanation:</span>
            <p className="leading-relaxed">{currentQ.explanation}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={handleNextOrFinish}
            disabled={selectedAnswers[currentIndex] === undefined && !reviewMode}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {currentIndex === quiz.questions.length - 1
              ? reviewMode
                ? "Finish Review"
                : "Submit Quiz"
              : "Next Question"}
          </button>
        </div>
      </div>
    </div>
  );
}
