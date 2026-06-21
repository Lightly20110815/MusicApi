import { NextResponse } from "next/server";
import type { ApiMeta } from "@/lib/types";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers":
    "Content-Length, Content-Range, Accept-Ranges, ETag, X-Request-Id, X-Music-Api-Status",
};

export function requestContext() {
  return {
    requestId: crypto.randomUUID(),
    startedAt: performance.now(),
  };
}

function createMeta(context: ReturnType<typeof requestContext>): ApiMeta {
  return {
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    durationMs: Math.round((performance.now() - context.startedAt) * 100) / 100,
  };
}

export function apiSuccess<T>(
  data: T,
  context: ReturnType<typeof requestContext>,
  init?: ResponseInit,
) {
  return NextResponse.json(
    { success: true, data, meta: createMeta(context) },
    {
      ...init,
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-store",
        "X-Request-Id": context.requestId,
        "X-Music-Api-Status": "success",
        ...init?.headers,
      },
    },
  );
}

export function apiError(
  status: number,
  code: string,
  message: string,
  context: ReturnType<typeof requestContext>,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details === undefined ? {} : { details }) },
      meta: createMeta(context),
    },
    {
      status,
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-store",
        "X-Request-Id": context.requestId,
        "X-Music-Api-Status": "error",
      },
    },
  );
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

