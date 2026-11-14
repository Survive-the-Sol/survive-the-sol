# Compliance check – Survive the Sol: Storm Royale

Every requirement from the NASA Space Apps 2026 challenge *"Build a Junior Astronaut Mission Trainer"* and the general Space Apps rules, with where the game meets it.
✅ = met · ⚠️ = needs action

## A. Challenge requirements

| # | Requirement | Where / how it is met | Status |
|---|---|---|---|
| A1 | Kids 7–12: simple English, big text, no weapons, no violence, nothing scary | No weapons or combat anywhere. Bots are friendly crew members racing for supplies. Anyone caught outside is "rescued by the rover team". Body text is at least 16 px (`css/style.css`). | ✅ |
| A2 | It trains: power budget, radiation shielding, life support / food, Mars communication delay | **Tutorial** (`js/rovi.js` → `createTutorial`): cards, bars, backpack, rover Power use, storm shelter. **During play**: ROVI tips (`roviTips` in `js/game.js`), plus the Earth-delay panel on Mars. **Mission end**: a 4-goal learning summary (`endMission` → `learning`). Also on the How to Play screen. | ✅ |
| A3 | Only 3 core resources | Power, Life Support, Radiation Safety (`CONFIG.bars`, HUD `.bars`). Stamina and backpack are player mechanics only. | ✅ |
| A4 | Every choice has a cost | Every card has −/+ bar changes and a gameplay effect (`js/cards.js`, `data/cards.json`). The backpack is limited to 4/6/8 slots. Rovers use Power (`CONFIG.rover.powerPerSecond`). Airdrops are a detour from the shelter. | ✅ |
| A5 | Shielding tied to REAL space weather (DONKI) | Every sol's storm is a real flare from `data/flares_2026.json` (Moon) or `data/flares.json` (Mars). Its class sets the shrink speed and damage (`flarePower` in `js/data.js`, `js/storm.js`). | ✅ |
| A6 | Replayable | Random loot each sol, random real flare each sol (no repeats), random card offers, random bot personalities, random shelter (base or one of 3 bunkers), random hazards and airdrop spots. | ✅ |
| A7 | Tooltips for sol, solar flare, radiation dose, regolith, communication delay | `GLOSSARY` in `js/rovi.js`. Clickable words in ROVI tips and in the cards' "Real science" lines. "?" buttons on the bars and the Earth-delay panel. Full glossary on How to Play. | ✅ |
| A8 | Browser, no login / download / install | Static HTML + JS. Works on GitHub Pages. | ✅ |
| A9 | Learning over graphics | Low-poly, simple shapes; graphics Low/Medium/High setting. | ✅ |
| A10 | Data source shown ON SCREEN | Storm banner and flare chip: "Source: NASA CCMC DONKI · archived NASA data". Banner also shows the RadLab radiation scale. Night report: DONKI record link and OSDR fact source. Minimap: "imagery: NASA Mars Trek". Mars credit on the About screen. | ✅ |
| A11 | Stored data labelled "archived NASA data", never live | Shown on every source line ("archived NASA data", "not live"), and on the About the data screen. | ✅ |
| A12 | "About the data" screen + Credits / References | Menu → About the Data (DONKI, RadLab, OSDR, Mars Trek, cards) and Credits (`js/screens.js`). | ✅ |

## B. NASA data

| Dataset | File | Used for | Status |
|---|---|---|---|
| NASA CCMC DONKI solar flares | `data/flares_2026.json` (Moon), `data/flares.json` (Mars, M + X only) | The storm of every sol (class + date + link) | ✅ |
| NASA OSDR RadLab | `data/radiation.json` | Damage scale: Moon 1.94× ISS, Mars 1.36× ISS (`storm.radScale`) | ✅ |
| NASA OSDR studies | `data/facts.json` (8 facts, each checked word by word against its study) | "Did you know?" in night reports, end screen, newspaper | ✅ |
| NASA Mars Trek | `assets/mars_trek_viking.jpg` | Mars ground texture + minimap, credited on screen | ✅ |
| Plan cards | `data/cards.json` | The PLAN phase; "Real science" lines; the debrief | ✅ |

The data files are only read, never changed. The game contains no invented science numbers: the ratios come from `radiation.json`, and the facts come from `facts.json` and the `cards.json` science lines.

## C. Space Apps rules

| Rule | Where | Status |
|---|---|---|
| NASA data used | See section B | ✅ |
| English only | Whole game and docs | ✅ |
| AI use disclosed | `README.md`, `SUBMISSION.md`, Credits screen | ✅ |
| References (data, libraries, fonts, sounds, images, AI) | `README.md` → References, Credits screen | ✅ |
| Original code, licences allow use | All code written for this project. Three.js (MIT), Inter + Orbitron (SIL OFL), sounds made with Web Audio (no files), NASA imagery | ✅ |
| Demo: 7-slide deck or 30-second video | `SLIDES.md` + 30-second demo script in `SUBMISSION.md` | ✅ |
| Public project link (GitHub Pages + repo) | Deployment waits for the team's OK to push | ⚠️ waiting for approval to push |
| No API keys | None used. All data was fetched without keys and stored as archived snapshots. | ✅ |

## D. Game design checklist (from the build prompt)

| Feature | Where | Status |
|---|---|---|
| PLAN cards (15 s timer, 3 offers, effect + Real science) | `showBriefing`, `js/cards.js` | ✅ |
| Lander drop, steer with thrusters, flight path on the minimap | `js/lander.js` | ✅ |
| Moon map: craters, rocks, ice crater, walk-in huts, old lander, crashed satellite, antennas, solar farm ruins, footprints, Earth, stars | `js/world/*`, `js/effects.js` | ✅ |
| Loot with rarity colours + backpack (levels 1–3, Tab, use / drop / swap, quick slots 1–4) | `js/loot.js`, `js/backpack.js` | ✅ |
| Rovers (E, arcade driving, uses Power) | `js/rover.js` | ✅ |
| Airdrops with smoke trail and gold loot | `js/airdrops.js` | ✅ |
| 4 bot crews, leaderboard, event feed (no fighting) | `js/bots.js`, HUD | ✅ |
| Storm zone from real DONKI data + RadLab scaling, red pulse, alarm, shake | `js/storm.js`, `js/game.js` | ✅ |
| Hazards: micrometeoroids (shadow warning), equipment glitches, Mars dust storms | `js/hazards.js` | ✅ |
| Night report (reason, supplies, animated bars, card effect, placement, XP, fact) | `showReport` | ✅ |
| 12-sol missions, Moon → Mars unlock, Mars comm delay | `js/game.js` | ✅ |
| XP, ranks (Cadet → Pilot → Commander → Mission Specialist), unlocks, saved in localStorage | `js/save.js` | ✅ |
| End of mission: rank, learning summary, debrief, newspaper + PNG | `showEnd`, `js/newspaper.js` | ✅ |
| Tutorial + ROVI tips | `js/rovi.js` | ✅ |
| Start screen with logo, animated 3D background, menu buttons | `showMenu` | ✅ |
| Settings: graphics, volume, music, reduce motion, sensitivity, phone controls, mission length | `showSettings` | ✅ |
| Phone controls (joystick, Jump / Sprint / Use) | `js/input.js` → `setupTouch` | ✅ |
| Accessibility: 16 px minimum, contrast, keyboard play, pause, reduce motion | CSS, `js/game.js` | ✅ |

## Remaining action

- ⚠️ **Deployment**: push to `github.com/Survive-the-Sol/survive-the-sol` and turn on GitHub Pages. This needs the team's approval before pushing.
