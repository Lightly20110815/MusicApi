"use client";

import Image from "next/image";
import {
  Activity,
  Album,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Copy,
  Disc3,
  FileAudio,
  Gauge,
  Library,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  TerminalSquare,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/lib/types";

type TracksResponse = {
  success: boolean;
  data?: {
    items: Track[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
    library: {
      total: number;
      unreadableFiles: number;
      errors: { filename: string; message: string }[];
      scannedAt: string;
    };
  };
  error?: { message: string };
  meta?: { requestId: string; durationMs: number; timestamp: string };
};

type ApiLog = {
  id: string;
  method: string;
  path: string;
  status: string;
  duration: string;
  tone: "success" | "stream" | "error";
};

const endpoints = [
  { method: "GET", path: "/api/tracks", description: "获取曲库、搜索与分页" },
  { method: "GET", path: "/api/tracks/{id}", description: "读取单曲完整元数据" },
  { method: "GET", path: "/api/tracks/{id}/cover", description: "返回内嵌专辑封面" },
  { method: "GET", path: "/api/tracks/{id}/audio", description: "支持 Range 的音频流" },
  { method: "GET", path: "/api/health", description: "服务与曲库健康检查" },
];

function secondsToTime(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function bytesToSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function bitrateLabel(track: Track) {
  if (!track.format.bitrate) return track.format.lossless ? "Lossless" : "—";
  return `${Math.round(track.format.bitrate / 1000)} kbps`;
}

function Cover({ track, size = 48 }: { track: Track; size?: number }) {
  if (track.urls.cover) {
    return (
      <Image
        className="cover-image"
        src={track.urls.cover}
        alt={`${track.title} 的专辑封面`}
        width={size}
        height={size}
        unoptimized
      />
    );
  }

  return (
    <div className="cover-fallback" style={{ width: size, height: size }} aria-hidden="true">
      <Music2 size={Math.max(18, Math.round(size * 0.36))} strokeWidth={1.7} />
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button className="copy-button" onClick={copy} type="button" aria-label="复制命令">
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

export function MusicDashboard() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [unreadableFiles, setUnreadableFiles] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [activeTab, setActiveTab] = useState<"library" | "api">("library");
  const audioRef = useRef<HTMLAudioElement>(null);

  const addLog = useCallback((log: Omit<ApiLog, "id">) => {
    setLogs((current) => [{ ...log, id: crypto.randomUUID() }, ...current].slice(0, 5));
  }, []);

  const loadTracks = useCallback(
    async (search = "", signal?: AbortSignal) => {
      const startedAt = performance.now();
      const path = `/api/tracks?limit=500${search ? `&q=${encodeURIComponent(search)}` : ""}`;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(path, { cache: "no-store", signal });
        const payload = (await response.json()) as TracksResponse;
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.message || `请求失败：HTTP ${response.status}`);
        }

        setTracks(payload.data.items);
        setLibraryTotal(payload.data.library.total);
        setUnreadableFiles(payload.data.library.unreadableFiles);
        setSelected((current) => {
          if (current && payload.data?.items.some((track) => track.id === current.id)) return current;
          return payload.data?.items[0] ?? null;
        });
        addLog({
          method: "GET",
          path,
          status: String(response.status),
          duration: `${payload.meta?.durationMs ?? Math.round(performance.now() - startedAt)} ms`,
          tone: "success",
        });
      } catch (requestError) {
        if ((requestError as Error).name === "AbortError") return;
        const message = requestError instanceof Error ? requestError.message : "无法加载曲库";
        setError(message);
        addLog({
          method: "GET",
          path,
          status: "ERR",
          duration: `${Math.round(performance.now() - startedAt)} ms`,
          tone: "error",
        });
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [addLog],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => loadTracks(query.trim(), controller.signal), 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadTracks, query]);

  const totalDuration = useMemo(
    () => tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0),
    [tracks],
  );

  const artistsCount = useMemo(
    () => new Set(tracks.map((track) => track.artist)).size,
    [tracks],
  );

  async function playTrack(track: Track) {
    const changed = selected?.id !== track.id;
    setSelected(track);
    if (changed) await new Promise((resolve) => window.setTimeout(resolve, 0));
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setIsPlaying(true);
      addLog({
        method: "GET",
        path: track.urls.audio,
        status: "206",
        duration: "streaming",
        tone: "stream",
      });
    } catch {
      setIsPlaying(false);
    }
  }

  async function togglePlay() {
    if (!selected || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    await playTrack(selected);
  }

  const origin = typeof window === "undefined" ? "https://your-domain.com" : window.location.origin;
  const curlExample = `curl "${origin}/api/tracks?limit=20"`;
  const jsExample = `const response = await fetch("${origin}/api/tracks?q=周杰伦");\nconst result = await response.json();\nconsole.log(result.data.items);`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Music API 首页">
          <span className="brand-mark"><Radio size={18} /></span>
          <span>Music API</span>
        </a>
        <nav className="topnav" aria-label="主导航">
          <button
            className={activeTab === "library" ? "nav-active" : ""}
            onClick={() => setActiveTab("library")}
            type="button"
          >
            曲库
          </button>
          <button
            className={activeTab === "api" ? "nav-active" : ""}
            onClick={() => setActiveTab("api")}
            type="button"
          >
            API 文档
          </button>
        </nav>
        <a className="source-link" href="/api" target="_blank" rel="noreferrer">
          <TerminalSquare size={16} /> <span>JSON API</span>
        </a>
      </header>

      <main id="top" className="main-content">
        {activeTab === "library" ? (
          <>
            <section className="hero">
              <div>
                <div className="eyebrow"><Activity size={14} /> SELF-HOSTED MUSIC ENDPOINT</div>
                <h1>你的音乐，<span>现在有了接口。</span></h1>
                <p>放入歌曲，自动解析标题、作者、专辑和封面。通过标准 HTTP API 搜索、读取和播放。</p>
              </div>
              <div className="hero-status">
                <span className="status-dot" />
                <div><strong>API ONLINE</strong><small>{libraryTotal} tracks indexed</small></div>
              </div>
            </section>

            <section className="stat-grid" aria-label="曲库统计">
              <div className="stat-card"><Library /><span>TRACKS</span><strong>{libraryTotal}</strong><small>已索引歌曲</small></div>
              <div className="stat-card"><Disc3 /><span>ARTISTS</span><strong>{artistsCount}</strong><small>当前结果中的艺术家</small></div>
              <div className="stat-card"><Clock3 /><span>DURATION</span><strong>{Math.round(totalDuration / 3600)}h</strong><small>当前结果总时长</small></div>
              <div className="stat-card"><Gauge /><span>STATUS</span><strong className="healthy">HEALTHY</strong><small>{unreadableFiles ? `${unreadableFiles} 个文件无法读取` : "所有文件读取正常"}</small></div>
            </section>

            <section className="workspace">
              <div className="library-panel">
                <div className="section-heading">
                  <div><span className="section-kicker">LIBRARY</span><h2>曲库</h2></div>
                  <button className="icon-button" onClick={() => loadTracks(query)} type="button" aria-label="刷新曲库">
                    <RefreshCw size={17} className={loading ? "spin" : ""} />
                  </button>
                </div>
                <div className="searchbox">
                  <Search size={17} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索歌曲、艺术家或专辑…" />
                  {query && <button onClick={() => setQuery("")} type="button" aria-label="清空搜索"><X size={15} /></button>}
                  <kbd>/</kbd>
                </div>

                <div className="track-table" role="table" aria-label="歌曲列表">
                  <div className="track-row table-header" role="row">
                    <span>#</span><span>TITLE</span><span>ALBUM</span><span>FORMAT</span><span>SIZE</span><span>DURATION</span>
                  </div>
                  {loading && tracks.length === 0 ? (
                    <div className="empty-state"><LoaderCircle className="spin" /><strong>正在扫描曲库</strong><span>正在读取歌曲元数据和封面…</span></div>
                  ) : error ? (
                    <div className="empty-state error-state"><CircleAlert /><strong>API 请求失败</strong><span>{error}</span><button onClick={() => loadTracks(query)} type="button">重新请求</button></div>
                  ) : tracks.length === 0 ? (
                    <div className="empty-state"><FileAudio /><strong>{query ? "没有匹配的歌曲" : "曲库还是空的"}</strong><span>{query ? "换一个关键词试试。" : "将音频文件放入项目的 music/ 目录，然后刷新。"}</span></div>
                  ) : tracks.map((track, index) => (
                    <button
                      className={`track-row track-item ${selected?.id === track.id ? "selected" : ""}`}
                      key={track.id}
                      onDoubleClick={() => playTrack(track)}
                      onClick={() => setSelected(track)}
                      role="row"
                      type="button"
                    >
                      <span className="track-index">{selected?.id === track.id && isPlaying ? <Volume2 size={15} /> : String(index + 1).padStart(2, "0")}</span>
                      <span className="track-title-cell"><Cover track={track} /><span><strong>{track.title}</strong><small>{track.artist}</small></span></span>
                      <span className="muted-cell">{track.album || "—"}</span>
                      <span><em>{(track.format.container || "audio").toUpperCase()}</em><small>{bitrateLabel(track)}</small></span>
                      <span className="muted-cell">{bytesToSize(track.size)}</span>
                      <span className="duration-cell">{secondsToTime(track.duration)} <ChevronRight size={14} /></span>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="activity-panel">
                <div className="section-heading"><div><span className="section-kicker">LIVE</span><h2>API 调用</h2></div><span className="live-pill"><i /> 实时</span></div>
                <div className="request-list">
                  {logs.length === 0 ? <div className="log-empty">请求记录会显示在这里</div> : logs.map((log) => (
                    <div className="request-item" key={log.id}>
                      <div><b>{log.method}</b><code>{log.path}</code></div>
                      <div><span className={`request-status ${log.tone}`}>{log.status}</span><small>{log.duration}</small></div>
                    </div>
                  ))}
                </div>
                <div className="request-footnote"><TerminalSquare size={15} /> 响应头包含 <code>X-Request-Id</code> 和调用状态</div>
              </aside>
            </section>
          </>
        ) : (
          <section className="docs-view">
            <div className="docs-hero">
              <span className="section-kicker">HTTP API · V1</span>
              <h1>简单、可读、可直接调用。</h1>
              <p>所有 JSON 接口使用统一响应结构，并允许跨域 GET 请求。音频接口支持 HTTP Range。</p>
            </div>
            <div className="docs-grid">
              <div className="endpoint-list">
                <h2><Code2 size={19} /> 接口列表</h2>
                {endpoints.map((endpoint) => (
                  <div className="endpoint" key={endpoint.path}>
                    <b>{endpoint.method}</b><code>{endpoint.path}</code><span>{endpoint.description}</span>
                  </div>
                ))}
              </div>
              <div className="code-column">
                <div className="code-card">
                  <div><span><TerminalSquare size={15} /> cURL</span><CopyButton value={curlExample} /></div>
                  <pre><code>{curlExample}</code></pre>
                </div>
                <div className="code-card">
                  <div><span><Code2 size={15} /> JavaScript</span><CopyButton value={jsExample} /></div>
                  <pre><code>{jsExample}</code></pre>
                </div>
              </div>
            </div>
            <div className="response-card">
              <div><h2>统一响应结构</h2><span>每次调用都明确返回成功状态、数据和请求信息。</span></div>
              <pre><code>{`{
  "success": true,
  "data": { "items": [...] },
  "meta": {
    "requestId": "8d7e…",
    "timestamp": "2026-06-21T12:00:00.000Z",
    "durationMs": 8.42
  }
}`}</code></pre>
            </div>
            <div className="deploy-note"><Server size={19} /><div><strong>部署说明</strong><span>Vercel 适合随代码一起部署的中小型曲库；持续添加歌曲或大曲库建议使用 VPS，并把 music 目录挂载为数据卷。</span></div></div>
          </section>
        )}
      </main>

      {selected && (
        <div className="player-bar">
          <div className="now-playing"><Cover track={selected} size={52} /><div><strong>{selected.title}</strong><span>{selected.artist}</span></div></div>
          <div className="player-controls">
            <button className="play-button" onClick={togglePlay} type="button" aria-label={isPlaying ? "暂停" : "播放"}>
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <div><strong>{isPlaying ? "正在播放" : "准备播放"}</strong><span>{selected.format.container?.toUpperCase() || "AUDIO"} · {bitrateLabel(selected)}</span></div>
          </div>
          <div className="player-end"><Album size={17} /><span>{selected.album || "未知专辑"}</span><code>{selected.id}</code></div>
          <audio
            ref={audioRef}
            src={selected.urls.audio}
            preload="metadata"
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        </div>
      )}
    </div>
  );
}
