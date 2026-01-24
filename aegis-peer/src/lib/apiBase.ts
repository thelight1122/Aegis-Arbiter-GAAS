// /ui/src/lib/apiBase.ts

// Normal API base (dev default uses Vite proxy)
const rawApiBase = import.meta.env.VITE_API_BASE_URL ?? "/api";
const apiBase = rawApiBase.endsWith("/") ? rawApiBase.slice(0, -1) : rawApiBase;

// Witness SSE URL defaults to bypassing Vite proxy (more stable on Windows).
const witnessSseUrl =
  import.meta.env.VITE_WITNESS_SSE_URL ?? "http://localhost:8787/api/witness";

export { apiBase, witnessSseUrl };

// Pass route paths WITHOUT "/api" here: apiUrl("/ledger"), apiUrl("/ping"), etc.
export const apiUrl = (routePath: string) => {
  const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${apiBase}${normalized}`;
};
