"use client";
import { useParams, useSearchParams } from "next/navigation";
import LessonExperience from "@/components/learning/LessonExperience";
import LessonPreview from "@/components/learning/LessonPreview";
import { lessonPageMode } from "@/lib/lesson-page-mode";
export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const searchParams = useSearchParams();
  if (lessonPageMode({ isProduction: process.env.NODE_ENV === "production", preview: searchParams.get("preview") }) === "preview") {
    return <LessonPreview />;
  }
  return <LessonExperience key={lessonId} lessonId={lessonId} />;
}
