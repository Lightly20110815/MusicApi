# Music API

一个可以直接部署的自托管音乐 API。将音频文件放入 `music/` 目录，服务会自动读取歌曲内嵌的标题、艺术家、专辑、年份、流派、音轨编号、音频参数和专辑封面，并提供曲库查询、搜索、封面获取以及支持 HTTP Range 的音频流。

项目同时包含一个响应式 Web 曲库和播放器，可以查看歌曲、搜索、顺序播放，并实时查看 API 调用状态。

## 在线地址

- Web 播放器：<https://music-api-nine-sooty.vercel.app>
- API 文档：<https://music-api-nine-sooty.vercel.app/api>
- 健康检查：<https://music-api-nine-sooty.vercel.app/api/health>
- GitHub：<https://github.com/Lightly20110815/MusicApi>

当前线上曲库包含 17 首歌曲。Vercel 地址是公开地址，请不要部署无权公开传播的音频。

## 功能

- 自动扫描 `music/` 及其所有子目录
- 支持 MP3、FLAC、M4A、AAC、OGG、Opus、WAV、AIFF、WMA、APE、WavPack 等格式
- 自动读取歌曲标题、艺术家、专辑、年份、流派和音轨编号
- 自动提取歌曲内嵌的 JPEG、PNG 等专辑封面
- 返回容器、编码、码率、采样率、声道数和位深等音频参数
- 支持标题、文件名、艺术家和专辑搜索
- 支持分页查询，单次最多返回 500 首歌曲
- 音频接口支持 `Range`、`HEAD` 和拖动播放
- JSON API 使用统一成功、错误和请求元数据结构
- 支持跨域调用，可直接用于其他网页、React、Vue 或移动客户端
- VPS 环境下添加、删除或替换歌曲后自动重新扫描，无需重启
- 单个文件损坏不会阻断整个曲库
- 内置响应式播放器、曲库统计、API 文档和实时请求记录
- 支持 Vercel、Docker Compose 和普通 VPS 部署

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- `music-metadata`
- Lucide React

所有读取音频文件的 API Route 都运行在 Node.js Runtime。歌曲不会被加载到浏览器内存后再返回，而是通过文件流输出。

## 工作方式

```text
music/ 中的音频文件
        │
        ▼
扫描文件名、大小和修改时间
        │
        ▼
music-metadata 解析标签和封面
        │
        ├── /api/tracks              曲库和搜索
        ├── /api/tracks/{id}         单曲元数据
        ├── /api/tracks/{id}/cover   专辑封面
        └── /api/tracks/{id}/audio   Range 音频流
```

曲目 ID 根据歌曲在 `music/` 中的相对路径生成。只要路径不变，ID 就保持不变。服务会缓存已经解析的元数据，并根据文件大小和修改时间判断是否需要重新解析。

## 目录结构

```text
MusicApi/
├── music/                         # 音频文件目录
├── public/                        # Web 静态资源
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/            # 健康检查
│   │   │   └── tracks/            # 曲库、封面和音频接口
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── music-dashboard.tsx    # Web 播放器
│   └── lib/
│       ├── api.ts                 # API 响应和 CORS
│       ├── music-library.ts       # 扫描及元数据读取
│       ├── range.ts               # Range 解析
│       └── types.ts               # TypeScript 类型
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
└── package.json
```

## 本地运行

### 环境要求

- Node.js 20.9 或更高版本
- 推荐 Node.js 22
- npm 10 或更高版本

### 安装和启动

```bash
git clone https://github.com/Lightly20110815/MusicApi.git
cd MusicApi
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

### 添加歌曲

将音频文件复制到 `music/`：

```bash
cp ~/Downloads/example.mp3 ./music/
```

可以使用任意层级的子目录：

```text
music/
├── Artist A/
│   ├── Album 1/
│   │   ├── 01 - Song.mp3
│   │   └── 02 - Song.flac
│   └── Single.m4a
└── Artist B/
    └── Song.ogg
```

开发环境和 VPS 会在下一次 API 请求时发现文件变化，不需要重启服务。

### 使用其他音乐目录

默认目录为项目根目录下的 `music/`。可以使用环境变量指定其他绝对路径：

```bash
MUSIC_DIRECTORY=/data/music npm run dev
```

也可以复制示例配置：

```bash
cp .env.example .env.local
```

```dotenv
MUSIC_DIRECTORY=/absolute/path/to/music
```

## API 基础地址

线上环境：

```text
https://music-api-nine-sooty.vercel.app
```

本地环境：

```text
http://localhost:3000
```

以下示例使用：

```js
const API_BASE = "https://music-api-nine-sooty.vercel.app";
```

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api` | 返回机器可读的 API 文档和调用示例 |
| `GET` | `/api/health` | 检查服务、曲库目录和歌曲数量 |
| `GET` | `/api/tracks` | 查询、搜索和分页获取曲库 |
| `GET` | `/api/tracks/{id}` | 获取一首歌曲的完整元数据 |
| `GET` | `/api/tracks/{id}/cover` | 获取歌曲内嵌的专辑封面 |
| `GET` | `/api/tracks/{id}/audio` | 获取支持 Range 的音频流 |
| `HEAD` | `/api/tracks/{id}/audio` | 获取音频类型、长度和 Range 信息 |
| `OPTIONS` | 所有 API | 返回跨域调用配置 |

## 统一 JSON 响应

### 成功响应

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "8d7e9a5e-0000-0000-0000-000000000000",
    "timestamp": "2026-06-21T12:00:00.000Z",
    "durationMs": 8.42
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "TRACK_NOT_FOUND",
    "message": "没有找到这首歌曲"
  },
  "meta": {
    "requestId": "8d7e9a5e-0000-0000-0000-000000000000",
    "timestamp": "2026-06-21T12:00:00.000Z",
    "durationMs": 1.25
  }
}
```

JSON 响应头包含：

```text
X-Request-Id: 每次请求的唯一 ID
X-Music-Api-Status: success 或 error
Access-Control-Allow-Origin: *
Cache-Control: no-store
```

## 查询曲库

```http
GET /api/tracks
```

### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `q` | string | 空 | 搜索标题、艺术家、专辑和文件名 |
| `artist` | string | 空 | 按艺术家筛选，支持部分匹配 |
| `album` | string | 空 | 按专辑筛选，支持部分匹配 |
| `limit` | integer | `100` | 返回数量，范围为 1–500 |
| `offset` | integer | `0` | 分页偏移量 |

### cURL 示例

```bash
curl "https://music-api-nine-sooty.vercel.app/api/tracks"

curl "https://music-api-nine-sooty.vercel.app/api/tracks?q=Love"

curl "https://music-api-nine-sooty.vercel.app/api/tracks?artist=冯曦妤"

curl "https://music-api-nine-sooty.vercel.app/api/tracks?album=A%20Little%20Love"

curl "https://music-api-nine-sooty.vercel.app/api/tracks?limit=10&offset=10"
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cc17d7e65be0c5e4",
        "title": "A Little Love",
        "artist": "冯曦妤",
        "artists": ["冯曦妤"],
        "album": "A Little Love",
        "albumArtist": "冯曦妤",
        "year": 2008,
        "track": {
          "number": 23,
          "total": 27
        },
        "disc": {
          "number": 1,
          "total": 1
        },
        "genres": ["Cantopop", "HK-Pop"],
        "duration": 189.336,
        "size": 7787284,
        "filename": "A Little Love.mp3",
        "modifiedAt": "2018-10-20T01:46:40.000Z",
        "hasCover": true,
        "format": {
          "container": "MPEG",
          "codec": "MPEG 1 Layer 3",
          "lossless": false,
          "bitrate": 320000,
          "sampleRate": 48000,
          "channels": 2,
          "bitsPerSample": null
        },
        "urls": {
          "self": "/api/tracks/cc17d7e65be0c5e4",
          "audio": "/api/tracks/cc17d7e65be0c5e4/audio",
          "cover": "/api/tracks/cc17d7e65be0c5e4/cover"
        }
      }
    ],
    "pagination": {
      "total": 17,
      "limit": 100,
      "offset": 0,
      "hasMore": false
    },
    "library": {
      "total": 17,
      "unreadableFiles": 0,
      "errors": [],
      "scannedAt": "2026-06-21T12:00:00.000Z"
    }
  },
  "meta": {
    "requestId": "...",
    "timestamp": "2026-06-21T12:00:00.000Z",
    "durationMs": 6.81
  }
}
```

曲库当前按照艺术家、标题排序。客户端按 `data.items` 的顺序播放即可实现顺序播放。

## 单曲信息

```http
GET /api/tracks/{id}
```

```bash
curl "https://music-api-nine-sooty.vercel.app/api/tracks/cc17d7e65be0c5e4"
```

成功时 `data` 是完整的 Track 对象。ID 格式不正确或歌曲不存在时返回：

```text
HTTP 404
TRACK_NOT_FOUND
```

## 专辑封面

```http
GET /api/tracks/{id}/cover
```

直接在 HTML 中显示：

```html
<img
  src="https://music-api-nine-sooty.vercel.app/api/tracks/cc17d7e65be0c5e4/cover"
  width="300"
  height="300"
  alt="专辑封面"
/>
```

下载封面：

```bash
curl \
  "https://music-api-nine-sooty.vercel.app/api/tracks/cc17d7e65be0c5e4/cover" \
  -o cover.jpg
```

歌曲没有内嵌封面时返回 `404 COVER_NOT_FOUND`。封面的 `Content-Type` 由内嵌图片格式决定。

## 音频播放和 Range

```http
GET /api/tracks/{id}/audio
```

浏览器播放器：

```html
<audio
  controls
  preload="metadata"
  src="https://music-api-nine-sooty.vercel.app/api/tracks/cc17d7e65be0c5e4/audio"
></audio>
```

下载完整音频：

```bash
curl \
  "https://music-api-nine-sooty.vercel.app/api/tracks/cc17d7e65be0c5e4/audio" \
  -o song.mp3
```

获取前 1 MB：

```bash
curl \
  -H "Range: bytes=0-1048575" \
  "https://music-api-nine-sooty.vercel.app/api/tracks/cc17d7e65be0c5e4/audio" \
  -o first-megabyte.bin
```

音频接口行为：

| 请求 | 状态码 | 说明 |
| --- | --- | --- |
| 无 Range | `200` | 返回完整音频流 |
| 合法 Range | `206` | 返回指定字节范围 |
| 越界或非法 Range | `416` | 返回 `Content-Range: bytes */文件大小` |

响应包含：

```text
Accept-Ranges: bytes
Content-Type: audio/mpeg
Content-Length: 当前返回的字节数
Content-Range: bytes 0-1023/7787284
Content-Disposition: inline
ETag: 文件 ID、大小和修改时间
```

因此浏览器可以拖动进度条，不需要先下载完整歌曲。

## 健康检查

```bash
curl "https://music-api-nine-sooty.vercel.app/api/health"
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "tracks": 17,
    "unreadableFiles": 0,
    "musicDirectoryReadable": true,
    "environment": "vercel"
  },
  "meta": {
    "requestId": "...",
    "timestamp": "2026-06-21T12:00:00.000Z",
    "durationMs": 3.08
  }
}
```

## 在其他项目中使用

API 已返回 `Access-Control-Allow-Origin: *`，可以直接从其他域名调用。

需要注意：Track 中的 `urls.audio`、`urls.cover` 和 `urls.self` 是相对地址。在其他项目中必须拼接 API 基础地址：

```js
const absoluteUrl = new URL(track.urls.audio, API_BASE).href;
```

### 嵌入完整播放器

```html
<iframe
  src="https://music-api-nine-sooty.vercel.app"
  title="Music API Player"
  width="100%"
  height="760"
  loading="lazy"
  style="border: 0"
></iframe>
```

### 原生 JavaScript

```html
<img id="cover" width="180" height="180" alt="专辑封面" />
<h2 id="title"></h2>
<p id="artist"></p>
<audio id="player" controls preload="metadata"></audio>

<script type="module">
  const API_BASE = "https://music-api-nine-sooty.vercel.app";

  const response = await fetch(`${API_BASE}/api/tracks?limit=500`);
  const result = await response.json();
  const track = result.data.items[0];

  document.querySelector("#title").textContent = track.title;
  document.querySelector("#artist").textContent = track.artist;
  document.querySelector("#player").src = new URL(track.urls.audio, API_BASE);

  const cover = document.querySelector("#cover");
  if (track.urls.cover) {
    cover.src = new URL(track.urls.cover, API_BASE);
  } else {
    cover.hidden = true;
  }
</script>
```

### React 顺序播放器

以下组件会读取全部歌曲，从第一首开始播放，并在 `ended` 事件发生后自动切换到下一首：

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE = "https://music-api-nine-sooty.vercel.app";

type Track = {
  id: string;
  title: string;
  artist: string;
  urls: {
    audio: string;
    cover: string | null;
  };
};

export default function SequentialMusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const current = tracks[index];

  useEffect(() => {
    fetch(`${API_BASE}/api/tracks?limit=500`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((result) => setTracks(result.data.items))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (started && current) {
      audioRef.current?.play().catch(console.error);
    }
  }, [current, started]);

  function play() {
    setStarted(true);
    audioRef.current?.play().catch(console.error);
  }

  function previous() {
    setIndex((currentIndex) => Math.max(0, currentIndex - 1));
  }

  function next() {
    setIndex((currentIndex) =>
      Math.min(tracks.length - 1, currentIndex + 1),
    );
  }

  function handleEnded() {
    if (index < tracks.length - 1) {
      setIndex((currentIndex) => currentIndex + 1);
    } else {
      setStarted(false);

      // 如果需要列表循环，替换上一行为：
      // setIndex(0);
    }
  }

  if (!current) return <p>正在加载曲库…</p>;

  return (
    <section>
      {current.urls.cover && (
        <img
          src={new URL(current.urls.cover, API_BASE).href}
          width={180}
          height={180}
          alt={`${current.title} 的专辑封面`}
        />
      )}

      <h2>{current.title}</h2>
      <p>{current.artist}</p>
      <p>{index + 1} / {tracks.length}</p>

      <audio
        ref={audioRef}
        src={new URL(current.urls.audio, API_BASE).href}
        controls
        preload="metadata"
        onPlay={() => setStarted(true)}
        onEnded={handleEnded}
      />

      <div>
        <button onClick={previous} disabled={index === 0}>
          上一首
        </button>
        <button onClick={play}>播放</button>
        <button onClick={next} disabled={index === tracks.length - 1}>
          下一首
        </button>
      </div>
    </section>
  );
}
```

浏览器通常禁止页面在没有用户操作时自动播放。第一次播放应由用户点击按钮触发；之后通过 `onEnded` 切换歌曲可以继续顺序播放。

### Vue 3

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const API_BASE = "https://music-api-nine-sooty.vercel.app";
const tracks = ref<any[]>([]);
const index = ref(0);
const current = computed(() => tracks.value[index.value]);

onMounted(async () => {
  const response = await fetch(`${API_BASE}/api/tracks?limit=500`);
  const result = await response.json();
  tracks.value = result.data.items;
});

function next() {
  if (index.value < tracks.value.length - 1) index.value += 1;
}
</script>

<template>
  <div v-if="current">
    <h2>{{ current.title }}</h2>
    <p>{{ current.artist }}</p>
    <audio
      controls
      autoplay
      :src="new URL(current.urls.audio, API_BASE).href"
      @ended="next"
    />
  </div>
</template>
```

## TypeScript Track 类型

```ts
export type Track = {
  id: string;
  title: string;
  artist: string;
  artists: string[];
  album: string | null;
  albumArtist: string | null;
  year: number | null;
  track: {
    number: number | null;
    total: number | null;
  };
  disc: {
    number: number | null;
    total: number | null;
  };
  genres: string[];
  duration: number | null;
  size: number;
  filename: string;
  modifiedAt: string;
  hasCover: boolean;
  format: {
    container: string | null;
    codec: string | null;
    lossless: boolean;
    bitrate: number | null;
    sampleRate: number | null;
    channels: number | null;
    bitsPerSample: number | null;
  };
  urls: {
    self: string;
    audio: string;
    cover: string | null;
  };
};
```

## Vercel 部署

当前项目已经连接 GitHub 和 Vercel。向 `main` 分支推送提交后，Vercel 会自动创建新的生产部署。

手动部署：

```bash
npx vercel link
npx vercel --prod
```

新项目部署步骤：

1. Fork 或克隆仓库。
2. 将项目推送到自己的 GitHub 仓库。
3. 在 Vercel 中导入仓库。
4. Framework Preset 选择 Next.js。
5. 不需要设置 Output Directory 或 Build Command。
6. 点击 Deploy。

### Vercel 文件更新限制

Vercel 部署的文件系统是只读且不可变的：

- 构建时已有的歌曲可以正常读取和播放。
- 不能在运行时向 Vercel Function 的 `music/` 持久写入新文件。
- 添加或删除歌曲后，需要提交 Git 并重新部署。
- 音频会增加 Git 仓库、上传包和 Function 产物大小。
- 大型曲库更适合 VPS 或对象存储。

项目在 `next.config.ts` 中通过 `outputFileTracingIncludes` 将 `music/` 包含到 API Function 产物中。

## VPS 和 Docker 部署

持续添加歌曲或曲库较大时，推荐使用 VPS。

### Docker Compose

```bash
git clone https://github.com/Lightly20110815/MusicApi.git
cd MusicApi
docker compose up -d --build
```

默认配置：

```yaml
services:
  music-api:
    ports:
      - "3000:3000"
    environment:
      MUSIC_DIRECTORY: /music
    volumes:
      - ./music:/music:ro
```

宿主机 `./music` 会以只读数据卷挂载到容器的 `/music`。以后直接向宿主机目录添加歌曲：

```bash
cp ~/Downloads/new-song.mp3 ./music/
```

不需要重建镜像或重启容器。

查看状态：

```bash
docker compose ps
docker compose logs -f music-api
curl http://localhost:3000/api/health
```

### 直接运行 Node.js

```bash
npm ci
npm run build
MUSIC_DIRECTORY=/absolute/path/to/music npm start
```

可以使用 PM2 保持进程运行：

```bash
npm install -g pm2
MUSIC_DIRECTORY=/data/music pm2 start npm --name music-api -- start
pm2 save
pm2 startup
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name music.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 音频播放和 Range 请求
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        proxy_buffering off;
    }
}
```

生产环境应使用 Certbot、Caddy 或其他方式配置 HTTPS。

## 支持格式

| 扩展名 | MIME 类型 |
| --- | --- |
| `.mp3` | `audio/mpeg` |
| `.flac` | `audio/flac` |
| `.m4a`, `.mp4` | `audio/mp4` |
| `.aac` | `audio/aac` |
| `.ogg`, `.oga`, `.opus` | `audio/ogg` |
| `.wav`, `.wave` | `audio/wav` |
| `.aiff`, `.aif` | `audio/aiff` |
| `.wma` | `audio/x-ms-wma` |
| `.ape` | `audio/x-ape` |
| `.wv` | `audio/wavpack` |

实际浏览器能否播放某种格式取决于浏览器自身的解码能力。API 可以返回 FLAC、APE 等文件，但并非所有浏览器都能直接播放这些格式。

## npm 命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 创建生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint |
| `npm run typecheck` | 运行 TypeScript 检查 |
| `npm run check` | 依次运行 lint、类型检查和生产构建 |

## 错误代码

| HTTP 状态 | 错误代码 | 说明 |
| --- | --- | --- |
| `400` | `INVALID_PAGINATION` | `limit` 或 `offset` 不是整数 |
| `404` | `TRACK_NOT_FOUND` | 歌曲 ID 不存在或格式错误 |
| `404` | `COVER_NOT_FOUND` | 歌曲没有内嵌封面 |
| `416` | 二进制响应 | Range 不合法或超出文件大小 |
| `500` | `SCAN_FAILED` | 扫描音乐目录失败 |
| `500` | `TRACK_READ_FAILED` | 读取单曲元数据失败 |
| `500` | `COVER_READ_FAILED` | 读取专辑封面失败 |
| `500` | `AUDIO_STREAM_FAILED` | 创建音频流失败 |
| `503` | `LIBRARY_UNAVAILABLE` | 健康检查无法读取音乐目录 |

## 常见问题

### 曲库显示为空

检查歌曲是否位于正确目录：

```bash
find music -type f
curl http://localhost:3000/api/health
```

使用了 `MUSIC_DIRECTORY` 时，确认它指向容器内或服务器上的正确绝对路径，并且运行服务的用户有读取权限。

### 添加歌曲后 Vercel 没有更新

Vercel 不会读取本地电脑的新文件。需要提交并推送：

```bash
git add music
git commit -m "content: update music library"
git push origin main
```

等待 Vercel 自动部署完成后再刷新曲库。

### 客户端请求成功但音频或封面打不开

API 返回的是相对路径。不要直接使用：

```js
audio.src = track.urls.audio;
```

应拼接 API 地址：

```js
audio.src = new URL(track.urls.audio, API_BASE).href;
```

### 浏览器不允许自动播放

这是浏览器的自动播放策略，不是 API 错误。第一次播放必须由点击、触摸或键盘操作触发：

```js
button.addEventListener("click", () => audio.play());
```

### 拖动进度条失败

检查响应是否为 `206 Partial Content`，以及反向代理是否转发 `Range` 和 `If-Range` 请求头：

```bash
curl -I \
  -H "Range: bytes=0-1023" \
  "https://music-api-nine-sooty.vercel.app/api/tracks/cc17d7e65be0c5e4/audio"
```

### 某个文件无法解析

查看曲库响应中的：

```text
data.library.unreadableFiles
data.library.errors
```

损坏文件会被跳过，不会影响其他歌曲。

## 安全和版权

- API 默认不需要登录，并允许所有来源跨域读取。
- 任何知道部署地址的人都可以查询和播放歌曲。
- 私有 GitHub 仓库不代表 Vercel 生产网址是私有的。
- 不要在公开部署中放置无权传播的音乐。
- 私有曲库建议在 Nginx、Caddy、Cloudflare Access 或 Vercel Authentication 层添加鉴权。
- 音频文件可能包含作者、版权、编码软件或其他标签信息，部署前应自行检查。

## 更新流程

```bash
# 1. 添加或删除歌曲
cp ~/Downloads/new-song.mp3 ./music/

# 2. 本地验证
npm run check
npm run dev

# 3. 提交
git add music
git commit -m "content: update music library"

# 4. 推送；Vercel 会自动重新部署 main
git push origin main
```

## 项目状态

- GitHub 默认分支：`main`
- Vercel 环境：Production
- Framework：Next.js
- Runtime：Node.js
- 当前曲库：17 首
- 健康检查：正常
