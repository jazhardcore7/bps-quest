# Design Decisions: Peta Dunia BPS "Cozy Archipelago"

Phase 0 reconciliation of the ui-ux-pro-max output against `docs/PRD_UI_REVAMP.md` section 5.
Rule applied: **PRD section 5 wins on visual identity. The skill's UX, accessibility and pre-delivery rules always apply.**
Status: **waiting for owner approval** (2026-11-25).

## 0. How this was generated

- Skill: ui-ux-pro-max 2.15.0, installed as a Claude Code plugin at
  `~/.claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/2.15.0/.claude/skills/ui-ux-pro-max/`.
  It is not in either of the two paths the PRD lists, but it is the same skill.
- Python: `python3` on this machine is only the Microsoft Store stub, so the real interpreter `python` (3.10.6) was used. Nothing was installed.
- Commands run (with `--output-dir` set to the project root):
  - `search.py "cozy indie adventure game exploration gamification workplace" --design-system --persist --preview --tokens css -p "Peta Dunia BPS"`
  - Same query with `--page` set to `world`, `office`, `panel`, `leaderboard`, `login`.
  - Domain queries: style `game HUD playful tactile`. Typography `pixel retro game readable`. google-fonts `pixel display`, `Pixelify Sans`, `Nunito rounded sans`. ux `modal dialog focus trap`, `focus visible keyboard`, `reduced motion animation`, `touch target size`, `color not only meaning`, `toast status live region`, `game HUD progress bar`. icons `decorative icon aria hidden`, `icon button accessible label`. The `inline svg icon set` query returned nothing; the icon guideline row above covers it.
- Generated files: `MASTER.md`, `tokens.json`, `tokens.css`, `preview.html`, `pages/*.md`. They are kept **unedited** as the raw skill output. **This file overrides them.** The Phase 1 source of truth will be `src/styles/tokens.css`, built from section 3 below.

## 1. Accepted from the skill

| Item | Source | How it applies here |
| --- | --- | --- |
| Modal dialog focus: move in on open, trap Tab, Escape closes, return focus to opener | ux "Modal Dialog Focus" (High) | Matches guardrail 2. The info panel and quest sheet keep their current behavior. |
| Visible focus ring on every control, including inside modals | ux "Focus States" (High) | Two-tone ring token (section 3). |
| Respect `prefers-reduced-motion` | ux "Reduced Motion" (High) | Turns off ambient loops, bobbing and bursts. |
| Animate only 1 or 2 key elements per view | ux "Excessive Motion" (High) | Per view, at most one hero motion (island bob or board glow) plus slow ambient loops. |
| Never use color alone for meaning | ux "Color Only", "Map Symbology" (High) | Locked state = lock icon + text. Done state = stamp + "Selesai". Correct or wrong answer = icon + text. Selected tab = weight + underline bar. Leaderboard medals = number + color. |
| Toasts are transient status messages | ux "Toast Notifications" | `role="status"`, a single live region, focus never moves. Duration: see open question Q1. |
| Icon semantics depend on context | icons guideline | Decorative icons get `aria-hidden="true"`. Icon-only buttons get `aria-label`. One icon family per surface. |
| Phosphor as the primary icon family | icons guideline | **Phosphor "Bold" weight**, copied into the repo as inline SVG (MIT license). Its chunky strokes suit the 3px ink outline style. No package, no CDN. |
| Tactile press: pressed shadow, bounce easing | style "Tactile Digital" | Kept as hard-shadow collapse plus a 2px translate. The style's scale-squish, chrome, gloss and `filter: brightness` are rejected. |
| No emoji as icons, consistent icon sizes and stroke | pre-delivery checklist | Icon size tokens `--icon-s/m/l`. |
| Hover/press transitions of 150 to 300ms, no instant state changes | MASTER anti-patterns | Timing tokens are 120 to 250ms (PRD). Reduced motion gets instant changes, which the PRD allows. |
| `cursor: pointer` on clickable elements | MASTER anti-patterns | Only on real `<button>`/`<a>`. Never on non-interactive elements (PRD 11). |
| Test at 375, 768, 1024 and 1440 widths | checklist | Merged with PRD 9.7: 390x844, 768x1024, 1024x768, 1440x900. |
| Pressed state never shifts layout | pro-rules | Use transforms only, which do not affect layout. |

## 2. Overridden (PRD wins)

| Skill output | Override | Reason |
| --- | --- | --- |
| Category "Idle & Clicker Game", style "Vibrant & Block-based" | "Cozy Archipelago": tactile, warm, readable, trustworthy | PRD 5. This is a workplace tool, not a clicker game. |
| Palette: amber `#D97706`, gold `#F59E0B`, **purple `#7C3AED` CTA**, cream bg | PRD palette: ink navy, ocean, sand, grass, paper, gold, coral (section 3) | PRD 5 mood. A purple CTA has no place in a sea/sand world. |
| Fonts Amatic SC + Cabin (suggestion: Press Start 2P + VT323) | **Pixelify Sans** (display) + **Nunito** (body) | Amatic SC is a thin handwritten face and reads poorly at HUD sizes. Press Start 2P is very wide and VT323 is not readable as body text. Pixelify Sans was a PRD candidate: it has lowercase, 400 to 700 weights and latin-ext, and it is legible at 14px or more. It was chosen over Silkscreen, which is mostly caps and blurs below 16px. Nunito's rounded humanist shapes match the cozy tone. Both are OFL. |
| Google Fonts `@import` | Self-hosted woff2 in `public/fonts/`, `font-display: swap`, preloaded | Guardrail 3: no CDN or runtime network calls other than Firebase. |
| Soft blur shadows `--shadow-sm..xl` | `--shadow-hard` / `--shadow-pressed` only. The office info board glow is the single blur exception. | PRD 7, Depth. |
| Modal overlay `backdrop-filter: blur(4px)` | Solid scrim `rgba(15,42,74,.55)` | PRD 12: avoid `filter` and blurs. |
| `transition: all 200ms ease` | Transition `transform`, `opacity`, and color/shadow for small controls only | PRD 10. |
| Cards with `cursor: pointer` and hover lift by default | Static panels have no pointer and no hover. Only interactive tiles lift. | PRD 11. |
| Anti-pattern "Muted colors" | Muted palette allowed **only** for locked islands, together with a lock icon and text | PRD 9.2. |
| Page pattern "Feature-Rich Showcase" (hero, features, CTA) | Not used | This is an app with a fixed 960x560 stage, not a marketing site. |
| Page overrides "Max width 1200px, full-width sections" | Not used | The stage size from `src/data/index.js` is the layout truth (PRD 9.2). |
| World page "realistic shadows, noise/grain texture, 300–500ms" | Flat vector + hard shadows, no noise textures, UI 120–250ms, ambient loops 6–20s | PRD 3/10/12: no raster, no filters. |
| Spacing names `--space-xs..3xl` (16–64px default) | `--space-1..8` on a 4px base | PRD 7. |
| Touch target note "WCAG minimum 24px" | 44px minimum, 56px for the D-pad | The PRD is stricter, so it wins. |
| Skill `tokens.css` names (`--color-primary`, …) | PRD names (`--ink`, `--paper`, …) | PRD 7 table. |

## 3. Reconciled token list (planned for `src/styles/tokens.css` in Phase 1)

### Color

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#0F2A4A` | Text, 3px outlines, icons |
| `--ink-soft` | `#4A5D75` | Secondary text (6.37:1 on paper) |
| `--ink-shadow` | `rgba(15,42,74,.25)` | Hard shadow color |
| `--scrim` | `rgba(15,42,74,.55)` | Modal backdrop |
| `--paper` | `#FFF8E7` | Panels, cards |
| `--ocean-1` | `#3BB4E6` | Shallow water. Ink text OK (6.11) |
| `--ocean-2` | `#2A96D6` | Mid water. **Background only**, no text |
| `--ocean-3` | `#1B78C4` | Deep water. White text OK (4.64) |
| `--sand` | `#F2DC9B` | Beaches, quest-sheet ground |
| `--grass` / `--grass-shade` | `#7CCF63` / `#4FA64A` | Island tops. Ink text only |
| `--gold` | `#FFC93C` | Rewards, primary button, current-user row |
| `--gold-deep` | `#8A5A00` | Gold-family text on paper (5.60) |
| `--success` | `#2E7D32` | "Selesai", correct answer. Text OK on paper (4.84) and white-on (5.13) |
| `--danger` | `#E8594F` | Coral for fills, icons, boundaries (non-text) |
| `--danger-strong` | `#B8352C` | Error text on paper (5.53), white-on (5.86) |
| `--locked` | `#B7C2CF` | Locked island wash. Ink text 8.02 |
| `--medal-gold/silver/bronze` | `#FFC93C` / `#C9D3DE` / `#D9925B` | Rank medallions, always with the rank number in ink |
| `--focus-inner` / `--focus-outer` | `--gold` / `--ink` | Two-tone focus ring |
| `--unit-<id>` | see below | Pill fills, white text |

Unit pills, white text, verified against 4.5:1:

| Unit | Current `pillColor` | Ratio | Token value |
| --- | --- | --- | --- |
| kepala | `#0F3D6E` | 10.98 | same |
| sestama | `#1F8A70` | **4.26 fail** | `#18735D` (5.75) |
| metodologi | `#1C4FA0` | 7.85 | same |
| sosial | `#5B3FB0` | 7.55 | same |
| produksi | `#C06A10` | **3.95 fail** | `#9A520A` (5.86) |
| distribusi | `#A82A40` | 6.84 | same |
| neraca | `#1F7A80` | 5.06 | same |
| itama | `#5A6678` | 5.82 | same |

`blockColor` values in `src/data/index.js` stay as the illustration tints (non-text) and the data file is not edited. The `--unit-*` tokens live in `tokens.css`. Hex values in `src/data/index.js` are an **intentional exception** for acceptance check 3.

### Contrast notes that shape components

- Gold on paper is 1.45:1, so gold elements on paper always carry the 3px ink outline. The focus ring is two-tone (3px gold inside, 2px ink outside), which keeps ≥3:1 on paper, sand, ocean and ink.
- White text on coral is 3.52:1, so the danger button uses `--danger-strong` and coral is kept for icons and borders.
- White text on ocean-2 is 3.26:1, so ocean-2 is never used behind text.
- The ink outline against ocean-3 is 3.12:1, which passes 3:1 for UI boundaries.

### Type

| Token | Value |
| --- | --- |
| `--font-display` | `"Pixelify Sans", "Trebuchet MS", system-ui, sans-serif`. Titles, badges, numbers only, never paragraphs |
| `--font-body` | `"Nunito", "Segoe UI", system-ui, -apple-system, sans-serif` |
| Weights (4 total) | Pixelify Sans 600; Nunito 400 / 700 / 800 |
| `--fs-1..6` | 12 / 14 / 16 / 20 / 26 / 34 px (labels ≥12, body 14–16) |
| `--lh-tight` / `--lh-body` | 1.15 / 1.5 |

### Space, shape, depth, motion, layers, icons

| Token | Value |
| --- | --- |
| `--space-1..8` | 4, 8, 12, 16, 20, 24, 32, 48 px |
| `--radius-s/m/l` | 6 / 10 / 16 px |
| `--border-w` | 3px |
| `--shadow-hard` | `0 4px 0 var(--ink-shadow)` |
| `--shadow-pressed` | `0 1px 0 var(--ink-shadow)` |
| `--glow-board` | `0 0 18px rgba(255,201,60,.65)` (only blur allowed) |
| `--dur-fast` / `--dur-base` / `--dur-slow` | 120ms / 200ms / 250ms |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` |
| `--ease-bounce` | `cubic-bezier(.34,1.56,.64,1)` |
| `--z-stage/hud/modal/toast` | 1 / 10 / 100 / 1000 |
| `--icon-s/m/l` | 16 / 20 / 24 px |
| `--tap-min` / `--dpad-min` | 44px / 56px |
| `--stage-min-scale` | 0.7 |

## 4. Component direction (text spec for approval)

**Button.** The base is a 44px+ tall pill-cornered block (`--radius-m`) with a 3px ink outline and `--shadow-hard`. The label is Nunito 800.
- Primary: gold fill with ink text (9.43:1). Primary-alt: navy fill with white text.
- Secondary: paper fill. Ghost: no fill or shadow, ink outline only on hover/focus.
- Hover: lift 2px (`translateY(-2px)`) and the shadow grows to 6px.
- Active: `translateY(3px)` and the shadow collapses to `--shadow-pressed`, so it feels like pressing a physical key.
- Disabled: paper fill, `--ink-soft` text, dashed outline, no shadow, native `disabled`.
- Locked: like disabled, with a lock icon and the text "Terkunci".
- Focus: two-tone ring.

**HUD.** Two floating sticker cards at the top of the stage, paper fill with ink outline and hard shadow.
- Left card: a round icon back button, then the screen title in Pixelify Sans with a small caption under it.
- Right card: a circular avatar frame (initials on a unit-color disc, gold ring at max level), "Level N · Title" in display type, and a segmented XP bar (10 ink-outlined cells filling gold) with a numeric "120 / 300 XP" label beside it. The bar is not the only way to read progress.
- After that come square 44px trophy and logout icon buttons with `aria-label`.
- Below 768px wide the right card collapses: level, a compact bar, then the icons.

**Island tile (world map).** One inline SVG per unit, inside the existing island rectangle, built in layers:
1. An `--ocean-1` shallow ring, drawn as an irregular blob from a deterministic seed per unit id.
2. A sand rim, then a grass top with a `--grass-shade` lower lip for depth.
3. Two or three round trees.
4. A small house with a roof in the unit's `blockColor` and an ink outline.

A ticket-style name pill in `--unit-<id>` with white text sits under the island.
- **Unlocked:** gold star badge, a gentle 3px bob on an 8s loop, and on hover or focus a 4px lift plus the focus ring around the whole tile.
- **Locked:** the grass and sand wash toward `--locked`, a soft cloud SVG covers half the island, and the pill gets a lock icon and "Terkunci" text. A tap still shows the "Pulau ini segera hadir" toast.
- Reduced motion: no bob, no clouds drifting.

## 5. Resolved (owner answers, 2026-11-25)

- **Q1:** toasts stay visible for **3 seconds** (`TOAST_DEFAULT_MS` in `src/ui/toast.js`). The explicit `2000` arguments in `world.js` and `island.js` were removed in Phase 2 so those toasts use the 3s default. The level-up toast passes its own 3200ms, which is already longer.
- **Small screens (Phase 2):** below 768px the stage holds `--stage-min-scale` (0.7). When it overflows, `#stage-viewport` becomes a native scroller, which gives touch drag-pan and starts centered. The scaler moved to `src/stage.js`, and `main.js` still exports `updateStageScale`.
- **Office (Phase 3):** the Canvas art lives in `src/ui/office-art.js`. Colors and fonts come from `tokens.css` through a single `getComputedStyle` read at mount. The static layer is drawn into an offscreen canvas and rebuilt only on `resize` (which also covers zoom and devicePixelRatio changes) or once web fonts are ready. Its density is devicePixelRatio × stage scale, capped at 3. `ROOMS`, `FLOOR`, `BOARD`, spawn, speed, collision, `gameLoop` and `unmount` are byte-identical to `main`. The one exception is `ROOMS.concat([BOARD])`, which is now built once as `OBSTACLES` (same contents) to remove a per-move allocation. Walk frames and facing are derived from the position change between frames, so the physics are never touched. The unused `fill`/`stroke` hex values in `FLOOR`, `ROOMS` and `BOARD` are an intentional exception: those data literals are protected by PRD 9.4. The canvas frame uses box-shadow, not border, so the click mapping, which reads `getBoundingClientRect`, is unchanged.
- **Raw hex exceptions (acceptance check 3):** `src/styles/tokens.css` (the source of truth) and `src/data/index.js` (unit data, unchanged). Everything still in `style.css`, `hud.js`, `panel.js`, `office.js`, `leaderboard.js` and `login.js` belongs to screens that Phases 3–5 have not restyled yet.
- **Q2:** the owner will supply the woff2 files. `src/styles/fonts.css` already points to `public/fonts/` and the fallback stacks apply until then. Expected filenames are in `public/fonts/README.md`. Preload links get added once the files exist, because preloading a missing file only causes a 404.
- **Icon family change (Phase 1):** the icons use **Lucide** geometry (ISC), not Phosphor Bold. Phosphor Bold icons are complex filled outlines that cannot be copied accurately without its package, and guardrail 3 forbids adding the package. Lucide is simple stroke geometry, redrawn in `src/ui/icons.js` at stroke-width 2.5 to suit the chunky outline style. The PRD allows either library. The coin and filled star are custom.
- **Toast announcements:** the visible toast is `aria-hidden`. A persistent `role="status"` region outside `#stage` does the announcing. A freshly inserted live region is often not announced, and `#stage` gets re-rendered on every route change.

## 6. Original open questions

- **Q1 Toast duration.** PRD 8 says auto-hide after 2s. The skill's UX rule (and WCAG 2.2.1 Timing) suggests 3–5s so people can read it. Recommendation: **3s** for all toasts. The +XP value also persists in the HUD XP bar, so nothing is lost if a toast is missed. Need a yes/no because it touches accessibility (guardrail 6).
- **Q2 Font files.** Phase 1 needs the Pixelify Sans and Nunito woff2 files (OFL) in `public/fonts/`. Download them from the official google/fonts GitHub repo, or will you supply them? No `@fontsource/*` package either way.

## 7. Phase 4 notes (HUD, info panel, quest sheet, level-up)

- **displayName escaping:** `src/ui/escape.js` copies the `escapeHtml` approach from `panel.js`. `hud.js` uses it for the name, title, level, XP values and initials, and also for `renderLeftCard` title and subtitle. The `leaderboard.js` row template gets the same treatment in Phase 5. Verified with a hostile name: the text shows literally and no element is created.
- **Behavior kept:** the footer still branches only on `AppState.canStartQuest(unit)`, and with another unit there is no `<button>` in the footer. The panel keeps `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape and backdrop close, and focus return. Claim and quiz logic are unchanged; only markup and classes changed.
- **Level-up:** the emoji toast that followed a claim was removed. `src/ui/levelup.js` now watches `AppState`: the first profile load per user sets a baseline, and a later level increase shows a non-modal overlay. It never takes focus, and Escape (handled in the capture phase) closes only the overlay. It also dismisses on click or after 4s and is announced through the shared status region. The burst is CSS-only, 1.2s, and static under reduced motion.
- **Additive exports:** `announce` (hud.js) and `renderQuestsList` (panel.js, used by the dev preview to render sample quests). All existing exports and signatures are unchanged.
- **D-pad docking (approved by owner):** below 768px the office D-pad moves to `<body>` as a fixed control (56px real size, safe-area aware), and it is hidden while the info panel is open. `unmount` removes it explicitly. This is the only change to office cleanup, and it was verified with three remounts.
- **Quiz feedback icon:** the wrong-answer icon is a CSS mask on `.quiz-error-msg::before` using an inline `data:` SVG. It is not a network request, and the message text is still set by the existing logic.

## 8. Phase 5 notes (leaderboard, login, narrow-screen sizing)

- **Leaderboard escaping:** every text value in the rows and podium (`displayName`, unit label, rank, level, XP) goes through `escapeHtml` in `renderRowHtml` and the podium template. Verified with an `<img onerror>` name: the text shows literally and no element is created.
- **Leaderboard layout:** the podium for ranks 1–3 is in DOM order 1-2-3 and shown as 2-1-3 through CSS `order`, so screen readers read it in rank order. Ranks 4 and up go in an `<ol start="4">`. The current user is marked with a gold fill plus a "Kamu" text tag. Medals show the rank number, with color as a second cue only. The emoji medals and trophy were replaced by medallions and an inline SVG empty-state illustration. The refresh button shows a spinner and `aria-busy` while loading. Chips now expose `aria-pressed`.
- **Data and sorting untouched:** `fetchLeaderboard`, `sortLeaderboardUsers`, `filterUsersByUnit`, the period XP and the pinned-row rule are unchanged.
- **Login:** a title screen with the sea ambient layer, three decorative islands, the "Peta Dunia BPS" wordmark (`h1`), and a menu card whose ribbon `h2` reads "Masuk" or "Buat Akun Pegawai". All IDs, handlers and auth calls are unchanged. The inline error is icon plus text (CSS mask). The "Buat akun" link is ink with an ocean underline, because ocean-3 on paper is only about 4.4:1.
- **Google "G" mark (raw hex exception):** the existing four-color Google mark stays in `login.js`. It is the auth provider's sign-in mark, required by Google's branding guidelines for "Masuk dengan Google", and it was already in the app. It is the only raw hex left in screen markup.
- **Login docking on narrow screens:** below 768px the stage is held at 0.7 scale, which made the form 31px tall with about 11px text. `login.js` now docks its screen on `<body>` at real size: fixed, scrollable, 44px controls, 16px inputs. `unmount` removes it explicitly along with the resize listener. Queries go through `root()` so error, loading and toggle still work while docked.
- **Narrow-screen target sizing (all stage screens):** when the stage is at minimum scale, `.btn`, `.chip`, `.segmented__btn`, `.info-row-btn` and `.quiz-option-item` inside the stage grow to 64 stage px (44.8px on screen), and the panel content scrolls inside the dialog card. Measured at 390px: 45px.
- **Known gap for Phase 6:** at exactly 768px (not "below 768") the stage scale is 0.8, so 44px controls are about 35px on screen. The PRD's 44px rule is stated for below 768px. Revisit in QA.

## 9. Phase 6 notes (QA and cleanup)

- **Dead CSS:** `style.css` was reduced to resets, the dev bar and the stage. 30 of the 34 legacy `--color-*` variables had no references and were removed. The dev bar now uses `--devbar-*` tokens and the shared focus ring (its `outline: none` was dropped). The duplicate `--glow-board` token was removed; Canvas uses `--board-glow`. `--ocean-2`, `--z-stage` and `--fw-regular` stay because they are part of the PRD token table.
- **Scale-aware targets:** `src/stage.js` sets `--stage-scale` on `#stage`. In-stage controls (`.btn`, `.chip`, `.segmented__btn`, `.info-row-btn`, `.quiz-option-item`, `.login-input`, HUD icons, D-pad) use `--tap-stage: max(44px, 44px / scale)`, so they measure at least 44px on screen at every scale. This replaces the Phase 5 rules that only applied while panning, and it closes the 768px gap. The inline text link uses at least 24px (WCAG 2.5.8).
- **Contrast fix:** a completed quest card now uses the paper background. The "Selesai" text was 4.32:1 on paper-shade and is 4.84:1 on paper.
- **QA tools (dev only):** `dev/qa-audit.js`, `dev/qa-states.js`, `dev/qa-reduced-motion.js` and `dev/qa-matrix.md`. Results are in `DESIGN_REVAMP_REPORT.md` §4.
- **Screenshots:** collected in `design-system/peta-dunia-bps/screenshots/phase2..6/`.
