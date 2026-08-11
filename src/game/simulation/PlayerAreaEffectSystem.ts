export interface PlayerAreaEffectPoint {
  x: number;
  y: number;
}

export interface ScheduledStrikeConfig extends PlayerAreaEffectPoint {
  radius: number;
  damage: number;
  firstStrikeAt: number;
  strikeCount: number;
  strikeIntervalMs: number;
}

export interface PlayerFieldConfig extends PlayerAreaEffectPoint {
  radius: number;
  damage: number;
  slowMultiplier: number;
  startsAt: number;
  durationMs: number;
  tickIntervalMs: number;
}

export interface PlayerFieldState extends PlayerAreaEffectPoint {
  id: string;
  radius: number;
  damage: number;
  slowMultiplier: number;
  endsAt: number;
  nextTickAt: number;
  tickIntervalMs: number;
}

export type PlayerAreaEffectEvent =
  | ({ type: 'strike' } & PlayerAreaEffectPoint & { radius: number; damage: number })
  | ({ type: 'field-tick' } & PlayerFieldState)
  | { type: 'field-expired'; fieldId: string };

interface ScheduledStrikeState extends ScheduledStrikeConfig {
  id: string;
  nextStrikeAt: number;
  strikesRemaining: number;
}

export class PlayerAreaEffectSystem {
  private scheduledStrikes: ScheduledStrikeState[] = [];
  private fields: PlayerFieldState[] = [];
  private nextId = 1;

  reset() {
    this.scheduledStrikes = [];
    this.fields = [];
    this.nextId = 1;
  }

  scheduleStrikes(config: ScheduledStrikeConfig) {
    const state: ScheduledStrikeState = {
      ...config,
      id: `strike-${this.nextId++}`,
      nextStrikeAt: config.firstStrikeAt,
      strikesRemaining: Math.max(1, Math.floor(config.strikeCount)),
    };
    this.scheduledStrikes.push(state);
    return state.id;
  }

  createField(config: PlayerFieldConfig) {
    const state: PlayerFieldState = {
      id: `field-${this.nextId++}`,
      x: config.x,
      y: config.y,
      radius: Math.max(0, config.radius),
      damage: Math.max(0, config.damage),
      slowMultiplier: Math.max(0, Math.min(1, config.slowMultiplier)),
      endsAt: config.startsAt + Math.max(0, config.durationMs),
      nextTickAt: config.startsAt,
      tickIntervalMs: Math.max(1, config.tickIntervalMs),
    };
    this.fields.push(state);
    return state;
  }

  update(now: number) {
    const events: PlayerAreaEffectEvent[] = [];
    this.scheduledStrikes.forEach(strike => {
      while (strike.strikesRemaining > 0 && now >= strike.nextStrikeAt) {
        events.push({
          type: 'strike',
          x: strike.x,
          y: strike.y,
          radius: strike.radius,
          damage: strike.damage,
        });
        strike.strikesRemaining -= 1;
        strike.nextStrikeAt += Math.max(1, strike.strikeIntervalMs);
      }
    });
    this.scheduledStrikes = this.scheduledStrikes.filter(strike => strike.strikesRemaining > 0);

    this.fields.forEach(field => {
      while (field.nextTickAt <= field.endsAt && now >= field.nextTickAt) {
        events.push({ type: 'field-tick', ...field });
        field.nextTickAt += field.tickIntervalMs;
      }
      if (now >= field.endsAt) events.push({ type: 'field-expired', fieldId: field.id });
    });
    this.fields = this.fields.filter(field => now < field.endsAt);
    return events;
  }

  getActiveFields() {
    return this.fields as readonly PlayerFieldState[];
  }
}

export function getFieldSlowMultiplierAt(
  fields: readonly PlayerFieldState[],
  point: PlayerAreaEffectPoint,
) {
  return fields.reduce((multiplier, field) => (
    Math.hypot(point.x - field.x, point.y - field.y) <= field.radius
      ? Math.min(multiplier, field.slowMultiplier)
      : multiplier
  ), 1);
}
