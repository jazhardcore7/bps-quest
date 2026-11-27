# Design Decisions: Island Revamp (Office style)

Branch `ui/island-revamp` · Phase 0 · 2026-11-27 · Status: **approved by owner (2026-11-27)**

Rule: **the Office screen decides the visual identity** (see `docs/ISLAND_STYLE_REFERENCE.md`). The skill's accessibility, UX and pre-delivery checklist rules always apply. `docs/PRD_UI_REVAMP.md` does not exist on this branch, so there is no secondary reference.

## 0. How this was generated

- Skill: ui-ux-pro-max 2.15.0, installed as a Claude Code plugin at `~/.claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/2.15.0/.claude/skills/ui-ux-pro-max/`. It is not in either path the task lists.
- Python: `python3` is only the Microsoft Store stub on this machine, so the real Python 3.10.6 was run as `python`. Nothing was installed.
- `search.py --help` was checked first; every flag used below exists in this version.
- No `design-system/` folder existed on this branch, so it was generated:
  - `search.py "cozy indie adventure island exploration map game ui" --design-system --persist -p "Peta Dunia BPS" --output-dir <app root>`
  - the same query with `--page world` and `--page island`
  - domain queries: style (`flat illustration map game`, `game HUD playful`), ux (`map symbology not color alone`, `focus visible keyboard`, `touch target size`, `reduced motion animation`, `excessive motion`, `truncation full value tooltip`), icons (`icon button accessible label`, `decorative icon aria hidden`)
- **Merge note:** the unmerged branch `ui/indie-revamp` also contains `design-system/peta-dunia-bps/` (MASTER.md, DECISIONS.md, pages). Merging both branches will conflict on this folder and must be resolved by hand.
- MASTER.md and `pages/*.md` are kept **unedited** as raw skill output; this file overrides them.

## 1. Accepted from the skill

| ID | Item | Source | How it applies |
| --- | --- | --- | --- |
| A-01 | Neubrutalism traits: thick solid outline, hard offset shadow, flat fills, no gradients on objects | style `flat illustration map game` (result 2) | Matches the plain Office style. Rounded corners follow the Office instead of Neubrutalism's 0px (D-03). |
| A-02 | Never convey meaning by color alone; map categories need a second cue | ux "Map Symbology Not Color Alone", "Color Only" (High) | Each island has its own silhouette and building motif, plus a text pill. "Unit Anda" is a gold pin with text. Own tile shows gold plus the "· Biro Anda" text. |
| A-03 | Visible focus ring on every control | ux "Focus States" (High) | Two-tone ring: 3px gold `#FFD24A` inside, 3px ink `#10263F` outside. Gold vs sea bottom is 3.26:1, gold vs navy 7.62:1. |
| A-04 | Respect `prefers-reduced-motion` | ux "Reduced Motion" (High) | All ambient loops and hover motion off; final state is static. |
| A-05 | Truncate with ellipsis and keep the full value reachable | ux "Truncation" | HUD name: ellipsis only past a generous max width, full name in `title`. Tile labels likewise. |
| A-06 | Icon semantics by context | icons guideline | Decorative SVG `aria-hidden="true"`; icon-only buttons keep their `aria-label`. |
| A-07 | Target size: WCAG 2.2 AA minimum 24px, platform guidance 44px | ux "Target Size", "Touch Target Size" | HUD buttons at least 44px tall in stage px at scale ≥ 1. Sizes at 390×844 are measured and reported, not fixed (task scope). |
| A-08 | Pre-delivery checklist: no emoji icons, pointer only on clickables, 150–300ms hover, contrast 4.5:1, visible focus, reduced motion, responsive check | MASTER.md | Run in the final report. |

## 2. Overridden (Office style wins)

| ID | Skill output | Override | Reason |
| --- | --- | --- | --- |
| D-01 | Pattern "Scroll-Triggered Storytelling" | Not used | Fixed 960×560 stage, no scrolling page. |
| D-02 | Style "Aurora UI": mesh gradients, luminous blends | Flat fills, ink outlines, **hard** offset shadows; gradient only on the existing sea background | The Office is flat. Its shadows are actually soft (canvas blur), but the task defines the plain Office style as having hard offset shadows; recorded as a deliberate deviation from the Office code. |
| D-03 | Neubrutalism sharp corners (0px) | Office radii: buildings 3px (near-square like rooms), cards 16px (existing HUD), pills 12px (existing pills), gold highlight 10px (board-like) | Matches the Office and the existing HUD. |
| D-04 | Palette: orange `#EA580C`, teal `#0891B2`, cream background | Office palette: ink `#10263F`, outline `#1E3A5F`, room pastels, gold `#FFD24A`, existing sea and island colors | Office identity. |
| D-05 | Fonts Amatic SC + Cabin (Google Fonts import) | **System font stack** (the Office canvas font) | The task forbids downloading fonts or adding packages; also no network requests. Recommendation recorded only. |
| D-06 | Style "HUD / Sci-Fi FUI", "Cyberpunk" for game HUD | Not used | Neon/glow conflicts with the Office look and with "no CSS filter". |
| D-07 | Phosphor icons (package) | Inline SVG drawn in the repo | No packages allowed. |
| D-08 | Skill "Excessive Motion" (High): animate at most 1–2 key elements per view; the task allowed up to 12 | **Owner decision: 6 animated elements** (2 clouds, 2 boats, 2 shimmer groups), 12–20s loops, `transform`/`opacity` only, all off under reduced motion | Compromise between the brief and the skill's motion guidance. |

## 3. Contrast findings (measured)

| Pair | Ratio | Result |
| --- | --- | --- |
| White on `pimpinan` pill `#0F3D6E` | 10.98 | OK |
| White on `sestama` pill `#1F8A70` | **4.26** | FAIL, use `#18735D` (5.75) |
| White on `mis` pill `#1C4FA0` | 7.85 | OK |
| White on `sosial` pill `#5B3FB0` | 7.55 | OK |
| White on `produksi` pill `#C06A10` | **3.95** | FAIL, use `#9A520A` (5.86) |
| White on `distribusi-jasa` pill `#A82A40` | 6.84 | OK |
| White on `neraca` pill `#1F7A80` | 5.06 | OK |
| White on `itama` pill `#5A6678` | 5.82 | OK |
| White on island-screen default tile pill `#1C4FA0` | 7.85 | OK (Biro SDM tile currently uses `#1F8A70`, so it gets the sestama fix) |
| Ink `#10263F` on gold `#FFD24A` | 10.63 | OK |
| Board text `#5A4500` on gold | 6.37 | OK |
| Dark gold stroke `#B8860B` vs gold | 2.26 | Below 3:1, so the ink outline goes outside |
| Outline `#1E3A5F` vs sea bottom `#1A78BD` | 2.45 | Below 3:1, so islands are bounded by the sand/foam ring, never by ink on sea |
| XP track `#2C5F93` vs navy card | 1.65 | Below 3:1, so the segmented bar gets outlined cells |
| White / `#CFE6FA` on HUD navy `#0F3D6E` | 10.98 / 8.55 | OK |

The fixed pill fills live in CSS tokens; `src/data/index.js` stays unchanged. A test (`tests/contrast.test.js`) will assert every pill pair is at least 4.5:1.

## 4. Planned tokens (Phase 1, new file `src/styles/island-tokens.css`)

Existing tokens are reused: `--color-ocean-top`, `--color-ocean-bottom`, `--color-island-sand`, `--color-island-grass`, `--color-card-bg`, `--color-card-text`, `--color-card-subtext`, `--color-gold`, and the `--color-*-block` unit tints.

| Token | Value | Role |
| --- | --- | --- |
| `--island-ink` | `#10263F` | Text on light fills, outer focus ring (Office label color) |
| `--island-outline` | `#1E3A5F` | 3px outlines (Office wall color) |
| `--island-outline-w` | `3px` | Outline weight |
| `--island-shallow` | `#A8DFF5` | Shallow-water ring |
| `--island-foam` | `#FFFFFF` | Foam line |
| `--island-grass-shade` | `#5DB04A` | Grass lower lip |
| `--island-tree` | `#3F8F45` | Tree crowns |
| `--island-trunk` | `#8A5A3B` | Tree trunks, crates |
| `--room-blue` / `--room-gray` / `--room-green` / `--room-cream` | `#CFE3F7` / `#D9D9E3` / `#D5ECD0` / `#F7E6C4` | Building walls (Office room pastels) |
| `--room-window` | `#E8EEF6` | Window grid (Office floor) |
| `--board-gold` | `var(--color-gold)` = `#FFD24A` | "Unit Anda" / own-tile highlight |
| `--board-gold-stroke` | `#B8860B` | Inner stroke of the gold highlight |
| `--board-gold-text` | `#5A4500` | Text on gold when not ink |
| `--pill-sestama` | `#18735D` | Darkened pill (contrast fix) |
| `--pill-produksi` | `#9A520A` | Darkened pill (contrast fix) |
| `--shadow-hard` | `0 4px 0 rgba(16, 38, 63, 0.35)` | Resting hard shadow |
| `--shadow-hard-hover` | `0 7px 0 rgba(16, 38, 63, 0.35)` | Hover (lift 3px) |
| `--shadow-pressed` | `0 1px 0 rgba(16, 38, 63, 0.35)` | Active press |
| `--focus-ring` | `0 0 0 3px var(--color-gold), 0 0 0 6px var(--island-ink)` | Keyboard focus |
| `--radius-building` / `--radius-gold` / `--radius-pill` / `--radius-card` | `3px` / `10px` / `12px` / `16px` | Shapes (D-03) |
| `--dur-fast` / `--dur-base` | `120ms` / `200ms` | Hover/press feedback |
| `--ambient-slow` / `--ambient-slower` | `14s` / `20s` | Cloud, boat, shimmer loops |
| `--hud-xp-cell-empty` / `--hud-xp-cell-edge` | `#2C5F93` / `#CFE6FA` | Segmented XP bar (cell edge 8.55:1 on navy) |
