export type AudioFormat = {
  container: string | null;
  codec: string | null;
  lossless: boolean;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  bitsPerSample: number | null;
};

export type TrackNumber = {
  number: number | null;
  total: number | null;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  artists: string[];
  album: string | null;
  albumArtist: string | null;
  year: number | null;
  track: TrackNumber;
  disc: TrackNumber;
  genres: string[];
  duration: number | null;
  size: number;
  filename: string;
  modifiedAt: string;
  hasCover: boolean;
  format: AudioFormat;
  urls: {
    self: string;
    audio: string;
    cover: string | null;
  };
};

export type LibraryError = {
  filename: string;
  message: string;
};

export type LibrarySnapshot = {
  tracks: Track[];
  errors: LibraryError[];
  scannedAt: string;
};

export type ApiMeta = {
  requestId: string;
  timestamp: string;
  durationMs: number;
};

