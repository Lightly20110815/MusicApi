import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { apiError, apiSuccess, optionsResponse, requestContext } from "@/lib/api";
import { getLibrary, getMusicDirectory } from "@/lib/music-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const context = requestContext();

  try {
    const directory = getMusicDirectory();
    await access(directory, constants.R_OK);
    const library = await getLibrary();
    return apiSuccess(
      {
        status: "ok",
        tracks: library.tracks.length,
        unreadableFiles: library.errors.length,
        musicDirectoryReadable: true,
        environment: process.env.VERCEL ? "vercel" : "node",
      },
      context,
    );
  } catch (error) {
    return apiError(
      503,
      "LIBRARY_UNAVAILABLE",
      "音乐目录当前不可用",
      context,
      error instanceof Error ? error.message : undefined,
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}

