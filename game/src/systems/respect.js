// Respect points and level progression for VELAMAR.
export const RESPECT_LEVELS = [
  { name: 'Street', min: 0 },
  { name: 'Hustler', min: 100 },
  { name: 'Kingpin', min: 300 },
];

export function respectLevel(points = 0) {
  let current = RESPECT_LEVELS[0];
  for (const level of RESPECT_LEVELS) {
    if (points >= level.min) current = level;
  }
  return current.name;
}

export class RespectSystem {
  constructor(player) {
    this.player = player;
    if (!Number.isFinite(this.player.respect)) this.player.respect = 0;
  }

  get points() {
    return Math.max(0, Math.floor(this.player.respect || 0));
  }

  get level() {
    return respectLevel(this.points);
  }

  award(amount, reason = '') {
    const gain = Math.max(0, Math.floor(amount || 0));
    if (!gain) return 0;
    this.player.respect = this.points + gain;
    if (typeof this.player.save === 'function') this.player.save();
    return gain;
  }

  onMissionComplete() {
    return this.award(40, 'mission');
  }

  onEscapeWanted() {
    return this.award(60, 'escape');
  }
}
