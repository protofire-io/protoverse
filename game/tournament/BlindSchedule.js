const BLIND_SCHEDULE = [
  { smallBlind: 10, bigBlind: 20, durationMs: 60000 },
  { smallBlind: 25, bigBlind: 50, durationMs: 60000 },
  { smallBlind: 50, bigBlind: 100, durationMs: 60000 },
  { smallBlind: 100, bigBlind: 200, durationMs: 60000 },
  { smallBlind: 200, bigBlind: 400, durationMs: 60000 },
  { smallBlind: 500, bigBlind: 1000, durationMs: 60000 },
  { smallBlind: 1000, bigBlind: 2000, durationMs: 90000 },
  { smallBlind: 2500, bigBlind: 5000, durationMs: 90000 },
];

class BlindSchedule {
  constructor(levels = BLIND_SCHEDULE) {
    this.levels = levels;
    this.index = 0;
    this.levelStartedAt = Date.now();
    this.timer = null;
  }

  current() {
    return this.levels[Math.min(this.index, this.levels.length - 1)];
  }

  start(onLevelUp) {
    this.levelStartedAt = Date.now();
    this.clear();
    const tick = () => {
      const level = this.current();
      this.timer = setTimeout(() => {
        if (this.index < this.levels.length - 1) {
          this.index += 1;
          this.levelStartedAt = Date.now();
          onLevelUp && onLevelUp(this.current());
        }
        tick();
      }, level.durationMs);
    };
    tick();
  }

  clear() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

module.exports = { BlindSchedule, BLIND_SCHEDULE };
