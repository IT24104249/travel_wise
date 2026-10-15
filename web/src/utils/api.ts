import { createClient } from "@supabase/supabase-js";
import { Role } from "../types";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5127";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  role: Role = "User",
  userId: string = ""
): Promise<T> {
  const token = localStorage.getItem("travelwise_access_token");
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(role ? { "X-User-Role": role } : {}),
    ...(userId ? { "X-User-Id": userId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(`The TravelWise API is unavailable at ${API_BASE}. Start the ASP.NET Core API and try again.`);
  }

  if (response.status === 204) return {} as T;
  const text = await response.text();
  let payload: any = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    if (payload && typeof payload === "object") {
      if ("error" in payload && payload.error) {
        errorMsg = String(payload.error);
      } else if ("detail" in payload && payload.detail) {
        errorMsg = String(payload.detail);
      } else if ("errors" in payload && typeof payload.errors === "object") {
        errorMsg = Object.values(payload.errors).flat().join(" ");
      } else if ("title" in payload && payload.title) {
        errorMsg = String(payload.title);
      }
    } else if (typeof payload === "string" && payload.trim()) {
      errorMsg = payload.trim();
    }
    throw new Error(errorMsg);
  }

  return payload as T;
}
