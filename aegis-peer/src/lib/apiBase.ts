// /aegis-peer/src/lib/apiBase.ts

// Normal API base (dev default uses Vite proxy)
const rawApiBase = import.meta.env.VITE_API_BASE_URL ?? "/api";
const apiBase = rawApiBase.endsWith("/") ? rawApiBase.slice(0, -1) : rawApiBase;

// Stream/SSE base — bypasses Vite proxy for stability on Windows.
// Set VITE_STREAM_BASE_URL in .env to override (e.g. in production).
const streamBase = import.meta.env.VITE_STREAM_BASE_URL ?? "http://localhost:8787";

export { apiBase, streamBase };

// Pass route paths WITHOUT "/api" here: apiUrl("/ledger"), apiUrl("/ping"), etc.
export const apiUrl = (routePath: string): string => {
  const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${apiBase}${normalized}`;
};

// For SSE/WebSocket connections that need the direct server base URL.
export const streamUrl = (routePath: string): string => {
  const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${streamBase}${normalized}`;
};
