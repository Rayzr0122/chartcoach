import Link from "next/link";
import { BookX, ArrowLeft } from "lucide-react";

export default function CourseNotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <BookX className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Course Not Found</h2>
      <p className="text-xs text-slate-500">
        The masterclass you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/learn/courses"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Courses</span>
      </Link>
    </div>
  );
}
