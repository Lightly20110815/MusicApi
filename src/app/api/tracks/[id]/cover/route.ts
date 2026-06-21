import { corsHeaders, apiError, optionsResponse, requestContext } from "@/lib/api";
import { findTrack, readCover } from "@/lib/music-library";

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

    const cover = await readCover(result.file.absolutePath);
    if (!cover) return apiError(404, "COVER_NOT_FOUND", "这首歌曲没有内嵌封面", context);

    const body = new Uint8Array(cover.data);
    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": cover.format || "application/octet-stream",
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=0, must-revalidate",
        ETag: `"${id}-${result.file.size}-${Math.floor(result.file.mtimeMs)}"`,
        "X-Request-Id": context.requestId,
        "X-Music-Api-Status": "success",
      },
    });
  } catch (error) {
    return apiError(
      500,
      "COVER_READ_FAILED",
      "读取专辑封面失败",
      context,
      error instanceof Error ? error.message : undefined,
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}
