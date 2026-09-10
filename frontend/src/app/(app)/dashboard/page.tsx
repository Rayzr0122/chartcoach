"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDashboardData, DashboardData } from "@/lib/learning";
import { fetchDashboard, DashboardDTO } from "@/lib/api";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [liveDto, setLiveDto] = useState<DashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const dto = await fetchDashboard();
        if (isMounted) {
          // Flush stale localStorage mock courses if user has 0 enrollments on backend
          try {
            if (typeof window !== "undefined" && user?.email) {
              const coursesKey = `chartcoach_${user.email}_courses`;
              if (dto.learningSummary?.lessonsCompleted === 0 && !dto.continueLearning?.hasActiveLearning) {
                localStorage.removeItem(coursesKey);
                localStorage.removeItem(`chartcoach_${user.email}_activities`);
              }
            }
          } catch {
            // Ignore
          }
          setLiveDto(dto);
        }
      } catch (err) {
        console.warn("Failed to fetch /api/v1/dashboard, falling back:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user, authLoading, router]);

  // If live DTO is available, format into DashboardData
  let data: DashboardData | null = null;

  if (liveDto && user) {
    const cl = liveDto.continueLearning;
    const ls = liveDto.learningSummary;
    const activeCourse = cl?.course;
    const activeLesson = cl?.lesson;

    data = {
      user: {
        name: liveDto.user.fullName || user.full_name || "Trader",
        email: liveDto.user.email || user.email,
      },
      currentLearning: activeCourse && activeLesson ? {
        courseId: activeCourse.id,
        courseTitle: activeCourse.title,
        lessonId: activeLesson.id,
        lessonTitle: activeLesson.title,
        lessonNumber: activeLesson.lessonNumber,
        totalLessons: activeCourse.totalLessons || 14,
        progressPercent: activeLesson.progressPercentage || 0,
      } : null,
      stats: {
        lessonsCompleted: ls.lessonsCompleted,
        totalLessons: ls.totalLessons,
        coursesCompleted: ls.coursesCompleted,
        learningStreak: ls.learningStreak,
        learningTimeMinutes: ls.learningTimeMinutes,
        practiceScore: ls.lessonsCompleted > 0 ? ls.progressScore : "—",
      },
      progress: liveDto.curriculumProgress.map((cp) => ({
        courseId: cp.courseId,
        title: cp.title,
        percent: cp.percent,
        completedLessons: cp.completedLessons,
        totalLessons: cp.totalLessons,
      })),
      recommendedNext: activeCourse && activeLesson ? {
        title: `Continue with ${activeLesson.title}`,
        description: `You're currently in ${activeCourse.title}. Complete this lesson to maintain your learning streak.`,
        actionLabel: "Continue Lesson",
        courseId: activeCourse.id,
        lessonId: activeLesson.id,
      } : {
        title: "Start with Trading 101",
        description: "Begin your trading journey with market foundations and core principles.",
        actionLabel: "Start Course",
        courseId: "trading-101",
        lessonId: "t101-l1",
      },
      recentActivity: liveDto.recentActivities.map((act) => ({
        id: act.id,
        title: act.title,
        subtitle: act.subtitle || "Lesson activity",
        timeAgo: act.timeAgo,
        type: (act.type === "quiz_completed" || act.type === "course_started" ? act.type : "lesson_completed"),
        timestamp: act.timestamp || Date.now(),
      })),
      upNextLessons: cl?.upNext || [],
      marketTicker: liveDto.marketTicker,
      marketOverview: liveDto.marketOverview,
      hasActiveLearning: cl?.hasActiveLearning ?? false,
    };
  }

  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-64 bg-slate-200 rounded-2xl" />
            <div className="h-48 bg-slate-200 rounded-2xl" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-96 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeData = data || getDashboardData(user.full_name || "Trader", user.email);

  // Natural greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (liveDto?.user.fullName || user.full_name || "Trader").split(" ")[0];

  return (
    <DashboardWorkspace data={activeData} firstName={firstName} greeting={timeGreeting} />
  );
}

