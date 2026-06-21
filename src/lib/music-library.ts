import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseFile } from "music-metadata";
import type { IAudioMetadata } from "music-metadata";
import type { LibraryError, LibrarySnapshot, Track } from "@/lib/types";

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".flac",
  ".m4a",
  ".mp4",
  ".aac",
  ".ogg",
  ".oga",
  ".opus",
  ".wav",
  ".wave",
  ".aiff",
  ".aif",
  ".wma",
  ".ape",
  ".wv",
]);

type FileEntry = {
  absolutePath: string;
  relativePath: string;
  size: number;
  mtimeMs: number;
  modifiedAt: string;
};

type CachedTrack = {
  fingerprint: string;
  track: Track;
};

const metadataCache = new Map<string, CachedTrack>();

export function getMusicDirectory() {
  const configured = process.env.MUSIC_DIRECTORY?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "music");
}

function normalizeRelativePath(value: string) {
  return value.split(path.sep).join("/");
}

function trackId(relativePath: string) {
  return createHash("sha256")
    .update(normalizeRelativePath(relativePath))
    .digest("hex")
    .slice(0, 16);
}

async function walkMusicDirectory(
  directory: string,
  root = directory,
): Promise<FileEntry[]> {
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(directory, { recursive: true });
      return [];
    }
    throw error;
  }

  const nested = await Promise.all(
    entries.map(async (entry): Promise<FileEntry[]> => {
      if (entry.name.startsWith(".")) return [];

      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkMusicDirectory(absolutePath, root);
      if (!entry.isFile() || !AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        return [];
      }

      const stat = await fs.stat(absolutePath);
      return [
        {
          absolutePath,
          relativePath: normalizeRelativePath(path.relative(root, absolutePath)),
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          modifiedAt: stat.mtime.toISOString(),
        },
      ];
    }),
  );

  return nested.flat().sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, "zh-CN", { numeric: true }),
  );
}

function toNullableNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toTrack(metadata: IAudioMetadata, file: FileEntry): Track {
  const common = metadata.common;
  const format = metadata.format;
  const id = trackId(file.relativePath);
  const fallbackTitle = path.basename(file.relativePath, path.extname(file.relativePath));
  const artists = (common.artists?.length ? common.artists : common.artist ? [common.artist] : [])
    .map((artist) => artist.trim())
    .filter(Boolean);
  const artist = common.artist?.trim() || artists.join(", ") || "未知艺术家";

  return {
    id,
    title: common.title?.trim() || fallbackTitle,
    artist,
    artists,
    album: common.album?.trim() || null,
    albumArtist: common.albumartist?.trim() || null,
    year: toNullableNumber(common.year),
    track: {
      number: toNullableNumber(common.track.no ?? undefined),
      total: toNullableNumber(common.track.of ?? undefined),
    },
    disc: {
      number: toNullableNumber(common.disk.no ?? undefined),
      total: toNullableNumber(common.disk.of ?? undefined),
    },
    genres: common.genre?.filter(Boolean) ?? [],
    duration: toNullableNumber(format.duration),
    size: file.size,
    filename: path.basename(file.relativePath),
    modifiedAt: file.modifiedAt,
    hasCover: Boolean(common.picture?.length),
    format: {
      container: format.container || null,
      codec: format.codec || null,
      lossless: Boolean(format.lossless),
      bitrate: toNullableNumber(format.bitrate),
      sampleRate: toNullableNumber(format.sampleRate),
      channels: toNullableNumber(format.numberOfChannels),
      bitsPerSample: toNullableNumber(format.bitsPerSample),
    },
    urls: {
      self: `/api/tracks/${id}`,
      audio: `/api/tracks/${id}/audio`,
      cover: common.picture?.length ? `/api/tracks/${id}/cover` : null,
    },
  };
}

async function readTrack(file: FileEntry) {
  const fingerprint = `${file.size}:${file.mtimeMs}`;
  const cached = metadataCache.get(file.relativePath);
  if (cached?.fingerprint === fingerprint) return cached.track;

  const metadata = await parseFile(file.absolutePath, { duration: true });
  const track = toTrack(metadata, file);
  metadataCache.set(file.relativePath, { fingerprint, track });
  return track;
}

export async function getLibrary(): Promise<LibrarySnapshot> {
  const files = await walkMusicDirectory(getMusicDirectory());
  const currentPaths = new Set(files.map((file) => file.relativePath));

  for (const cachedPath of metadataCache.keys()) {
    if (!currentPaths.has(cachedPath)) metadataCache.delete(cachedPath);
  }

  const results = await Promise.allSettled(files.map(readTrack));
  const tracks: Track[] = [];
  const errors: LibraryError[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      tracks.push(result.value);
      return;
    }

    errors.push({
      filename: files[index].relativePath,
      message: result.reason instanceof Error ? result.reason.message : "无法读取元数据",
    });
  });

  tracks.sort((a, b) => {
    const byArtist = a.artist.localeCompare(b.artist, "zh-CN", { numeric: true });
    if (byArtist !== 0) return byArtist;
    return a.title.localeCompare(b.title, "zh-CN", { numeric: true });
  });

  return { tracks, errors, scannedAt: new Date().toISOString() };
}

export async function findTrack(id: string) {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  const library = await getLibrary();
  const track = library.tracks.find((item) => item.id === id);
  if (!track) return null;

  const files = await walkMusicDirectory(getMusicDirectory());
  const file = files.find((item) => trackId(item.relativePath) === id);
  return file ? { track, file, library } : null;
}

export async function readCover(absolutePath: string) {
  const metadata = await parseFile(absolutePath, {
    duration: false,
    skipPostHeaders: true,
  });
  return metadata.common.picture?.[0] ?? null;
}

export function contentTypeForAudio(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".opus": "audio/ogg",
    ".wav": "audio/wav",
    ".wave": "audio/wav",
    ".aiff": "audio/aiff",
    ".aif": "audio/aiff",
    ".wma": "audio/x-ms-wma",
    ".ape": "audio/x-ape",
    ".wv": "audio/wavpack",
  };
  return types[extension] ?? "application/octet-stream";
}

