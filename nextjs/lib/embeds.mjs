// Media embeds. In the Markdown, an embed is written like an image whose address is the page you'd share:
//
//   ![Luis Fonsi — Despacito](https://www.youtube.com/watch?v=kJQP7kiw5Fk)
//
// Obsidian shows YouTube links written that way as players too. Anything that isn't a known player
// and is an https address is shown as an image.
//
// `embed(url)` returns { provider, src, shape, link } or null. `shape` sets the frame: "video" (16:9),
// "vertical" (9:16, TikTok and Shorts), "square", or a fixed pixel height for audio players.

function youtubeId(url) {
  if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
  if (url.pathname === "/watch") return url.searchParams.get("v");
  const match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,})/);
  return match?.[1] || null;
}

function youtubeStart(url) {
  const t = url.searchParams.get("t") || url.searchParams.get("start");
  if (!t) return "";
  const match = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) return "";
  const seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  return seconds ? `?start=${seconds}` : "";
}

const providers = [
  {
    name: "YouTube",
    test: (url) => /(^|\.)youtube\.com$|^youtu\.be$/.test(url.hostname),
    build(url) {
      const list = url.searchParams.get("list");
      if (url.pathname === "/playlist" && list) return { src: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`, shape: "video" };
      const id = youtubeId(url);
      if (!id) return null;
      return { src: `https://www.youtube-nocookie.com/embed/${id}${youtubeStart(url)}`, shape: url.pathname.startsWith("/shorts/") ? "vertical" : "video" };
    },
  },
  {
    name: "Vimeo",
    test: (url) => /(^|\.)vimeo\.com$/.test(url.hostname),
    build(url) {
      const id = url.pathname.match(/\/(\d+)/)?.[1];
      return id ? { src: `https://player.vimeo.com/video/${id}`, shape: "video" } : null;
    },
  },
  {
    name: "Spotify",
    test: (url) => url.hostname === "open.spotify.com",
    build(url) {
      const match = url.pathname.match(/^\/(?:intl-[\w-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
      if (!match) return null;
      const [, kind, id] = match;
      return { src: `https://open.spotify.com/embed/${kind}/${id}`, shape: kind === "track" || kind === "episode" ? 152 : 352 };
    },
  },
  {
    name: "TikTok",
    test: (url) => /(^|\.)tiktok\.com$/.test(url.hostname),
    build(url) {
      const id = url.pathname.match(/\/video\/(\d+)/)?.[1];
      return id ? { src: `https://www.tiktok.com/player/v1/${id}?description=1`, shape: "vertical" } : null;
    },
  },
  {
    name: "Instagram",
    test: (url) => /(^|\.)instagram\.com$/.test(url.hostname),
    build(url) {
      const match = url.pathname.match(/^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/);
      if (!match) return null;
      return { src: `https://www.instagram.com/${match[1] === "reels" ? "reel" : match[1]}/${match[2]}/embed/captioned/`, shape: "instagram" };
    },
  },
  {
    name: "Apple Podcasts",
    test: (url) => url.hostname === "podcasts.apple.com",
    build: (url) => ({ src: `https://embed.podcasts.apple.com${url.pathname}${url.search}`, shape: url.searchParams.has("i") ? 175 : 450 }),
  },
  {
    name: "Apple Music",
    test: (url) => url.hostname === "music.apple.com",
    build: (url) => ({ src: `https://embed.music.apple.com${url.pathname}${url.search}`, shape: url.searchParams.has("i") || url.pathname.includes("/song/") ? 175 : 450 }),
  },
  {
    name: "SoundCloud",
    test: (url) => /(^|\.)soundcloud\.com$/.test(url.hostname) && url.hostname !== "w.soundcloud.com",
    build: (url) => ({ src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}&visual=false`, shape: 166 }),
  },
  {
    name: "Giphy",
    test: (url) => /(^|\.)giphy\.com$/.test(url.hostname),
    build(url) {
      const id = url.pathname.match(/\/(?:gifs|embed)\/(?:[\w-]*-)?([A-Za-z0-9]+)$/)?.[1];
      return id ? { src: `https://giphy.com/embed/${id}`, shape: "square" } : null;
    },
  },
];

export function embed(address) {
  let url;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  for (const provider of providers) {
    if (!provider.test(url)) continue;
    const built = provider.build(url);
    if (built) return { provider: provider.name, link: url.href, ...built };
  }
  return null;
}
