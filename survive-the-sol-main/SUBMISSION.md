# Space Apps 2026 – Project Submission Text

**Project name:** Survive the Sol
**Team:** TechNest Thinkers (Faisalabad, Pakistan)
**Challenge:** Build a Junior Astronaut Mission Trainer
**Project link:** https://survive-the-sol.github.io/survive-the-sol/
**Repository:** https://github.com/Survive-the-Sol/survive-the-sol

## High-level summary (~150 words)
Survive the Sol is a 3D browser game that trains kids aged 7–12 to make astronaut decisions. As commander of a small Moon base, the player must keep the crew safe for 12 days. Each day they pick 3 of 5 Emergency Cards (Radiation Shield, Water Wall, Storm Shelter, Quick Repair, Battery Pack and more), each with a real cost. They land and explore, collecting supplies for the three core bars: Power, Life Support and Radiation Safety. Every day a real archived solar flare from NASA's DONKI database hits, shown with its class and date. The player has five seconds to use the right card and then runs back to the safe zone. Storm damage is scaled with NASA OSDR RadLab measurements. Night reports award stars and share verified NASA OSDR facts. Winning unlocks Mars, with dust storms and a 20-minute Earth reply delay. No weapons, no login.

## Project details
- **Daily loop:** pick 3 of 5 cards (15 s) → land → explore and collect supplies → dangers → use a card within 5 s → night report with 1–3 stars → next day. Twelve days on the Moon unlock Mars.
- **Card rules:** the right card gives the full effect; a wrong card gives half the effect, and ROVI explains the better card; no card means full damage. Each card works once per day, and every card has a real cost (Power, Life Support, Radiation Safety, stamina, or time).
- **Dangers:** a solar storm every day (real flares: C-class on days 1–3, M on 4–8, X on 9–12), micrometeoroid showers, power failures, and Mars dust storms.
- **Feedback:** stars, XP and ranks (Cadet → Pilot → Commander → Mission Specialist). The Lose screen explains what happened and what would have saved you. The Win screen sums up the 4 learning goals and offers a downloadable "The Moon Times" front page with the player's name.
- **Tech:** Three.js and plain JavaScript, no build step, GitHub Pages. It fills any window, has a phone layout, and shows touch controls only on touch devices. Sounds are generated with Web Audio. Accessibility: keyboard play, pause, reduce motion and a high-contrast theme.

## Use of NASA data
- **NASA CCMC DONKI solar flares** (2026 for the Moon, 2024 for Mars): every storm is a real flare. The game shows its class, date and "Source: NASA CCMC DONKI · archived NASA data".
- **NASA OSDR RadLab dose rates:** ISS 4.18, Moon orbit 8.13 and Mars surface 5.68 µGy/h. Storm damage is 1.94× the ISS level on the Moon and 1.36× on Mars.
- **NASA OSDR studies** OSD-895, OSD-767, OSD-766, OSD-412 and OSD-964: kid-friendly "Did you know?" facts, each checked against the study text.
- **NASA Mars Trek** Viking colour mosaic: the Mars ground and minimap, credited in the game.
- All data is labelled "archived NASA data", and no API keys are used.

## Use of Artificial Intelligence
AI tools, including **Claude** (Anthropic), helped write the game code, data scripts and documentation. The team created the UI designs, and reviewed, tested and edited everything, checking every fact against the NASA data.

## 30-second demo script
1. **0–5 s** – Name page: type a name, then START. The lobby shows the 3D astronaut waving on the Moon. Click START MISSION.
2. **5–10 s** – "Pick 3 Emergency Cards": point out the cost, the BEST FOR label and the Real science line. Pick Radiation Shield, Water Wall and Quick Repair, then LAND ON MOON.
3. **10–17 s** – Land, run to a glowing ice beam: "+10 Life".
4. **17–24 s** – "SOLAR STORM! X1.8 solar flare · 9 October 2024 · Source: NASA CCMC DONKI · archived NASA data". The BEST card glows; press 1, and the shield bubble appears. Run into the dashed safe zone.
5. **24–30 s** – Night report: 3 stars, "Saved 28 Radiation Safety", and a real NASA OSDR fact. Finish on the Win screen with "The Moon Times" newspaper.

## References
NASA CCMC DONKI · NASA OSDR RadLab · NASA OSDR (OSD-895, 767, 766, 412, 964) · NASA Mars Trek · Three.js r160 (MIT) · Orbitron and Inter (SIL OFL) · Web Audio API · Claude (Anthropic). Full links are in README.md.
