// Shared CORS module — reads allowed origins from env var with hardcoded fallback
// Set ALLOWED_ORIGINS env var as comma-separated list in Supabase secrets

const DEFAULT_ORIGINS = [
  "https://prototype-zeta-black.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getAllowedOrigins(): string[] {
  const envVal = Deno.env.get("ALLOWED_ORIGINS");
  if (envVal) return envVal.split(",").map((s) => s.trim()).filter(Boolean);
  return DEFAULT_ORIGINS;
}

export function getCorsHeaders(req: Request) {
  const origins = getAllowedOrigins();
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = origins.includes(origin) ? origin : origins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}
