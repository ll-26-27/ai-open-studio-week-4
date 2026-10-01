# ai-open-studio-week-4

The Learning Lab's AI Open Studio, week 4 (Thursday 2026-10-01, 1:30–3:00, mostly Nieman Fellows), and the BGF AI Lab the same day. The week's theme is **lists**. The plan is one build with slight variations for the two groups: a Beyond the Chat Box-style intro with lists in mind, plus getting people set up on agent harnesses, Claude Code in particular.

- **`_context/`**: planning context, one level above the app. It is read by people and agents, never rendered. The planning notes for the week stay in the private mk-27 workbook; this repo is public.
- **`.claude/skills/shotlist/`**: a Claude Code skill that checks a folder of stills (usually `_media/<shoot>/`) for coverage, the way `/shot-list` does but with Claude looking at the photos itself. It writes `coverage.md` into the shoot folder. `shoots/` holds three sample `shoot.md` files with different coverage needs: an interview, a process or demonstration, and an event.
- **`nextjs/`**: the app.
- **`_media/`**: gitignored, local only. Put raw stills from shoots here (one folder per shoot, say `_media/20261001-test-shoot/`) and drag them onto `/shot-list` from there; nothing in it is committed.
- **`nextjs/content/`**: the Markdown the app renders. Each folder is a group, and each file is a page. A new folder becomes a new group on the site, and new files show up on refresh. `content/README.md` is the home page; its frontmatter can set `title:`, `groups:` (the group order) and `features:` (cards at the top: `- page: guides/setup` with an optional `label:` and `description:`). A group's `README.md` can set `title:`, `description:` and `order:`.

| URL | What |
| --- | --- |
| `/` | The studio home: the intro, any featured pages, then every group and page |
| `/<group>` | One group's pages |
| `/<group>/<page>` | One page |
| `/shot-list` | Upload a shoot's stills (in order), say what you were shooting, paste a planned shot list if there is one, and a vision model on OpenRouter (Gemini 3.1 Pro or 3.8 Flash) reads them like a field producer or script supervisor: each shot's size and angle, a covered / partial / missing checklist, continuity and technical flags, pickups to get before you leave, a rough cut order, and a copy-as-Markdown report. Needs `OPENROUTER_API_KEY` in `nextjs/.env.local` (see `.env.example`); nothing is saved |
| `/print` | Light print versions: any page on Letter (`/print/<group>/<page>`), a whole group, everything (`/print/all`), or the set named by `print_set:` in `content/README.md` (`/print/set`) |

Players: write one like an image whose address is the page you'd share, e.g. `![title](https://www.youtube.com/watch?v=…)`. YouTube, Vimeo, Spotify, TikTok, Instagram, Apple Podcasts, Apple Music, SoundCloud, and Giphy become players (see `nextjs/lib/embeds.mjs`). Mermaid code blocks render as diagrams.

## Run it

```sh
cd nextjs
pnpm install
pnpm dev
```

Open the localhost address it prints.

## Where this came from

The app was copied on 2026-10-01 from [tdm155ai-week-4](https://github.com/tdm155ai/tdm155ai-week-4) (Inter type, dark site with light `/print`, docs layout). The output gallery, the generation `utils/` and the list-specific home page were left out. One change from that repo: here the content lives inside the app (`nextjs/content/`), and the planning context sits one level above it (`_context/`). Planning for the Lab week is in the mk-27 workbook (`_context/20-in-focus/ll-plan-26-27/weeks/04-ending-20261002/`).
