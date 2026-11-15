# Survive the Sol – UI design reference

The 8 files in this folder are the APPROVED screen designs (1280×720 each).
They are design mockups written as HTML (Design Component format). Read them for
layout, colours, fonts, spacing and copy. Do NOT ship these files; rebuild the
same look in the real game.

## Screens (in order)
1. Main.dc.html    – Name page (logo, title, name input + random-name button, START)
2. Lobby.dc.html   – Lobby (3D astronaut on a Moon platform, Earth in the sky, name/rank/XP top-left,
                     stars + settings top-right, Missions left, How to play / About the data / Credits right,
                     big START MISSION bottom-center)
3. Cards.dc.html   – Pick 3 of 5 Emergency Cards (day + timer, card grid with icon, BEST FOR, + benefit,
                     − cost, Real science line, "x of 3 picked", LAND ON MOON)
4. Explore.dc.html – Gameplay HUD (bars top-left, day + storm timer top-center, minimap top-right,
                     ROVI bottom-left, card hand 1/2/3 bottom-center, sound/pause bottom-right,
                     glowing loot with light beams, floating "+10 Life")
5. Storm.dc.html   – Solar storm (red vignette, banner "SOLAR STORM! <class> · <date>" + "Source: NASA CCMC
                     DONKI · archived NASA data", yellow "USE A CARD! 0:05", best card glows, shield bubble
                     around the astronaut, dashed safe zone around the base)
6. Night.dc.html   – Night report (stars, bars before → after, card used + amount saved,
                     Did you know? fact from data/facts.json with its source, Save & quit / NEXT DAY)
7. Win.dc.html     – Mission success (rank badge, what you learned (4 goals), PLAY MARS,
                     Download newspaper, "The Moon Times" front page)
8. Lose.dc.html    – Mission failed (what happened, what would save you, ROVI encouragement, TRY AGAIN)

## Design tokens
- Background: deep navy #0b1026 (gradients to #05060f / #1d2560)
- Panels: rgba(11,16,38,0.85) or rgba(16,22,58,0.85), 1px border rgba(255,255,255,0.12), radius 16–20px
- Primary action: Space Apps yellow #e8f22a with navy text
- Good / Life Support: teal #7cf5c8 · Radiation Safety: blue #8fb0ff · Danger: coral #ff6b6b / #ff9b9b
- Text: #eef1ff, secondary #c5cbe8, muted #8f97c2
- Fonts: Orbitron (headings, numbers, buttons), Inter (body) – Google Fonts
- Icons: simple stroke SVG, no emoji
- Text sizes: min 13px labels, 15–18px body, 40–64px titles. Max 2 short lines per popup.
