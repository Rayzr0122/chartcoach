"use client";
import { useParams } from "next/navigation";
import LessonExperience from "@/components/learning/LessonExperience";
export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  return <LessonExperience key={lessonId} lessonId={lessonId} />;
}
