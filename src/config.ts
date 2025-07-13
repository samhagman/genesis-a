// src/config.ts
// Centralised configuration helpers for building API & WebSocket URLs
// This avoids hard-coding `localhost:8787` throughout the codebase and
// automatically adapts to production vs development environments.

/*
 * Usage examples:
 *   fetch(getApiUrl("/api/workflow/xyz"));
 *   const ws = new WebSocket(getWsUrl("/api/agents/chat/default"));
 *   const host = getApiHost();          // e.g. "localhost:8787" or "api.example.com"
 */

// Type for Vite's import.meta.env
interface ImportMetaEnv {
  [key: string]: string | undefined;
}

interface ImportMeta {
  env?: ImportMetaEnv;
}

// Helper to read env var in both browser (import.meta.env) and Node/Vitest (process.env)
function readEnv(key: string): string | undefined {
  // @ts-ignore -- Vite injects import.meta.env at build time in the browser
  if (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env) {
    const v = (import.meta as ImportMeta).env?.[key];
    if (typeof v === "string" && v.length) return v;
  }
  if (typeof process !== "undefined" && process.env) {
    const v = process.env[key];
    if (typeof v === "string" && v.length) return v;
  }
  return undefined;
}

// ----------------------------------------------------------------------------
// API helpers
// ----------------------------------------------------------------------------

export function getApiBaseUrl(): string {
  const envVal = readEnv("VITE_API_BASE_URL");
  if (envVal) return envVal.replace(/\/$/, ""); // strip trailing slash

  // Browser fallback – same origin (suitable when frontend is served by backend)
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  // Node/test fallback – assume dev backend default
  return "http://localhost:8787";
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function getApiHost(): string {
  return new URL(getApiBaseUrl()).host; // e.g. "localhost:8787"
}

// ----------------------------------------------------------------------------
// WebSocket helpers
// ----------------------------------------------------------------------------

export function getWsBaseUrl(): string {
  const envVal = readEnv("VITE_WS_BASE_URL");
  if (envVal) return envVal.replace(/\/$/, "");

  // Derive from API base by swapping protocol
  const api = getApiBaseUrl();
  if (api.startsWith("https:")) return api.replace(/^https:/, "wss:");
  return api.replace(/^http:/, "ws:");
}

export function getWsUrl(path: string): string {
  const base = getWsBaseUrl();
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
