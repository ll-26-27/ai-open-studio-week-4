# ai-open-studio-week-4

The Learning Lab's AI Open Studio, week 4 (Thursday 2026-10-01, 1:30–3:00, mostly Nieman Fellows), and the BGF AI Lab the same day. The week's theme is **lists**. The plan is one build with slight variations for the two groups: a Beyond the Chat Box-style intro with lists in mind, plus getting people set up on agent harnesses, Claude Code in particular.

- **`_context/`**: planning context, one level above the app. It is read by people and agents, never rendered. It starts with the Thursday sections of Marlon's `20261001 Plans` canvas, verbatim, in `_context/sources/`.
- **`nextjs/`**: the app.
- **`nextjs/content/`**: the Markdown the app renders. Each folder is a group, and each file is a page. A new folder becomes a new group on the site, and new files show up on refresh. `content/README.md` is the home page; its frontmatter can set `title:`, `groups:` (the group order) and `features:` (cards at the top: `- page: guides/setup` with an optional `label:` and `description:`). A group's `README.md` can set `title:`, `description:` and `order:`.

| URL | What |
| --- | --- |
| `/` | The studio home: the intro, any featured pages, then every group and page |
| `/<group>` | One group's pages |
| `/<group>/<page>` | One page |
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
