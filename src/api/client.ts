import { Platform } from "react-native";
import Constants from "expo-constants";

import { Session } from "@/api/session";

/**
 * The one door to the Fajr Academy server (the same /api routes the website uses).
 *
 *   const data = await api.get<{ success: boolean; items: Item[] }>("/api/student-portal/classes", { month: "2026-11" });
 *   await api.post("/api/student-portal/feedback", { rating: 5 });
 *
 * - A 2xx reply resolves with the parsed JSON body.
 * - Anything else throws ApiError, whose `message` is the server's own message when it sent one
 *   and a plain-language fallback otherwise, so screens can show `errorMessage(e)` directly.
 * - A 401 on a normal endpoint means the session ended: the app signs out and returns to the login screen.
 */

const DEFAULT_API_URL = "https://app.fajracademy.io";

/** On the web test build the pages are served from the same origin as the API */
export const API_URL: string =
  Platform.OS === "web" ? "" : String((Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl || DEFAULT_API_URL).replace(/\/+$/, "");

/** The public website address, for links that open in the browser (payment pages, verification pages, files) */
export const SITE_URL = DEFAULT_API_URL;

/** Turns a site path ("/verify?id=1") or a full URL into a full URL */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export class ApiError extends Error {
  /** HTTP status; 0 when the server could not be reached at all */
  status: number;
  /** The parsed JSON body of the error reply, when there was one */
  data: any;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

/** A message fit to show to the person, whatever was thrown */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type Params = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Params;
  /** A plain object (sent as JSON) or FormData (sent as multipart) */
  body?: unknown;
  headers?: Record<string, string>;
  /** Milliseconds before giving up. Default 25 s (60 s for uploads). */
  timeoutMs?: number;
  /** Set for sign-in style calls where a 401 is an answer ("wrong password"), not an ended session */
  keepSessionOn401?: boolean;
  /** Let the system cookie store send and keep cookies for this call (the sign-in fallback) */
  useCookieJar?: boolean;
  signal?: AbortSignal;
}

export interface RawReply<T = any> {
  status: number;
  ok: boolean;
  data: T | null;
  headers: Headers;
}

let onSessionEnded: (() => void) | null = null;

/** The auth layer registers what to do when the server says the session is over */
export function setSessionEndedHandler(handler: (() => void) | null) {
  onSessionEnded = handler;
}

function buildUrl(path: string, params?: Params): string {
  let url = /^https?:\/\//i.test(path) ? path : `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  if (params) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
    if (parts.length) url += (url.includes("?") ? "&" : "?") + parts.join("&");
  }
  return url;
}

function statusMessage(status: number): string {
  if (status === 401) return "Your session has ended. Please sign in again.";
  if (status === 403) return "You do not have access to this.";
  if (status === 404) return "This was not found on the server.";
  if (status === 413) return "That file is too large.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "The server had a problem. Please try again in a moment.";
  return `The request failed (${status}). Please try again.`;
}

/**
 * The low-level call: never throws for an HTTP status, only when the server cannot be reached.
 * Use it when the screen needs the status code itself (e.g. 403 hides a feature, 429 carries a retry time).
 */
export async function apiRaw<T = any>(path: string, options: RequestOptions = {}): Promise<RawReply<T>> {
  const { method = "GET", params, body, headers: extraHeaders, keepSessionOn401, signal } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = { Accept: "application/json", ...(extraHeaders ?? {}) };
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  const mode = Session.mode();
  const token = Session.token();
  // Token mode: the app sends the cookie itself and keeps the system cookie store out of it,
  // so signing out is final even when the phone is offline.
  const useJar = Platform.OS === "web" || mode === "jar" || options.useCookieJar === true;
  if (!useJar && token) headers.Cookie = `auth_token=${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? (isForm ? 60000 : 25000));
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort());
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      credentials: useJar ? "include" : "omit",
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw new ApiError("Cancelled.", 0);
    if ((error as { name?: string } | null)?.name === "AbortError") {
      throw new ApiError("The server took too long to answer. Check your internet connection and try again.", 0);
    }
    throw new ApiError("Could not reach Fajr Academy. Check your internet connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }

  let data: T | null = null;
  try {
    const text = await response.text();
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }

  if (response.status === 401 && !keepSessionOn401 && (token || mode === "jar")) {
    onSessionEnded?.();
  }

  return { status: response.status, ok: response.ok, data, headers: response.headers };
}

export async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const reply = await apiRaw<T>(path, options);
  if (!reply.ok) {
    const serverMessage = (reply.data as { message?: unknown; error?: unknown } | null)?.message;
    const message = typeof serverMessage === "string" && serverMessage.trim() ? serverMessage : statusMessage(reply.status);
    throw new ApiError(message, reply.status, reply.data);
  }
  if (reply.data === null) throw new ApiError("The server sent an answer the app could not read.", reply.status);
  return reply.data;
}

export const api = {
  get: <T = any>(path: string, params?: Params, options?: Omit<RequestOptions, "method" | "params" | "body">) => request<T>(path, { ...options, method: "GET", params }),
  post: <T = any>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) => request<T>(path, { ...options, method: "POST", body: body ?? {} }),
  put: <T = any>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) => request<T>(path, { ...options, method: "PUT", body: body ?? {} }),
  patch: <T = any>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) => request<T>(path, { ...options, method: "PATCH", body: body ?? {} }),
  /** DELETE with query parameters and, when the route wants one, a JSON body */
  delete: <T = any>(path: string, params?: Params, body?: unknown, options?: Omit<RequestOptions, "method" | "params" | "body">) =>
    request<T>(path, { ...options, method: "DELETE", params, body }),
};

/** Pulls the login token out of a Set-Cookie header ("auth_token=...; Path=/; HttpOnly, other=...") */
export function readAuthCookie(headers: Headers): string | null {
  const raw = headers.get("set-cookie");
  if (!raw) return null;
  const match = raw.match(/(?:^|[,;\s])auth_token=([^;,\s]+)/);
  const value = match?.[1];
  return value && value !== "deleted" ? value : null;
}
