import { apiError, apiSuccess, optionsResponse, requestContext } from "@/lib/api";
import { findTrack } from "@/lib/music-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = requestContext();
  const { id } = await params;

  try {
    const result = await findTrack(id);
    if (!result) return apiError(404, "TRACK_NOT_FOUND", "没有找到这首歌曲", context);
    return apiSuccess(result.track, context);
  } catch (error) {
    return apiError(
      500,
      "TRACK_READ_FAILED",
      "读取歌曲信息失败",
      context,
      error instanceof Error ? error.message : undefined,
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}

