// =====================================================================
// Survive the Sol: Storm Royale – TUNING NUMBERS
// Change these to make the game easier, harder, faster or slower.
// (1 unit ≈ 1 metre. The astronaut is about 1.8 units tall.)
// =====================================================================

export const CONFIG = {
  world: {
    size: 420,          // map is 420 x 420 units
    playRadius: 188,    // nobody can walk further than this from the centre
    baseRadius: 28,     // flat area around the main base dome
  },

  player: {
    walkSpeed: 7,
    sprintSpeed: 12.5,
    crouchSpeed: 3.5,
    accel: 10,
    airControl: 0.35,
    jumpSpeed: 6.6,
    gravity: 5.2,       // low gravity = floaty jumps
    staminaMax: 100,
    staminaDrain: 24,
    staminaRegen: 20,
    staminaRecover: 20,
  },

  camera: { distance: 9, minDistance: 4.5, maxDistance: 18, pitch: 0.42 },

  // The 3 core mission resources (0–100). They carry over from sol to sol.
  bars: {
    start: { power: 80, life: 80, rad: 100 },
    drainPerSecond: { power: 0.07, life: 0.12 },   // suit power + breathing
    night: { power: 4, life: 5 },                   // the base uses some overnight
  },

  loot: { count: 120, pickupRadius: 1.8, comboWindow: 3 },

  backpack: { slots: [4, 6, 8] },   // backpack level 1 / 2 / 3

  rover: { maxSpeed: 22, accel: 9, turnRate: 1.6, powerPerSecond: 0.45 },

  // Seconds after landing. The storm card / flare class changes these.
  sol: {
    warnAt: 40,           // big storm warning banner
    phases: [             // the safe zone shrinks in 3 phases
      { start: 55, end: 75, to: 130 },
      { start: 92, end: 112, to: 65 },
      { start: 128, end: 148, to: null },   // null = final shelter radius
    ],
    endAt: 160,
    startRadius: 240,
    finalRadius: 13,
    tutorialExtra: 35,    // the first (tutorial) sol is slower
    baseDps: 0.9,         // radiation damage per second outside the zone (before scaling)
  },

  airdrops: { times: [30, 85] },

  graphics: { quality: 'medium' },
};

// Quality presets: more rocks, shadows and pixels on stronger computers.
export const QUALITY = {
  low:    { rocks: 140, pixelRatio: 1,   shadows: false, fogFar: 210, terrainSegments: 110, stars: 800,  particles: 0.5 },
  medium: { rocks: 260, pixelRatio: 1.5, shadows: true,  fogFar: 270, terrainSegments: 150, stars: 1500, particles: 1 },
  high:   { rocks: 420, pixelRatio: 2,   shadows: true,  fogFar: 330, terrainSegments: 190, stars: 2200, particles: 1 },
};
