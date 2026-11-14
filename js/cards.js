// =====================================================================
// CARDS – the PLAN phase. Every card from data/cards.json gets:
//   1) its bar changes (+/−) from cards.json, applied at the start of the sol
//   2) a gameplay effect for this sol (below), explained on the card
// So every choice has a cost AND changes how the sol plays.
// =====================================================================

export const CARD_MODS = {
  shield_wall:   { desc: 'Bigger final safe zone + more shield plates on the map.', zoneBonus: 8, loot: { shield: 2.2 } },
  water_wall:    { desc: 'Storm radiation hurts 25% less (water blocks radiation).', stormDamageMult: 0.75 },
  storm_shelter: { desc: 'Storm radiation hurts 40% less + an earlier storm warning.', stormDamageMult: 0.6, warnEarly: 10 },
  dosimeter:     { desc: 'Early storm warning, and the next safe zone shows on your map.', warnEarly: 15, showNextZone: true },
  fix_solar:     { desc: 'More solar panels and batteries, and Power slowly recharges.', loot: { solar: 2.2, battery: 1.6 }, powerRegen: 0.07 },
  clean_dust:    { desc: 'Power recharges faster, and dust storms drain less Power.', powerRegen: 0.1, dustProof: true },
  nuclear:       { desc: 'Power recharges all sol long, day and night.', powerRegen: 0.12 },
  power_save:    { desc: 'Your suit uses half the Power, but stamina refills slower.', powerDrainMult: 0.5, staminaRegenMult: 0.6 },
  veg:           { desc: 'A greenhouse by the base gives Life Support when you are near it, but uses Power.', greenhouse: true, powerDrainAdd: 0.04 },
  recycle_water: { desc: 'Life Support drains 40% slower.', lifeDrainMult: 0.6 },
  oxygen:        { desc: 'Life Support slowly refills, but Power drains a bit faster.', lifeRegen: 0.07, powerDrainAdd: 0.04 },
  fix_air:       { desc: 'Life Support drains 30% slower.', lifeDrainMult: 0.7 },
  ice_mining:    { desc: 'Lots more ice chunks to find (+Life Support).', loot: { ice: 2.5 } },
  moxie:         { desc: 'Life Support slowly refills, but Power drains faster.', lifeRegen: 0.09, powerDrainAdd: 0.05 },
  research:      { desc: '+50% XP this sol and a rare scanner in your backpack.', xpMult: 1.5, startItems: [['scanner', 'rare']] },
  rover:         { desc: 'Rovers drive 30% faster and use less Power.', roverSpeed: 1.3, roverPowerMult: 0.7 },
  rest:          { desc: 'Much bigger stamina all sol, but fewer supplies on the map.', staminaMult: 1.6, lootCountMult: 0.75 },
  exercise:      { desc: 'Sprint 15% faster all sol.', sprintMult: 1.15 },
  call_earth:    { desc: 'One extra airdrop, and you know where airdrops land early.', airdropExtra: 1, airdropEarly: true },
  send_video:    { desc: 'One extra airdrop, and you know where airdrops land early.', airdropExtra: 1, airdropEarly: true },
  health_check:  { desc: 'Start the sol with a med kit in your backpack.', startItems: [['medkit', 'rare']] },
};

// The card's bar changes (only the 3 core bars count).
export function cardBarEffects(card) {
  const out = {};
  for (const k of ['power', 'life', 'rad']) if (card.effects[k]) out[k] = card.effects[k];
  return out;
}

// Pick n different random cards for this level.
export function dealCards(allCards, level, n = 3) {
  const pool = allCards.filter((c) => c.levels.includes(level) && CARD_MODS[c.id]);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}

// What the card actually did this sol (for the night report), from the sol stats.
export function cardReport(card, stats) {
  const mod = CARD_MODS[card.id] || {};
  const lines = [];
  if (mod.powerRegen) lines.push(`Recharged +${Math.round(stats.cardPower)} Power`);
  if (mod.lifeRegen || mod.greenhouse) lines.push(`Gave +${Math.round(stats.cardLife)} Life Support`);
  if (mod.powerDrainAdd) lines.push(`Used ${Math.round(stats.cardPowerCost)} extra Power`);
  if (mod.stormDamageMult) lines.push(`Blocked ${Math.round(stats.radBlocked)} radiation`);
  if (mod.lifeDrainMult || mod.powerDrainMult) lines.push(`Saved ${Math.round(stats.drainSaved)} from slower drain`);
  if (mod.zoneBonus) lines.push(`Final safe zone was ${mod.zoneBonus} m bigger`);
  if (mod.loot) lines.push(`Extra ${Object.keys(mod.loot).join(' / ')} supplies were on the map`);
  if (mod.xpMult) lines.push(`XP ×${mod.xpMult}`);
  if (mod.warnEarly) lines.push(`Storm warning came ${mod.warnEarly} s early`);
  if (mod.startItems) lines.push(`Started with a ${mod.startItems.map((s) => s[0]).join(', ')}`);
  if (mod.roverSpeed) lines.push(`Rovers were faster (you drove ${Math.round(stats.roverMeters)} m)`);
  if (mod.staminaMult || mod.sprintMult) lines.push('Stronger sprinting all sol');
  if (mod.airdropExtra) lines.push('One extra airdrop came down');
  if (!lines.length) lines.push(mod.desc || '');
  return lines;
}
