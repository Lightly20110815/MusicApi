import { apiSuccess, optionsResponse, requestContext } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = requestContext();
  const origin = new URL(request.url).origin;

  return apiSuccess(
    {
      name: "Music API",
      version: "1.0.0",
      description: "读取 music 目录中的音频元数据、专辑封面并提供音频流。",
      endpoints: [
        {
          method: "GET",
          path: "/api/health",
          description: "检查服务和曲库目录状态",
        },
        {
          method: "GET",
          path: "/api/tracks?q=&artist=&album=&limit=100&offset=0",
          description: "列出、搜索和分页查询歌曲",
        },
        {
          method: "GET",
          path: "/api/tracks/{id}",
          description: "获取一首歌曲的完整元数据",
        },
        {
          method: "GET",
          path: "/api/tracks/{id}/cover",
          description: "返回歌曲内嵌的专辑封面",
        },
        {
          method: "GET",
          path: "/api/tracks/{id}/audio",
          description: "返回音频流，支持 Range 请求和拖动播放",
        },
      ],
      examples: {
        list: `curl '${origin}/api/tracks?limit=20'`,
        search: `curl '${origin}/api/tracks?q=keyword'`,
        stream: `curl -H 'Range: bytes=0-1048575' '${origin}/api/tracks/{id}/audio' -o sample.bin`,
      },
    },
    context,
  );
}

export function OPTIONS() {
  return optionsResponse();
}

