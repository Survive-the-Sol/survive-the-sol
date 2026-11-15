// =====================================================================
// BACKPACK – limited slots (level 1/2/3 = 4/6/8 slots).
// You can't carry everything: choose what to keep, use or drop.
// Slots 1–4 are the quick slots (keys 1–4).
// =====================================================================
import { CONFIG } from './config.js';

export function createBackpack(level = 1) {
  const bp = {
    level,
    bonus: 0,                 // extra slots from a backpack upgrade found this sol
    slots: [],
    get size() { return CONFIG.backpack.slots[Math.min(3, Math.max(1, this.level)) - 1] + this.bonus; },
    reset(newLevel) {
      this.level = newLevel; this.bonus = 0;
      this.slots = new Array(this.size).fill(null);
    },
    resize() { while (this.slots.length < this.size) this.slots.push(null); },
    count() { return this.slots.filter(Boolean).length; },
    isFull() { return this.count() >= this.size; },
    // item = { type, rarity }
    add(item) {
      const i = this.slots.findIndex((s) => !s);
      if (i < 0) return -1;
      this.slots[i] = item;
      return i;
    },
    take(i) { const it = this.slots[i]; this.slots[i] = null; return it; },
    swap(i, j) { const a = this.slots[i]; this.slots[i] = this.slots[j]; this.slots[j] = a; },
    items() { return this.slots.filter(Boolean); },
    clearAll() { this.slots = this.slots.map(() => null); },
  };
  bp.reset(level);
  return bp;
}
