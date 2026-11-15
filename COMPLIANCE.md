# Compliance check – Survive the Sol

✅ = met · ⚠️ = needs action

## NASA challenge rules
| Rule | Where / how | Status |
|---|---|---|
| Kids 7–12, simple English, no weapons / violence, nothing scary | Dangers are space weather and equipment; ROVI encourages ("Every astronaut learns from mistakes"). Text 13–64 px as in DESIGN.md. | ✅ |
| No login, no personal data | The name is only stored in this browser (`localStorage`, try/catch); nothing is sent anywhere. | ✅ |
| Only 3 core bars | Power, Life Support, Radiation Safety (`js/hud.js`, `index.html`). Stamina is a player mechanic. | ✅ |
| Teaches power budget, radiation shielding, life support, Mars comm delay | Card costs and Power drain; the daily real solar storm with shield cards and the safe zone; Life Support drain plus ice/oxygen supplies; Mars "Earth reply delay ~20 min" chip with late Earth messages. Summed up on the Win screen ("What you learned"). | ✅ |
| Every choice has a cost | Every card in `data/cards.json` has a `cost`; rovers use Power. | ✅ |
| Shielding tied to real space weather | Storms are real DONKI flares (`pickFlare` in `js/data.js`); damage = flare class × RadLab scale. | ✅ |
| Replayable | Random flares (no repeats), random card offers, random extra dangers and loot. | ✅ |
| Tooltips for sol, solar flare, radiation dose, regolith, communication delay | `GLOSSARY` in `js/rovi.js`; clickable words in ROVI and on cards; "?" on bars and the Earth chip; How to play. | ✅ |
| Real NASA data with the source on screen, "archived NASA data", never live | Storm banner, Lose screen, night-report fact source, About the data, Mars Trek credit. | ✅ |
| About the data + Credits | Lobby → About the NASA data, Credits (`js/screens.js`). | ✅ |
| Only real facts and numbers | Facts from `data/facts.json` (verified against OSDR); ratios from `data/radiation.json`; card science lines with sources. | ✅ |
| English only; credit libraries, fonts and sounds; no API keys | Credits screen, README → References; no keys in the repo. | ✅ |

## Space Apps rules
| Rule | Where | Status |
|---|---|---|
| NASA data used | DONKI, RadLab, OSDR, Mars Trek | ✅ |
| AI use disclosed | README, SUBMISSION.md, Credits screen | ✅ |
| Demo (slides or 30 s video) | SLIDES.md + 30-second script in SUBMISSION.md | ✅ |
| Public project link | GitHub Pages – waits for the team's OK to push | ⚠️ needs approval |

## Design (design/*.dc.html)
| Screen | Status |
|---|---|
| Main (name page, random name, START, welcome back) | ✅ |
| Lobby (3D astronaut on a platform + Earth, rank/XP/stars, missions, links, settings) | ✅ |
| Cards (pick 3 of 5, 15 s timer) | ✅ |
| Explore HUD | ✅ |
| Storm (real-flare banner, USE A CARD 5 s, BEST glow, shield bubble, safe zone) | ✅ |
| Night (stars, bars, card saved, fact) | ✅ |
| Win (rank, 4 goals, PLAY MARS, "The Moon Times" PNG) | ✅ |
| Lose (what happened, what would save you, ROVI, TRY AGAIN) | ✅ |
| Fills the whole window at any size; phone layout; touch controls only on touch devices | ✅ |
