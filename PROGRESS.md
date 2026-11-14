# Survive the Sol – Progress (design rebuild)

## Done (tested at 1366×768 with Playwright)
- New UI built from `design/*.dc.html` on a 1280×720 stage scaled to the window (`--s`). HUD corners scale with `--hs`. Phones get a column layout.
- **Name page** (random name, START, "Welcome back") and **Lobby** (3D astronaut waving on a platform, Earth, rank/XP, stars, missions with Mars locked, links, START MISSION). Both match their designs.
- **Cards** screen: pick 3 of 5, 15-second timer, BEST FOR / + / − / Real science lines, LAND ON MOON. Matches the design.
- **Explore** HUD: matches the design.
- **Storm**: matches the design. Real DONKI flare banner with source, USE A CARD 5-second countdown, BEST/GOOD card glow, red vignette and sky, safe-zone chip, dashed shrinking zone around the base, shield bubble.
- Emergency-card rules in `js/cards.js`: right card = full effect, wrong = half, none = full damage, each card once per day. New `data/cards.json` (9 cards).
- Difficulty: C-class flares on days 1–3, M on 4–8, X on 9–12; extra dangers (meteor, power failure, Mars dust storm). Damage scaled by RadLab.
- Night, Win (with "The Moon Times" newspaper), Lose, How to play, About the data, Credits, Settings (themes) and Pause screens are coded.

## Not yet verified
1. Night, Win, Lose, info and pause screens: screenshot each and compare with its design.
2. A full 12-day run (try `game.G.timeScale = 4` in the console), plus the wrong-card and no-card paths, Save & quit / resume, and Mars (dust storm, Earth delay).
3. Tests at 1920×1080 and phone size; confirm touch controls appear only on touch devices; no console errors.
4. Lobby polish: smaller rocks on the platform.
5. Update COMPLIANCE.md, README.md, SUBMISSION.md and SLIDES.md for the card-based design.
6. Ask before pushing and before deleting the unused `js/main.js`, `js/storm.js`, `js/bots.js`, `js/backpack.js` and `js/lander.js` (still imported: `updateDrop`), then push, deploy to GitHub Pages and share the live link plus a 30-second demo script.
