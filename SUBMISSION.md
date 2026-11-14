# Space Apps 2026 – Project Submission Text

**Project name:** Survive the Sol: Storm Royale
**Team:** TechNest Thinkers (Faisalabad, Pakistan)
**Challenge:** Build a Junior Astronaut Mission Trainer
**Project link:** https://survive-the-sol.github.io/survive-the-sol/
**Repository:** https://github.com/Survive-the-Sol/survive-the-sol

---

## High-level summary (~150 words)

Survive the Sol: Storm Royale is a 3D browser game that trains kids aged 7–12 to think like astronauts. Each round is one sol on the Moon or Mars. Players pick a mission card, jump out of a lander, collect supplies in a backpack with limited space, drive a rover that uses power, and race four friendly bot crews back to shelter before a solar storm. Every storm is a real archived solar flare from NASA's DONKI database, shown with its class and date. NASA OSDR RadLab measurements set how much stronger radiation is on the Moon and Mars than on the Space Station. Only three resources matter (Power, Life Support and Radiation Safety), and every choice costs something. Kids learn power budgets, radiation shielding, life support and the Mars communication delay, then get a learning summary and their own downloadable newspaper front page. It runs in any browser, with no login, no install and no weapons.

## Project details

**What it does.** Each sol has five phases:
1. **Plan:** choose 1 of 3 cards from our 21-card deck. Each card changes the bars and changes the sol. For example, *Build a shield wall* gives a bigger final safe zone but costs Power.
2. **Drop:** jump out of a lander and steer down with thrusters.
3. **Explore:** low-gravity third-person movement, glowing supplies with rarity levels, a backpack with limited slots, rovers, airdrops and micrometeoroid showers.
4. **Storm:** a real DONKI flare starts a storm, and the safe zone shrinks in three phases toward the base or a shield bunker. X-class flares shrink faster and hurt more.
5. **Night report:** survived or not, supplies delivered, bars before and after, what the card did, crew-race placement, XP and a NASA fact.

**Missions.** Twelve sols on the Moon unlock Mars. Mars has dust storms, the strongest 2024 flares, and Earth messages that arrive about 20 minutes late.

**At the end of a mission:** a rank (Cadet → Pilot → Commander → Mission Specialist), a learning summary for the four goals, a "What would a real astronaut do?" debrief, and a newspaper front page the player can download.

**How it works.** Plain JavaScript modules and Three.js. No build step and no server code. Sounds are generated with the Web Audio API. It works with keyboard, mouse and touch (on-screen joystick). Accessibility: text of at least 16 px, keyboard play, pause, and a reduce-motion option.

**Why it matters.** Kids practise real trade-offs astronauts face, using real space weather data, in a format they already love.

## Use of NASA data

- **NASA CCMC DONKI** solar flares (346 from 2026 for the Moon, the strong M- and X-class flares of 2024 for Mars). Every storm is a real flare; its class sets the storm's speed and strength. The game shows "Source: NASA CCMC DONKI · archived NASA data" and links to the flare's DONKI record.
- **NASA OSDR RadLab** dose rates: ISS 4.18, Moon orbit (LRO) 8.13 and Mars surface (Curiosity) 5.68 µGy/h. Storm radiation is scaled 1.94× on the Moon and 1.36× on Mars compared with the ISS.
- **NASA OSDR** studies OSD-895, OSD-767, OSD-766, OSD-412 and OSD-964: eight kid-friendly "Did you know?" facts. A script checks each one against the study text word by word.
- **NASA Mars Trek**: Viking colour mosaic used for the Mars ground and minimap, with credit on screen.
- All data is an archived snapshot, labelled "archived NASA data" in the game. Nothing is shown as live, and no API keys are used.

## Use of Artificial Intelligence

AI tools, including **Claude** (Anthropic), helped us write the game code, the data-collection scripts and text such as tips and documentation. Our team reviewed, played, tested and edited everything. We checked every science fact and number against the NASA data: the OSDR facts are verified automatically against the study text, and the card science lines come from our reviewed `data/cards.json`.

## 30-second demo script

1. **(0–5 s)** Start screen: "Survive the Sol: Storm Royale – real NASA solar storms, no weapons." Click **Start Mission**.
2. **(5–10 s)** Mission briefing: pick **Build a shield wall** and point out the +/− bars and the "Real science" line.
3. **(10–15 s)** Jump out of the lander (Space), steer down, land next to glowing supplies.
4. **(15–20 s)** Grab supplies (the combo counter shows), press **Tab** to open the backpack, hop into a rover with **E** and watch Power drop.
5. **(20–25 s)** The storm banner appears: "X-class solar flare · real date · Source: NASA CCMC DONKI". The zone shrinks; drive to the yellow shelter beam.
6. **(25–30 s)** Night report: "Safe in the shelter!", the crew race, an OSDR "Did you know?" fact, then the newspaper front page.

## References

- NASA CCMC DONKI – https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NASA OSDR RadLab – https://visualization.osdr.nasa.gov/radlab/
- NASA Open Science Data Repository – https://osdr.nasa.gov/bio/repo/ (OSD-895, OSD-767, OSD-766, OSD-412, OSD-964)
- NASA Mars Trek – https://trek.nasa.gov/mars/ (Viking MDIM 2.1 colour mosaic, NASA/JPL-Caltech, USGS)
- Three.js r160 (MIT) – https://threejs.org
- Inter and Orbitron fonts (SIL OFL) – https://fonts.google.com
- Web Audio API (sounds generated in the browser)
- Claude by Anthropic (AI assistant) – https://www.anthropic.com/claude
