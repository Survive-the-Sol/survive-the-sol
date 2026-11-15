# Survive the Sol

**A Junior Astronaut Mission Trainer for kids aged 7–12** – NASA Space Apps Challenge 2026
Team **TechNest Thinkers** (Faisalabad, Pakistan)

> Survive 12 days on the Moon. Use the right emergency card when a **real NASA solar storm** hits. No weapons, no login.

▶ **Play:** https://survive-the-sol.github.io/survive-the-sol/ *(live after deployment)*

## Summary

*Survive the Sol* is a 3D browser game about the choices astronauts make to keep their crew safe. You are the commander of a small base, and each **day**:

1. **Pick 3 of 5 Emergency Cards.** Every card protects against a danger and has a real cost. For example, *Radiation Shield* blocks 70% of a storm but costs 15 Power.
2. **Land and explore** the 3D Moon. Grab glowing supplies: ice and oxygen give Life Support, batteries and solar panels give Power, and shield plates give Radiation Safety.
3. **Danger!** Every day a **real solar flare** from NASA's DONKI database hits, shown with its class and date. Some days bring micrometeoroids, a power failure, or (on Mars) a dust storm. You have 5 seconds to press **1, 2 or 3** to use a card:
   - the **right card** gives the full effect;
   - a **wrong card** gives half the effect, and ROVI the robot explains which card would have been better;
   - **no card** means full damage.
4. **Run back** into the safe zone around the base while the storm lasts.
5. **Night report:** 1–3 stars, your bars before and after, how much your card saved, and a real NASA "Did you know?" fact.

Survive 12 days to win, earn a rank and download your own **"The Moon Times"** newspaper. Winning the Moon unlocks **Mars**: stronger flares, dust storms, and Earth messages that arrive about 20 minutes late.

There are only **3 core resources**: Power, Life Support and Radiation Safety. If any of them reaches 0, the mission fails, and the game shows what happened and what would have saved you.

### Difficulty
| Days | Moon | Mars |
|---|---|---|
| 1–3 | small C-class flares (an easy first win) | M-class |
| 4–8 | M-class, sometimes a second danger | X-class |
| 9–12 | X-class (the strongest) | X-class |

## How to play
| Action | Keyboard / mouse | Phone (touch devices) |
|---|---|---|
| Move · look | `W A S D` · drag the mouse | joystick · drag |
| Sprint · jump | `Shift` · `Space` | buttons |
| Use an emergency card | `1` `2` `3` | tap a card |
| Drive a rover (uses Power) | `E` | Rover button |
| Pause · mute | `Esc` · `M` | buttons |

Settings include colour themes, graphics level, sound, reduce motion, camera sensitivity, a 3-day demo mode, and *Teacher mode* (unlocks Mars right away).

## Learning goals
| Goal | How the game teaches it |
|---|---|
| **Power budget** | Every card, suit and rover uses Power; you must collect more than you spend. |
| **Radiation shielding** | Real solar flares hit every day. Pick shield cards, use them in time, and get back to the safe zone. |
| **Life support & food** | Air, water and food drain all the time; ice and oxygen tanks refill them. |
| **Mars communication delay** | Earth's messages arrive about 20 minutes late, so you must decide on your own. |

The win screen sums up these 4 goals. ROVI teaches them during play, and the first day is a guided tutorial.

## NASA data
All data is an **archived snapshot**, shown in the game as "archived NASA data". It is never live, and no API keys are used.

| Dataset | Used for |
|---|---|
| **NASA CCMC DONKI** – [ccmc.gsfc.nasa.gov/tools/DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) – `data/flares_2026.json` (346 flares, Moon), `data/flares.json` (2024, Mars) | Every day's storm is a real flare picked by class. The banner says "<class> solar flare · <date> · Source: NASA CCMC DONKI · archived NASA data". |
| **NASA OSDR RadLab** – [visualization.osdr.nasa.gov/radlab](https://visualization.osdr.nasa.gov/radlab/) – `data/radiation.json` | Storm damage is scaled by the measured dose rate: 1.94× the ISS level near the Moon and 1.36× on the Mars surface. |
| **NASA OSDR** studies OSD-895, OSD-767, OSD-766, OSD-412, OSD-964 – [osdr.nasa.gov](https://osdr.nasa.gov/bio/repo/) – `data/facts.json` | The "Did you know?" facts in the night report. Each was checked word by word against its study by `scripts/fetch_osdr_facts.py`. |
| **NASA Mars Trek** – [trek.nasa.gov/mars](https://trek.nasa.gov/mars/) – `assets/mars_trek_viking.jpg` | The Mars ground and minimap (Viking MDIM 2.1 colour mosaic, NASA/JPL-Caltech, USGS) |
| **Emergency cards** – `data/cards.json` | 9 cards, each with a real science line and its source |

## Tech
- Plain HTML, CSS and JavaScript modules, no build step, hosted on GitHub Pages. **Three.js r160** (from a CDN) for low-poly 3D.
- Every screen is designed at 1280×720 and scales to fill any window. Phones get a stacked layout, and touch controls appear only on touch devices.
- Sounds are generated with the Web Audio API. Progress (name, XP, stars, a saved mission) is kept only in this browser's `localStorage`.

## Run locally
The game loads JSON with `fetch()`, which does not work if you double-click `index.html` (`file://`).
```bash
python -m http.server 8000      # then open http://localhost:8000
```

## AI use disclosure
AI tools, including **Claude** (by Anthropic), helped us write code and text: the game logic, 3D scenes, styles, data scripts and these documents. The team made the UI designs, and reviewed, played, tested and edited everything. We checked every science fact and number against the NASA data files.

## References
- NASA CCMC DONKI – https://ccmc.gsfc.nasa.gov/tools/DONKI/ (API `https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR`)
- NASA OSDR RadLab – https://visualization.osdr.nasa.gov/radlab/ (API https://visualization.osdr.nasa.gov/radlab/api/)
- NASA Open Science Data Repository – https://osdr.nasa.gov/bio/repo/ (OSD-895, OSD-767, OSD-766, OSD-412, OSD-964)
- NASA Mars Trek – https://trek.nasa.gov/mars/ (Viking MDIM 2.1 colour mosaic, NASA/JPL-Caltech, USGS)
- Three.js r160 (MIT) – https://threejs.org · served by jsDelivr – https://www.jsdelivr.com
- Orbitron and Inter fonts (SIL Open Font Licence) – https://fonts.google.com
- Sounds: generated with the Web Audio API (no sound files)
- Claude by Anthropic – https://www.anthropic.com/claude
- NASA Space Apps Challenge 2026 – https://www.spaceappschallenge.org/

## Team
**TechNest Thinkers** – NASA Space Apps Challenge 2026, Faisalabad, Pakistan.
