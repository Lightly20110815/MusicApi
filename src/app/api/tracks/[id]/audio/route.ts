import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { apiError, corsHeaders, optionsResponse, requestContext } from "@/lib/api";
import { contentTypeForAudio, findTrack } from "@/lib/music-library";
import { parseByteRange } from "@/lib/range";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeAsciiFilename(filename: string) {
  return filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
}

async function audioResponse(
  request: Request,
  params: Promise<{ id: string }>,
  headOnly: boolean,
) {
  const context = requestContext();
  const { id } = await params;

  try {
    const result = await findTrack(id);
    if (!result) return apiError(404, "TRACK_NOT_FOUND", "没有找到这首歌曲", context);

    const rangeHeader = request.headers.get("range");
    const range = parseByteRange(rangeHeader, result.file.size);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          ...corsHeaders,
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes */${result.file.size}`,
          "X-Request-Id": context.requestId,
          "X-Music-Api-Status": "error",
        },
      });
    }

    const isPartial = Boolean(rangeHeader);
    const contentLength = range.end - range.start + 1;
    const encodedFilename = encodeURIComponent(result.track.filename);
    const headers = {
      ...corsHeaders,
      "Accept-Ranges": "bytes",
      "Content-Type": contentTypeForAudio(result.track.filename),
      "Content-Length": String(contentLength),
      "Content-Disposition": `inline; filename="${safeAsciiFilename(result.track.filename)}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "public, max-age=0, must-revalidate",
      ETag: `"${id}-${result.file.size}-${Math.floor(result.file.mtimeMs)}"`,
      "X-Request-Id": context.requestId,
      "X-Music-Api-Status": "success",
      ...(isPartial
        ? { "Content-Range": `bytes ${range.start}-${range.end}/${result.file.size}` }
        : {}),
    };

    if (headOnly) return new Response(null, { status: isPartial ? 206 : 200, headers });

    const nodeStream = createReadStream(result.file.absolutePath, {
      start: range.start,
      end: range.end,
    });
    const stream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    return new Response(stream, { status: isPartial ? 206 : 200, headers });
  } catch (error) {
    return apiError(
      500,
      "AUDIO_STREAM_FAILED",
      "创建音频流失败",
      context,
      error instanceof Error ? error.message : undefined,
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return audioResponse(request, params, false);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return audioResponse(request, params, true);
}

export function OPTIONS() {
  return optionsResponse();
}
