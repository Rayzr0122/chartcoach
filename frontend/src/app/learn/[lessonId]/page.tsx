"use client";
import { useParams, useSearchParams } from "next/navigation";
import LessonExperience from "@/components/learning/LessonExperience";
import LessonPreview from "@/components/learning/LessonPreview";
export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "production" && searchParams.get("preview") === "1") {
    return <LessonPreview />;
  }
  return <LessonExperience key={lessonId} lessonId={lessonId} />;
}
