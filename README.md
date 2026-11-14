# Survive the Sol: Storm Royale

**A Junior Astronaut Mission Trainer for kids aged 7–12** – NASA Space Apps Challenge 2026
Team **TechNest Thinkers** (Faisalabad, Pakistan)

> Drop onto the Moon or Mars, collect supplies, drive a rover, and race back to shelter before a **real NASA solar storm** hits. No weapons, no violence – just smart astronaut choices.

▶ **Play:** https://survive-the-sol.github.io/survive-the-sol/ *(live after deployment)*

---

## Summary

*Survive the Sol: Storm Royale* is a 3D browser game that turns real astronaut decisions into a fun "storm royale" race. Each round is one **sol** (a day):

1. **Plan** – pick 1 of 3 mission cards. Each helps one bar and costs another.
2. **Drop** – jump out of a lander and steer down with thrusters.
3. **Explore** – collect glowing supplies into a backpack with limited space, and drive a rover (which uses Power).
4. **Storm** – a real archived solar flare from NASA DONKI starts a storm. The safe zone shrinks toward a shelter.
5. **Night report** – what happened, what your card did, how you placed against 4 friendly bot crews, XP, and a real NASA "Did you know?" fact.

Survive 12 sols on the Moon to unlock Mars, where dust storms, stronger flares and a 20-minute Earth reply delay mean you must decide on your own.

The game uses only **3 core mission resources**: **Power**, **Life Support** and **Radiation Safety**. If any of them reaches 0, the mission fails, and the game shows the reason and a tip.

## How to play

| Action | Keyboard / mouse | Phone |
|---|---|---|
| Move | `W A S D` / arrows | left joystick |
| Look around | drag the mouse (wheel = zoom) | drag on the screen |
| Sprint / Jump / Crouch | `Shift` / `Space` / `C` | Sprint / Jump buttons |
| Drive or leave a rover | `E` | Use |
| Backpack / quick slots | `Tab` / `1`–`4` | Bag button / tap a slot |
| Fast-forward when safe in the shelter | `F` | Skip |
| Pause / mute | `Esc` / `M` | buttons |

The first mission starts with a step-by-step **ROVI tutorial**. Settings let you change the graphics level, volume, camera sensitivity, reduce motion, phone controls and **mission length** (12 sols, or 3 for a quick demo). **Teacher mode** unlocks Mars right away.

## Learning goals

| Goal | How the game teaches it |
|---|---|
| **Power budget** | Energy is limited. Suits drain Power, rovers use a lot of it, and cards trade Power for other things. |
| **Radiation shielding** | Real solar flares start storms. Stay in the safe zone, reach the shelter, and use shield plates and shielding cards. |
| **Life support & food** | Air, water and food drain every second. Ice, oxygen and cards like *Grow vegetables* and *Recycle water* help. |
| **Communication delay (Mars)** | Messages from Earth arrive about 20 minutes late, so you must decide yourself. |

These goals appear in the tutorial, in ROVI's tips during play, and in the **learning summary** at the end of each mission. That screen also has a **"What would a real astronaut do?"** debrief.

## How we use NASA data

All data is an **archived snapshot**. The game never calls an API while you play and is **not live**. No API keys are used.

| Dataset | What we saved | How the game uses it |
|---|---|---|
| **NASA CCMC DONKI** – [ccmc.gsfc.nasa.gov/tools/DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Solar flares: 346 from 2026 (`data/flares_2026.json`) and 1,128 from 2024 (`data/flares.json`), via `fetch_donki_flares.py` | Every sol's storm is one real flare. Its class (C/M/X) sets how fast the zone shrinks and how much radiation hurts. Its class, date and source link are shown on screen. |
| **NASA OSDR RadLab** – [visualization.osdr.nasa.gov/radlab](https://visualization.osdr.nasa.gov/radlab/) | Median absorbed dose rates (March 2023): ISS 4.18 µGy/h, Moon orbit (LRO) 8.13, Mars surface (Curiosity) 5.68, deep space (BioSentinel) 10.0 (`data/radiation.json`, `scripts/fetch_radlab.py`) | Storm radiation is scaled **1.94×** on the Moon and **1.36×** on Mars compared with the ISS. The ratios also appear as "Did you know?" facts. |
| **NASA OSDR** studies – [osdr.nasa.gov](https://osdr.nasa.gov/bio/repo/) | 8 kid-friendly facts from [OSD-895](https://osdr.nasa.gov/bio/repo/data/studies/OSD-895), [OSD-767](https://osdr.nasa.gov/bio/repo/data/studies/OSD-767), [OSD-766](https://osdr.nasa.gov/bio/repo/data/studies/OSD-766), [OSD-412](https://osdr.nasa.gov/bio/repo/data/studies/OSD-412), [OSD-964](https://osdr.nasa.gov/bio/repo/data/studies/OSD-964). `scripts/fetch_osdr_facts.py` checks each fact word by word against the study text. | "Did you know?" cards in night reports, the end screen and the newspaper |
| **NASA Mars Trek** – [trek.nasa.gov/mars](https://trek.nasa.gov/mars/) | Viking MDIM 2.1 colour mosaic tiles (`assets/mars_trek_viking.jpg`, `scripts/fetch_mars_trek.py`) | Mars ground texture and Mars minimap, credited on screen |
| Plan cards (`data/cards.json`) | 21 cards, each with a "Real science" line | The PLAN phase and the end-of-mission debrief |

## Tech

- Plain **HTML + CSS + JavaScript modules**, no build step. Runs on GitHub Pages.
- **Three.js r160** (from the jsDelivr CDN) for low-poly 3D.
- Instanced meshes for rocks and supplies, object pools for particles, fog for draw distance, and a Low/Medium/High graphics setting.
- All sounds are generated with the **Web Audio API**, so there are no audio files.
- Progress and settings are saved in `localStorage`, and the game still works if storage is blocked.

```
index.html          page + HUD layout
css/style.css       Mission Control styles
js/game.js          main controller (mission → sol → report)
js/world/           terrain (Moon / Mars) and props
js/player.js  camera.js  input.js  lander.js  rover.js
js/loot.js  backpack.js  cards.js  storm.js  bots.js  airdrops.js  hazards.js
js/hud.js  screens.js  rovi.js  newspaper.js  audio.js  save.js  data.js  config.js
data/               archived NASA data (never edited by the game)
scripts/            Python scripts that made the data snapshots
```

## Run locally

The game loads JSON with `fetch()`, which does **not** work if you double-click `index.html` (`file://`). Start a small web server instead:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## AI use disclosure

AI tools, including **Claude** (by Anthropic), helped us write code and text for this project: the game logic, the 3D scenes, the styles, the data scripts and these documents. The team reviewed, played, tested and edited everything. We checked every science fact and number against the NASA data files: the facts in `data/facts.json` are verified automatically, word by word, against the OSDR study text.

## References

**NASA data**
- NASA CCMC DONKI (Space Weather Database Of Notifications, Knowledge, Information): https://ccmc.gsfc.nasa.gov/tools/DONKI/ – API used: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR`
- NASA OSDR RadLab: https://visualization.osdr.nasa.gov/radlab/ – API: https://visualization.osdr.nasa.gov/radlab/api/
- NASA Open Science Data Repository: https://osdr.nasa.gov/bio/repo/ – metadata API `https://osdr.nasa.gov/osdr/data/osd/meta/<id>`
  - OSD-895 EDEN ISS greenhouse biomass · OSD-767 tomato transcriptome on the ISS · OSD-766 VEG-05 tomato microbial communities · OSD-412 VEG-03D leafy greens · OSD-964 BioSentinel yeast biosensors
- NASA Solar System Treks – Mars Trek: https://trek.nasa.gov/mars/ – Viking MDIM 2.1 colour mosaic (NASA/JPL-Caltech, USGS)

**Libraries, fonts, sounds, images**
- Three.js r160 – MIT licence – https://threejs.org (served by jsDelivr, https://www.jsdelivr.com)
- Inter and Orbitron fonts – SIL Open Font Licence – https://fonts.google.com
- Sounds: generated live with the Web Audio API (no sound files)
- 3D models, icons and the mission patch: made by the team in code

**AI tools**
- Claude (Anthropic) – https://www.anthropic.com/claude

**Challenge**
- NASA Space Apps Challenge 2026 – *Build a Junior Astronaut Mission Trainer* – https://www.spaceappschallenge.org/

## Team

**TechNest Thinkers** – NASA Space Apps Challenge 2026, Faisalabad local event, Pakistan.
