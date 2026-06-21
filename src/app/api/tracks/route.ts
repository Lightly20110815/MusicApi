import { apiError, apiSuccess, optionsResponse, requestContext } from "@/lib/api";
import { getLibrary } from "@/lib/music-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function numericParam(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return null;
  return Math.min(Math.max(parsed, min), max);
}

export async function GET(request: Request) {
  const context = requestContext();

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim().toLocaleLowerCase("zh-CN") ?? "";
    const artist = url.searchParams.get("artist")?.trim().toLocaleLowerCase("zh-CN") ?? "";
    const album = url.searchParams.get("album")?.trim().toLocaleLowerCase("zh-CN") ?? "";
    const limit = numericParam(url.searchParams.get("limit"), 100, 1, 500);
    const offset = numericParam(url.searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);

    if (limit === null || offset === null) {
      return apiError(400, "INVALID_PAGINATION", "limit 和 offset 必须是整数", context);
    }

    const library = await getLibrary();
    const filtered = library.tracks.filter((track) => {
      const searchText = [track.title, track.artist, track.album, track.filename]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("zh-CN");
      const trackArtist = track.artist.toLocaleLowerCase("zh-CN");
      const trackAlbum = track.album?.toLocaleLowerCase("zh-CN") ?? "";
      return (
        (!q || searchText.includes(q)) &&
        (!artist || trackArtist.includes(artist)) &&
        (!album || trackAlbum.includes(album))
      );
    });

    return apiSuccess(
      {
        items: filtered.slice(offset, offset + limit),
        pagination: {
          total: filtered.length,
          limit,
          offset,
          hasMore: offset + limit < filtered.length,
        },
        library: {
          total: library.tracks.length,
          unreadableFiles: library.errors.length,
          errors: library.errors,
          scannedAt: library.scannedAt,
        },
      },
      context,
    );
  } catch (error) {
    return apiError(
      500,
      "SCAN_FAILED",
      "扫描音乐目录失败",
      context,
      error instanceof Error ? error.message : undefined,
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}

