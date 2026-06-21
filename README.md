# Music API

把歌曲放进 `music/`，服务会读取歌曲内嵌的标题、艺术家、专辑、年份、流派、音轨编号、音频格式和专辑封面，并通过 HTTP API 提供查询、封面和支持 Range 的音频流。

## 本地运行

需要 Node.js 20.9 或更高版本，推荐 Node.js 22。

```bash
npm install
# 将 mp3 / flac / m4a / ogg / wav 等文件放进 music/
npm run dev
```

打开 `http://localhost:3000` 查看曲库、播放器、API 调用状态和接口文档。歌曲可放在 `music/` 的任意子目录。服务会在 API 请求时检查文件修改时间；在 VPS 上新增或替换文件后不需要重启。

如需读取其他目录：

```bash
MUSIC_DIRECTORY=/data/music npm run dev
```

## API 调用

所有 JSON 接口返回：

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "...",
    "timestamp": "2026-06-21T12:00:00.000Z",
    "durationMs": 8.42
  }
}
```

失败时 `success` 为 `false`，并返回 `error.code` 和 `error.message`。响应头包含 `X-Request-Id`、`X-Music-Api-Status`，JSON 接口默认不缓存并允许跨域 GET 请求。

### 查询曲库

```bash
curl "http://localhost:3000/api/tracks?limit=20&offset=0"
curl "http://localhost:3000/api/tracks?q=歌曲名"
curl "http://localhost:3000/api/tracks?artist=艺术家&album=专辑"
```

`limit` 默认为 100，最大 500。响应中的每首歌均提供 `urls.self`、`urls.audio` 和有封面时的 `urls.cover`。

### 单曲、封面和播放

```bash
curl "http://localhost:3000/api/tracks/{id}"
curl "http://localhost:3000/api/tracks/{id}/cover" -o cover.jpg
curl "http://localhost:3000/api/tracks/{id}/audio" -o song.mp3
curl -H "Range: bytes=0-1048575" "http://localhost:3000/api/tracks/{id}/audio" -o first-megabyte.bin
```

音频接口响应 `Accept-Ranges: bytes`。有 Range 时状态码为 `206`，不合法的 Range 返回 `416`。

### 服务状态和机器可读文档

```bash
curl "http://localhost:3000/api/health"
curl "http://localhost:3000/api"
```

## 部署到 Vercel

1. 把项目和 `music/` 中的歌曲推送到 Git 仓库。
2. 在 Vercel 导入仓库，Framework Preset 选择 Next.js。
3. 直接部署，不需要额外构建配置。

Vercel 的部署文件系统是只读且不可变的：新增歌曲后需要提交并重新部署。音频会进入部署产物，因此这种方式更适合演示或中小型曲库，也要留意 Git 仓库、部署包和函数传输限制。大文件或持续更新的曲库建议部署到 VPS，或进一步将存储层替换成对象存储。

## 部署到 VPS

### Docker Compose（推荐）

```bash
docker compose up -d --build
```

`./music` 会以只读数据卷挂载到容器的 `/music`。以后直接向宿主机的 `music/` 添加歌曲即可，不需要重建镜像或重启服务。

### 直接运行

```bash
npm ci
npm run build
MUSIC_DIRECTORY=/absolute/path/to/music npm start
```

生产环境建议用 systemd 或 PM2 保持进程运行，并在前面配置 Nginx/Caddy 负责 HTTPS、域名和访问控制。此项目默认是公开只读 API；如果曲库不能公开，应在反向代理层添加鉴权。

## 支持格式

默认扫描 `mp3`、`flac`、`m4a`、`mp4`、`aac`、`ogg`、`opus`、`wav`、`aiff`、`wma`、`ape` 和 `wv`。无法解析的文件不会阻断整个曲库，错误会出现在 `/api/tracks` 的 `data.library.errors` 中。

