// This file talks to the FastAPI backend.
// Every other part of the frontend should call these functions
// instead of calling fetch() directly, so the API logic lives in one place.
//
// Login state lives in an httpOnly cookie the backend sets — never in
// localStorage or JS-readable state. That means:
// - Every request below passes credentials: "include" so the browser
//   attaches (and, on login, stores) that cookie.
// - There is no token to pass around here; the browser handles it.

type BrowserLocation = Pick<Location, "protocol" | "hostname">;

export function resolveApiUrl(configured: string | undefined, location?: BrowserLocation): string {
  if (configured?.trim()) return configured.trim().replace(/\/$/, "");
  const browser = location ?? (typeof window === "undefined" ? undefined : window.location);
  if (browser) return `${browser.protocol}//${browser.hostname}:8000`;
  return "http://127.0.0.1:8000";
}

const API_URL = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

export type User = {
  id: number | string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  has_face_enrolled: boolean;
  avatar_url?: string;
  subscription_plan?: string;
  subscription_status?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Reads the error message FastAPI sends back, or falls back to a generic one
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();

    if (data?.error?.message && typeof data.error.message === "string") {
      return data.error.message;
    }

    if (typeof data.detail === "string") return data.detail;

    // FastAPI sends validation errors (HTTP 422) as a list of objects
    // instead of a plain string, e.g. [{ msg: "...", loc: [...] }]
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const first = data.detail[0];
      if (typeof first?.msg === "string") return first.msg;
    }

    return "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export async function registerUser(email: string, fullName: string, password: string): Promise<User> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, full_name: fullName, password }),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function loginUser(email: string, password: string): Promise<void> {
  // The backend expects form data here (OAuth2 standard), not JSON
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  // The login cookie is now set by the browser — nothing else to do here.
}

export async function faceLogin(email: string, images: string[]): Promise<void> {
  // The email turns this into a 1:1 face check against just that one
  // account, instead of a slower, less accurate search across everyone.
  // images is a burst of frames spanning one blink, verified server-side.
  const response = await fetch(`${API_URL}/auth/face-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, images_base64: images }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await fetch(`${API_URL}/users/me`, { credentials: "include" });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function enrollFace(imagesBase64: string[]): Promise<void> {
  // One photo per sample — no blink needed, since this only runs inside an
  // already-logged-in session (see the note on FaceCapture for why).
  const response = await fetch(`${API_URL}/face/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images_base64: imagesBase64 }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
}

export async function removeFace(): Promise<void> {
  const response = await fetch(`${API_URL}/face/enroll`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
}

export function getMonitorSocketUrl(): string {
  // The login cookie rides along automatically on this connection too,
  // since it is same-site with the backend.
  const wsUrl = (API_URL || "http://127.0.0.1:8001").replace(/^http/, "ws");
  return `${wsUrl}/ws/monitor`;
}

// ─── API V1 TYPED DTOs & SERVICES ───

export type ContinueLearningDTO = {
  status?: "ready" | "empty" | "completed" | string;
  hasActiveLearning: boolean;
  course?: {
    id: string;
    title: string;
    slug: string;
    levelName: string;
    levelNumber: number;
    totalLessons?: number;
  } | null;
  lesson?: {
    id: string;
    courseId: string;
    title: string;
    lessonNumber: number;
    durationMinutes: number;
    durationSeconds: number;
    progressPercentage: number;
    lastPositionSeconds?: number;
    summary: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  } | null;
  instructor?: {
    name: string;
    role: string;
    avatarUrl?: string | null;
  } | null;
  upNext: Array<{
    id: string;
    courseId: string;
    title: string;
    order: number;
    durationMinutes: number;
    isAccessible: boolean;
  }>;
  progress?: Record<string, unknown> | null;
  recommendedCourse?: {
    id: string;
    title: string;
    slug?: string;
    levelName?: string;
    lessonCount?: number;
    durationLabel?: string;
    description?: string;
  } | null;
};

export type CourseUserStateDTO = {
  enrolled: boolean;
  progressPercentage: number;
  status: "not_enrolled" | "in_progress" | "completed" | string;
  completedLessons: number;
  totalLessons: number;
  lastAccessedLessonId?: string | null;
};

export type CourseCatalogItemDTO = {
  id: string;
  title: string;
  tagline?: string;
  description?: string;
  level: string;
  levelNumber: number;
  levelName: string;
  lessonCount: number;
  durationHours: number;
  durationLabel: string;
  instructor?: Record<string, unknown> | null;
  modules?: Array<{
    id: string;
    title: string;
    description?: string;
    lessons: Array<{
      id: string;
      title: string;
      order?: number;
      durationMinutes?: number;
      completed?: boolean;
    }>;
  }>;
  userState: CourseUserStateDTO;
};

export type EnrollmentDTO = {
  id: string;
  courseId: string;
  status: string;
  progressPercentage: number;
  enrolledAt: string;
};

export type LearningSummaryDTO = {
  lessonsCompleted: number;
  totalLessons: number;
  coursesCompleted: number;
  totalCourses: number;
  completionPercentage: number;
  learningStreak: number;
  learningTimeMinutes: number;
  activeStage: string;
  progressScore: string;
};

export type CourseProgressDTO = {
  courseId: string;
  title: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  isEnrolled: boolean;
  levelNumber: number;
};

export type LearningActivityDTO = {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  timeAgo: string;
  timestamp: number;
};

export type MarketQuoteDTO = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
};

export type MarketOverviewDTO = {
  marketStatus: "OPEN" | "CLOSED" | "PRE_OPEN";
  marketBreadth: { advances: number; declines: number; unchanged: number };
  vix: number;
  topGainer: MarketQuoteDTO | null;
  topLoser: MarketQuoteDTO | null;
  timestamp: string;
};

export type AnnouncementDTO = {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "feature";
  createdAt: string;
  isDismissible: boolean;
};

export type DashboardDTO = {
  user: {
    id: string;
    publicUserId: string;
    fullName: string;
    email: string;
    role: string;
    hasFaceEnrolled: boolean;
  };
  continueLearning: ContinueLearningDTO;
  learningSummary: LearningSummaryDTO;
  curriculumProgress: CourseProgressDTO[];
  recentActivities: LearningActivityDTO[];
  marketTicker: MarketQuoteDTO[];
  marketOverview: MarketOverviewDTO;
  announcements: AnnouncementDTO[];
  entitlements: {
    canAccessLiveStream: boolean;
    canAccessSim: boolean;
    tier: string;
  };
};

export type LessonDetailDTO = {
  course: Record<string, unknown>;
  module?: Record<string, unknown> | null;
  lesson: Record<string, unknown>;
  prevLesson?: Record<string, unknown> | null;
  nextLesson?: Record<string, unknown> | null;
  userProgress?: {
    lesson_id: string;
    course_id: string;
    duration_seconds: number;
    last_position_seconds: number;
    watched_seconds: number;
    progress_percentage: number;
    completed: boolean;
  } | null;
};

export type LessonProgressOut = {
  status: string;
  courseId: string;
  lessonId: string;
  progressPercentage: number;
  completed: boolean;
  totalCompletedLessons: number;
};

export async function fetchDashboard(): Promise<DashboardDTO> {
  const response = await fetch(`${API_URL}/api/v1/dashboard`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export type ChartPointDTO = {
  time: string;
  value: number;
};

export type LiveMarketOverviewDTO = {
  primarySymbol: string;
  primaryName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  chartPoints: ChartPointDTO[];
};

export async function fetchMarketTicker(): Promise<MarketQuoteDTO[]> {
  const response = await fetch(`${API_URL}/api/v1/market/ticker`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function fetchLiveMarketOverview(symbol: string = "NIFTY 50"): Promise<LiveMarketOverviewDTO> {
  const response = await fetch(`${API_URL}/api/v1/market/overview?symbol=${encodeURIComponent(symbol)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function fetchContinueLearning(): Promise<ContinueLearningDTO> {
  const response = await fetch(`${API_URL}/api/v1/learning/continue`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function fetchLearningSummary(): Promise<LearningSummaryDTO> {
  const response = await fetch(`${API_URL}/api/v1/learning/summary`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function fetchCurriculumProgress(): Promise<CourseProgressDTO[]> {
  const response = await fetch(`${API_URL}/api/v1/learning/progress`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function fetchLessonDetail(courseId: string, lessonId: string): Promise<LessonDetailDTO> {
  const response = await fetch(`${API_URL}/api/v1/learning/courses/${courseId}/lessons/${lessonId}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function syncLessonProgress(
  courseId: string,
  lessonId: string,
  data: {
    currentPositionSeconds?: number;
    lastPositionSeconds?: number;
    watchedSeconds?: number;
    durationSeconds?: number;
    completed?: boolean;
  }
): Promise<LessonProgressOut> {
  const response = await fetch(`${API_URL}/api/v1/learning/courses/${courseId}/lessons/${lessonId}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function markLessonCompleteV1(
  courseId: string,
  lessonId: string
): Promise<LessonProgressOut> {
  const response = await fetch(`${API_URL}/api/v1/learning/courses/${courseId}/lessons/${lessonId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function enrollInCourse(courseId: string): Promise<EnrollmentDTO> {
  const response = await fetch(`${API_URL}/api/v1/courses/${courseId}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

export async function fetchCourseCatalog(): Promise<CourseCatalogItemDTO[]> {
  const response = await fetch(`${API_URL}/api/v1/courses`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json();
}

// ─── Polygon.io & TradingView Lightweight Charts API ─────────────────────────

export type TradingViewBar = {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  value: number;
};

export type PolygonQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  is_positive: boolean;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
  updated_at: number;
};

export type PolygonHistory = {
  symbol: string;
  name: string;
  timeframe: string;
  bars: TradingViewBar[];
  current_price: number;
  change: number;
  change_percent: number;
  is_positive: boolean;
  high_period: number;
  low_period: number;
  source: string;
};

export async function fetchPolygonHistory(
  symbol: string,
  timeframe: string = "1D",
  signal?: AbortSignal
): Promise<PolygonHistory> {
  const clean = encodeURIComponent(symbol.trim().replace(" ", "").toUpperCase());
  const tf = encodeURIComponent(timeframe.trim().toUpperCase());
  const response = await fetch(
    `${API_URL}/api/v1/market/polygon/history?symbol=${clean}&timeframe=${tf}`,
    { credentials: "include", cache: "no-store", signal }
  );

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return response.json();
}

export async function fetchPolygonQuote(
  symbol: string,
  signal?: AbortSignal
): Promise<PolygonQuote> {
  const clean = encodeURIComponent(symbol.trim().replace(" ", "").toUpperCase());
  const response = await fetch(
    `${API_URL}/api/v1/market/polygon/quote?symbol=${clean}`,
    { credentials: "include", cache: "no-store", signal }
  );

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return response.json();
}

export async function fetchPolygonWatchlist(
  signal?: AbortSignal
): Promise<PolygonQuote[]> {
  const response = await fetch(`${API_URL}/api/v1/market/polygon/watchlist`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return response.json();
}

export async function fetchPolygonTicker(
  signal?: AbortSignal
): Promise<PolygonQuote[]> {
  const response = await fetch(`${API_URL}/api/v1/market/polygon/ticker`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return response.json();
}

export type LiveTick = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  is_positive: boolean;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
  tick_direction: "up" | "down" | "flat";
  timestamp: number;
};

export async function fetchPolygonTick(
  symbol: string,
  signal?: AbortSignal
): Promise<LiveTick> {
  const clean = encodeURIComponent(symbol.trim().replace(" ", "").toUpperCase());
  const response = await fetch(`${API_URL}/api/v1/market/polygon/tick?symbol=${clean}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return response.json();
}

export function getPolygonStreamUrl(symbols: string[] = ["NVDA", "AAPL", "TSLA", "SPY", "MSFT", "AMZN", "INFY"]): string {
  return `${API_URL}/api/v1/market/polygon/stream?symbols=${encodeURIComponent(symbols.join(","))}`;
}



