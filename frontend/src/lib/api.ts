// This file talks to the FastAPI backend.
// Every other part of the frontend should call these functions
// instead of calling fetch() directly, so the API logic lives in one place.
//
// Login state lives in an httpOnly cookie the backend sets — never in
// localStorage or JS-readable state. That means:
// - Every request below passes credentials: "include" so the browser
//   attaches (and, on login, stores) that cookie.
// - There is no token to pass around here; the browser handles it.

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type User = {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  has_face_enrolled: boolean;
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
  const wsUrl = API_URL!.replace(/^http/, "ws");
  return `${wsUrl}/ws/monitor`;
}
