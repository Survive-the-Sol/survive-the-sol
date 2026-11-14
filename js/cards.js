// =====================================================================
// EMERGENCY CARDS – the heart of the trainer.
// Each day: pick 3 of 5 offered cards. When a danger hits, use one:
//   • right card for the danger  → full effect (blocks effect.reduce of the damage)
//   • wrong card                  → half effect, and ROVI explains the better card
//   • no card                     → full damage
// Each card can be used once per day, and every card has a real cost.
// =====================================================================

export function cardsForLevel(all, level) { return all.filter((c) => c.levels.includes(level)); }

// 5 random cards for today. At least 2 solar-storm cards (a storm comes every day),
// and at least one card for each extra danger planned today.
export function dealCards(all, level, dangerTypes) {
  const deck = shuffle(cardsForLevel(all, level));
  const offer = [];
  const take = (pred) => { const c = deck.find((x) => pred(x) && !offer.includes(x)); if (c) offer.push(c); };
  take((c) => c.dangerTypes.includes('solar_storm'));
  take((c) => c.dangerTypes.includes('solar_storm'));
  for (const t of dangerTypes) if (t !== 'solar_storm') take((c) => c.dangerTypes.includes(t));
  // one card for another danger type, so there is always a real choice
  take((c) => !c.dangerTypes.includes('solar_storm'));
  for (const c of deck) if (offer.length < 5 && !offer.includes(c)) offer.push(c);
  return shuffle(offer.slice(0, 5));
}

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const isRight = (card, dangerType) => card.dangerTypes.includes(dangerType);

// How much of the damage this card blocks for this danger.
export function blockShare(card, dangerType) {
  if (!card) return 0;
  return isRight(card, dangerType) ? card.effect.reduce : card.effect.reduce / 2;
}

// Tags for the hand during a danger: BEST (strongest right card), GOOD (other right cards).
export function handTags(hand, usedIds, dangerType) {
  const usable = hand.filter((c) => !usedIds.has(c.id) && isRight(c, dangerType));
  const best = usable.slice().sort((a, b) => b.effect.reduce - a.effect.reduce)[0];
  return hand.map((c) => (usedIds.has(c.id) ? 'used' : c === best ? 'best' : usable.includes(c) ? 'good' : ''));
}

// The best card in the whole deck for a danger (for ROVI's advice and the Lose screen).
export function bestCardsFor(all, level, dangerType) {
  return cardsForLevel(all, level).filter((c) => isRight(c, dangerType)).sort((a, b) => b.effect.reduce - a.effect.reduce);
}
