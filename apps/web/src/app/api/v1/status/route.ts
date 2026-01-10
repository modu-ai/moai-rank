import { successResponse, corsOptionsResponse } from "@/lib/api-response";

/**
 * API status response
 */
interface ApiStatus {
  status: "operational" | "degraded" | "maintenance";
  version: string;
  timestamp: string;
  endpoints: {
    sessions: string;
    rank: string;
    status: string;
  };
}

/**
 * GET /api/v1/status
 *
 * Returns API version and status.
 * No authentication required.
 * Used by CLI to check API availability.
 */
export async function GET() {
  const status: ApiStatus = {
    status: "operational",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      sessions: "/api/v1/sessions",
      rank: "/api/v1/rank",
      status: "/api/v1/status",
    },
  };

  return successResponse(status);
}

/**
 * OPTIONS /api/v1/status
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return corsOptionsResponse();
}
