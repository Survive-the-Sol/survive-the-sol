// =====================================================================
// Survive the Sol: Storm Royale – TUNING NUMBERS
// Change these to make the game easier, harder, faster or slower.
// (1 unit ≈ 1 metre. The astronaut is about 1.8 units tall.)
// =====================================================================

export const CONFIG = {
  world: {
    size: 420,          // map is 420 x 420 units
    playRadius: 188,    // the astronaut cannot walk further than this from the centre
    baseRadius: 28,     // flat area around the main base dome
  },

  player: {
    walkSpeed: 7,
    sprintSpeed: 12.5,
    crouchSpeed: 3.5,
    accel: 10,          // how fast you speed up / slow down
    airControl: 0.35,   // how much you can steer while floating
    jumpSpeed: 6.6,
    gravity: 5.2,       // low gravity = floaty jumps (the real Moon has 1/6 of Earth's gravity)
    staminaMax: 100,
    staminaDrain: 26,   // per second while sprinting
    staminaRegen: 20,   // per second while not sprinting
    staminaRecover: 20, // after running out, you must recover this much to sprint again
  },

  camera: {
    distance: 9,
    minDistance: 4.5,
    maxDistance: 18,
    pitch: 0.42,        // starting up/down angle (radians)
  },

  // The 3 core mission resources (0–100).
  bars: {
    start: { power: 70, life: 70, rad: 100 },
    // Slow drain every second: the suit uses power, the crew uses air/water/food.
    drainPerSecond: { power: 0.10, life: 0.18, rad: 0 },
  },

  loot: {
    count: 140,          // supplies on the map
    pickupRadius: 1.7,
    comboWindow: 3,      // seconds between pickups to keep a combo going
  },

  graphics: {
    // 'low' | 'medium' | 'high' (a menu to change this comes in step 6)
    quality: 'medium',
  },
};

// Quality presets: more rocks, shadows and pixels on stronger computers.
export const QUALITY = {
  low:    { rocks: 140, pixelRatio: 1,   shadows: false, fogFar: 200, terrainSegments: 110, stars: 800 },
  medium: { rocks: 260, pixelRatio: 1.5, shadows: true,  fogFar: 260, terrainSegments: 150, stars: 1500 },
  high:   { rocks: 420, pixelRatio: 2,   shadows: true,  fogFar: 320, terrainSegments: 190, stars: 2200 },
};
