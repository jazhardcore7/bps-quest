# QA matrix (dev only)

How the Phase 6 audit was run, so it can be repeated:

1. `npm run dev`, then open each URL below at 1440x900, 1024x768, 768x1024 and 390x844.
2. Press Tab once (keyboard modality), then in the console run:
   - Login (real app, `#/login`): `const { audit } = await import('/dev/qa-audit.js'); await audit()`
   - Preview screens (`/dev/screen-preview.html?screen=...`): `const { runState } = await import('/dev/qa-states.js'); await runState('<state>')`

| State | URL | `runState` |
| --- | --- | --- |
| login | `/#/login` | (use `audit()`) |
| world | `?screen=world` | `world` |
| island | `?screen=island` | `island` |
| office | `?screen=office` | `office` |
| info panel | `?screen=office` | `panel` |
| quest sheet | `?screen=office` | `quests` |
| leaderboard | `?screen=leaderboard` | `leaderboard` |

The audit reports sideways page scroll, controls smaller than 44px on screen, controls without a visible focus change, and text below 4.5:1 (3:1 for large text). Canvas text in the office is not covered.
