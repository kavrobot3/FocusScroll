interface Env {
  YOUTUBE_API_KEY: string;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  next: (input?: RequestInfo, init?: RequestInit) => Promise<Response>;
  params: Record<P, string | string[]>;
  data: Data;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
}

type PagesFunction<Env = unknown, P extends string = string, Data = Record<string, unknown>> = (
  context: EventContext<Env, P, Data>
) => Promise<Response> | Response;

interface YTVideo {
  videoId: string;
  title: string;
  channel: string;
  durationSec: number;
  thumbnail: string;
}

const SEARCH_QUERIES = [
  'shorts nature',
  'shorts cooking',
  'shorts animals',
  'shorts sports',
  'shorts diy',
  'shorts science',
  'asmr shorts',
  'travel shorts',
  'shorts fitness',
  'shorts gaming',
  'shorts technology',
  'shorts art',
  'shorts satisfying',
  'shorts music',
];

function parseISODuration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + min * 60 + s;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const apiKey = env ? env.YOUTUBE_API_KEY : undefined;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        source: 'fallback',
        message: 'YouTube unavailable.',
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const allIds = new Set<string>();
    const shuffledQueries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5).slice(0, 4);

    for (const q of shuffledQueries) {
      try {
        const searchUrl =
          `https://www.googleapis.com/youtube/v3/search` +
          `?part=id&type=video&videoDuration=short&videoDimension=2d` +
          `&maxResults=25&q=${encodeURIComponent(q)}&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as { items?: Array<{ id?: { videoId?: string } }> };
          for (const item of searchData.items || []) {
            if (item.id?.videoId) {
              allIds.add(item.id.videoId);
            }
          }
        }
      } catch {
        // continue with remaining queries
      }
    }

    if (allIds.size === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          source: 'fallback',
          message: 'YouTube unavailable.',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const idsArray = Array.from(allIds);
    const chunks: string[][] = [];
    for (let i = 0; i < idsArray.length; i += 50) {
      chunks.push(idsArray.slice(i, i + 50));
    }

    const videos: YTVideo[] = [];
    for (const chunk of chunks) {
      const detailsUrl =
        `https://www.googleapis.com/youtube/v3/videos` +
        `?part=contentDetails,snippet&id=${chunk.join(',')}&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl);
      if (!detailsRes.ok) continue;

      const detailsData = (await detailsRes.json()) as {
        items?: Array<{
          id: string;
          contentDetails?: { duration?: string };
          snippet?: {
            title?: string;
            channelTitle?: string;
            thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
          };
        }>;
      };

      for (const item of detailsData.items || []) {
        const dur = parseISODuration(item.contentDetails?.duration || '');
        const thumb =
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          '';
        videos.push({
          videoId: item.id,
          title: item.snippet?.title || '',
          channel: item.snippet?.channelTitle || '',
          durationSec: dur,
          thumbnail: thumb,
        });
      }
    }

    const filtered = videos
      .filter((v) => v.durationSec >= 8 && v.durationSec <= 90)
      .sort((a, b) => a.durationSec - b.durationSec);

    if (filtered.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          source: 'fallback',
          message: 'YouTube unavailable.',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        source: 'youtube',
        videos: filtered,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        source: 'fallback',
        message: 'YouTube unavailable.',
      }),
      { status: 200, headers: corsHeaders }
    );
  }
};
