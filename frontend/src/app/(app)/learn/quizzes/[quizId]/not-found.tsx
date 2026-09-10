import Link from "next/link";
import { ClipboardX, ArrowLeft } from "lucide-react";

export default function QuizNotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <ClipboardX className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Quiz Not Found</h2>
      <p className="text-xs text-slate-500">
        The assessment you are looking for does not exist or has not been made available yet.
      </p>
      <Link
        href="/learn/quizzes"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Quizzes</span>
      </Link>
    </div>
  );
}
