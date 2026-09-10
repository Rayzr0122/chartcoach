"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Lightbulb,
  AlertTriangle,
  Award,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getLesson,
  markLessonCompleteApi,
  Lesson,
  Course,
  CourseModule,
  ContentBlock,
} from "@/lib/learning";
import {
  fetchLessonDetail,
  syncLessonProgress,
  markLessonCompleteV1,
} from "@/lib/api";
import VideoPlayer from "@/components/learning/VideoPlayer";

type PageProps = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

type LessonDetailState = {
  course: Course;
  lesson: Lesson & { videoUrl?: string; thumbnailUrl?: string; durationSeconds?: number };
  module?: CourseModule;
  nextLesson: Lesson | null;
  prevLesson: Lesson | null;
};

export default function LessonDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { courseId, lessonId } = resolvedParams;

  const router = useRouter();
  const { user } = useAuth();

  const [lessonData, setLessonData] = useState<LessonDetailState | null>(null);
  const [userProgress, setUserProgress] = useState<{
    last_position_seconds?: number;
    watched_seconds?: number;
    completed?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Knowledge check state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const email = user?.email || "trader@chartcoach.com";
    const localData = getLesson(courseId, lessonId, email);

    if (localData && isMounted) {
      setLessonData(localData as LessonDetailState);
      setLoading(false);
    }

    // Fetch from backend API v1
    fetchLessonDetail(courseId, lessonId)
      .then((remoteDetail) => {
        if (!isMounted || !remoteDetail) return;

        const remoteLesson = remoteDetail.lesson as Record<string, unknown>;
        const localBlocks = localData?.lesson?.contentBlocks || [];
        const remoteBlocks = (remoteLesson.contentBlocks as ContentBlock[]) || [];
        const contentBlocks = remoteBlocks.length > 0 ? remoteBlocks : localBlocks;

        const remoteTakeaways = (remoteLesson.keyTakeaways as string[]) || [];
        const localTakeaways = localData?.lesson?.keyTakeaways || [];
        const keyTakeaways = remoteTakeaways.length > 0 ? remoteTakeaways : localTakeaways;

        const mergedLesson = {
          ...(localData?.lesson || {}),
          ...remoteLesson,
          contentBlocks,
          keyTakeaways,
          completed: Boolean(
            remoteDetail.userProgress?.completed ||
            localData?.lesson?.completed ||
            remoteLesson.completed
          ),
          videoUrl: (remoteLesson.videoUrl as string) || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          thumbnailUrl: (remoteLesson.thumbnailUrl as string) || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1280&q=80",
        } as LessonDetailState["lesson"];

        setLessonData({
          course: (remoteDetail.course || localData?.course) as Course,
          lesson: mergedLesson,
          module: (remoteDetail.module || localData?.module) as CourseModule,
          nextLesson: (remoteDetail.nextLesson || localData?.nextLesson) as Lesson | null,
          prevLesson: (remoteDetail.prevLesson || localData?.prevLesson) as Lesson | null,
        });

        if (remoteDetail.userProgress) {
          setUserProgress(remoteDetail.userProgress);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Could not fetch lesson detail v1:", err);
        if (isMounted) setLoading(false);
      });

    setSelectedOption(null);
    setIsAnswerSubmitted(false);

    return () => {
      isMounted = false;
    };
  }, [courseId, lessonId, user]);

  const handleProgressSync = useCallback(
    async (data: {
      lastPositionSeconds: number;
      watchedSeconds: number;
      durationSeconds: number;
      completed: boolean;
    }) => {
      try {
        await syncLessonProgress(courseId, lessonId, data);
      } catch (err) {
        console.warn("Progress sync error:", err);
      }
    },
    [courseId, lessonId]
  );

  const handleCompleteLesson = useCallback(async () => {
    try {
      await markLessonCompleteV1(courseId, lessonId);
    } catch (err) {
      console.warn("Failed marking complete via v1, running fallback:", err);
      const email = user?.email || "trader@chartcoach.com";
      markLessonCompleteApi(courseId, lessonId, email);
    }

    setLessonData((prev) =>
      prev ? { ...prev, lesson: { ...prev.lesson, completed: true } } : null
    );

    if (lessonData?.nextLesson?.id) {
      router.push(`/learn/courses/${courseId}/lessons/${lessonData.nextLesson.id}`);
    } else {
      router.push(`/learn/courses/${courseId}`);
    }
  }, [courseId, lessonId, lessonData?.nextLesson?.id, router, user?.email]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-10 w-3/4 bg-slate-200 rounded-xl" />
        <div className="aspect-video bg-slate-200 rounded-2xl" />
        <div className="h-40 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!lessonData) {
    notFound();
  }

  const { course, lesson, nextLesson, prevLesson } = lessonData;

  function handleCheckAnswer() {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-up pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="space-y-3 pb-4 border-b border-slate-200/80">
        <Link
          href={`/learn/courses/${course.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {course.title}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="font-bold text-blue-600">Lesson {lesson.order}</span>
            <span>·</span>
            <span>{lesson.durationMinutes} mins</span>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Course Progress: <strong className="text-blue-600 font-mono">{course.progressPercent}%</strong>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {lesson.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
          {lesson.summary}
        </p>
      </div>

      {/* Video Streaming Section with Resume & Sync */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lesson Video Stream</span>
          {lesson.completed && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <Check className="h-3 w-3" /> Completed
            </span>
          )}
        </div>
        <VideoPlayer
          videoUrl={lesson.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}
          thumbnailUrl={lesson.thumbnailUrl}
          lessonTitle={lesson.title}
          initialPositionSeconds={userProgress?.last_position_seconds || 0}
          durationSeconds={lesson.durationSeconds || (lesson.durationMinutes * 60) || 1080}
          onProgressSync={handleProgressSync}
          onVideoEnded={handleCompleteLesson}
        />
      </section>

      {/* Modular Content Blocks */}
      <article className="space-y-6 text-slate-800 leading-relaxed text-sm">
        {lesson.contentBlocks?.map((block, idx) => {
          if (block.type === "heading") {
            return (
              <h2 key={idx} className="text-lg font-bold text-slate-900 tracking-tight pt-2">
                {block.content}
              </h2>
            );
          }

          if (block.type === "paragraph") {
            return (
              <p key={idx} className="text-slate-700 leading-relaxed">
                {block.content}
              </p>
            );
          }

          if (block.type === "callout") {
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  block.variant === "rule"
                    ? "bg-blue-50/80 border-blue-200 text-blue-950"
                    : block.variant === "tip"
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                    : "bg-amber-50/80 border-amber-200 text-amber-950"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {block.variant === "rule" ? (
                    <Info className="w-5 h-5 text-blue-600" />
                  ) : block.variant === "tip" ? (
                    <Lightbulb className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider mb-1">{block.title}</h3>
                  <p className="text-xs sm:text-[13px] leading-relaxed opacity-95">{block.content}</p>
                </div>
              </div>
            );
          }

          if (block.type === "chart_figure") {
            return (
              <figure
                key={idx}
                className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="font-bold text-slate-300">{block.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded">
                    Visual Blueprint
                  </span>
                </div>

                {/* SVG Candlestick Blueprint */}
                <div className="py-6 flex items-center justify-center bg-slate-950/60 rounded-xl">
                  {block.patternType === "hammer" && (
                    <svg className="w-64 h-36" viewBox="0 0 200 120">
                      <path d="M 20 20 L 60 50 L 100 80" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                      <line x1="130" y1="50" x2="130" y2="105" stroke="#10b981" strokeWidth="2" />
                      <rect x="123" y="50" width="14" height="18" fill="#10b981" rx="2" />
                      <line x1="10" y1="105" x2="190" y2="105" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x="14" y="100" fill="#60a5fa" fontSize="9" fontWeight="bold">Key Support Floor</text>
                      <text x="142" y="70" fill="#34d399" fontSize="9" fontWeight="bold">Long Lower Wick (Rejection)</text>
                    </svg>
                  )}

                  {block.patternType === "support_resistance" && (
                    <svg className="w-64 h-36" viewBox="0 0 200 120">
                      <line x1="10" y1="60" x2="190" y2="60" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                      <path d="M 20 90 L 50 60 L 80 80 L 120 40 L 150 60 L 180 30" stroke="#10b981" strokeWidth="2.5" fill="none" />
                      <text x="15" y="52" fill="#60a5fa" fontSize="9" fontWeight="bold">Resistance flips to Support</text>
                    </svg>
                  )}

                  {block.patternType !== "hammer" && block.patternType !== "support_resistance" && (
                    <div className="text-center text-xs text-slate-400 py-6">
                      [Chart Pattern Schematic: {block.patternType}]
                    </div>
                  )}
                </div>

                <figcaption className="text-xs text-slate-400 text-center leading-relaxed">
                  {block.caption}
                </figcaption>
              </figure>
            );
          }

          if (block.type === "steps") {
            return (
              <div key={idx} className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">{block.title}</h3>
                <div className="space-y-2">
                  {block.steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {sIdx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Knowledge Check Section */}
        {lesson.knowledgeCheck && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 pt-6 mt-8">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-purple-50 text-purple-700">
                <Award className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700">
                Knowledge Check
              </h3>
            </div>

            <p className="font-bold text-slate-900 text-sm leading-relaxed">
              {lesson.knowledgeCheck.question}
            </p>

            <div className="space-y-2">
              {lesson.knowledgeCheck.options.map((option, optIdx) => {
                const isSelected = selectedOption === optIdx;
                let btnStyle = "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700";

                if (isAnswerSubmitted) {
                  if (optIdx === lesson.knowledgeCheck!.correctIndex) {
                    btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-2 ring-emerald-500/20";
                  } else if (isSelected) {
                    btnStyle = "border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-400/20";
                  } else {
                    btnStyle = "border-slate-100 bg-slate-50/50 text-slate-400";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => {
                      if (!isAnswerSubmitted) setSelectedOption(optIdx);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
                  >
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="leading-snug">{option}</span>
                  </button>
                );
              })}
            </div>

            {!isAnswerSubmitted ? (
              <button
                type="button"
                onClick={handleCheckAnswer}
                disabled={selectedOption === null}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Check Answer
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1 animate-fade-up">
                <span className="font-bold block">
                  {selectedOption === lesson.knowledgeCheck.correctIndex ? "✓ Correct!" : "Explanation:"}
                </span>
                <p className="leading-relaxed opacity-90">{lesson.knowledgeCheck.explanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Key Takeaways Card */}
        {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-3 mt-6">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Key Takeaways</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-700">
              {lesson.keyTakeaways.map((takeaway, tIdx) => (
                <li key={tIdx} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">·</span>
                  <span className="leading-relaxed">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* Lesson Completion Action */}
      <section className="pt-6 border-t border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {lesson.completed ? "Lesson Finished" : "Ready to progress?"}
            </span>
            <p className="text-[11px] text-slate-400">
              {lesson.completed
                ? "You have completed this lesson. Feel free to review or move on."
                : "Marking this lesson complete updates your course progress and unlocks the next module."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCompleteLesson}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          >
            <Check className="w-4 h-4" />
            <span>{lesson.completed ? "Save & Next Lesson" : "Mark Lesson Complete"}</span>
          </button>
        </div>

        {/* Bottom Prev / Next Navigation */}
        <div className="flex items-center justify-between pt-2 text-xs">
          {prevLesson ? (
            <Link
              href={`/learn/courses/${course.id}/lessons/${prevLesson.id}`}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold p-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous: {prevLesson.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link
              href={`/learn/courses/${course.id}/lessons/${nextLesson.id}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold p-2 ml-auto"
            >
              <span>Next: {nextLesson.title}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href={`/learn/courses/${course.id}`}
              className="inline-flex items-center gap-2 text-emerald-600 font-bold p-2 ml-auto"
            >
              <span>Finish Course</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
