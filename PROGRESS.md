# Storm Royale – Progress

Last commit: `94db964` (work in progress, nothing pushed).

> ⚠️ **The game does not start right now.** `index.html` loads `js/game.js`, which is not written yet. The old `js/main.js` (step 1) uses the old module APIs. The next task fixes this.

## Done
- **Part 0:** old card game removed; backup tag `old-card-game` created.
- **Step 1 (tested):** Moon map, third-person astronaut, camera, sprint/jump/crouch, loot pickup, HUD bars, compass, minimap.
- **Modules written but not tested yet:**
  - `data.js`: loads the DONKI, RadLab, OSDR and cards data; flare-class strength.
  - `save.js`: XP, ranks, unlocks and settings in localStorage.
  - `audio.js`: Web Audio sounds, engine loops, music.
  - `cards.js`: one gameplay effect for every card in `cards.json`.
  - `backpack.js`: slots for levels 1–3.
  - `storm.js`: real-flare storm zone with 3 shrink phases toward the base or a bunker, damage scaled by RadLab.
  - `lander.js`: lander flight and the thruster drop.
  - `rover.js`: driving that uses Power.
  - `bots.js`: 4 crew bots that collect supplies and race to the shelter, with event-feed messages.
  - `airdrops.js`, `hazards.js`: airdrops; micrometeoroids, glitches and Mars dust storms.
  - `rovi.js`: ROVI tips, glossary of the 5 hard words, the 10-step tutorial.
  - `hud.js`: full HUD.
  - `screens.js`: menu, choose mission, how to play, About the data, credits, settings, pause, card briefing, night report, mission end.
  - `newspaper.js`: front page and PNG download.
  - The world now has walk-in huts, 3 shield bunkers, a greenhouse, antennas, solar farm ruins, footprints, and a Mars variant (canyon, dust devils, Mars Trek texture).
  - `index.html` has the new layout; `assets/favicon.svg` added.

## Working on right now
- **`js/game.js`**: the main controller that ties every module together. It runs:
  - the state machine: menu → briefing → drop → explore + storm → night report → next sol or mission end;
  - drains, regeneration and storm damage on the bars, plus fail reasons;
  - pickups, backpack, rover enter/exit, fast-forward, the Mars comm-delay messages;
  - the XP and unlock flow, the learning summary and the debrief;
  - the 3D menu background, pause, the mute button and touch setup.
- After that, `css/style.css` needs styles for all the new HUD and screen elements.

## Remaining steps (in order, from the prompt)
1. Finish `game.js` + CSS, then delete the old `js/main.js` (will ask first). Get the 12-sol Moon loop with cards, real storm, night report and fail reasons working.
2. Test and fix the lander drop, backpack, rarity, rover and airdrops.
3. Test and fix the bot crews, leaderboard, event feed and hazards.
4. Test and fix the tutorial, ROVI tips, tooltips, XP/ranks/unlocks, mission-end screens and newspaper.
5. Mars level and comm delay, settings, phone controls, sounds, polish, start screen with the 3D background.
6. Playwright self-test: a full Moon mission at desktop and phone size, no console errors, fix bugs.
7. Write `COMPLIANCE.md` (fix every ⚠️), `README.md`, `SUBMISSION.md`, `SLIDES.md`.
8. Ask before pushing, then push, deploy to GitHub Pages, and give the live link plus a 30-second demo script.

**Open item:** `assets/logo.png` is still missing (the SVG patch is used until it is added).
