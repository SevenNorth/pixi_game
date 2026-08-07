export interface PlayerProgressionState {
  level: number;
  experience: number;
  experienceToNext: number;
  maxLevel: number;
}

export interface ExperienceResult {
  gained: number;
  levelUps: number;
  reachedMaxLevel: boolean;
}

const START_LEVEL = 1;
const MAX_LEVEL = 10;

export class PlayerProgression {
  readonly state: PlayerProgressionState = {
    level: START_LEVEL,
    experience: 0,
    experienceToNext: experienceForNextLevel(START_LEVEL),
    maxLevel: MAX_LEVEL,
  };

  reset() {
    this.state.level = START_LEVEL;
    this.state.experience = 0;
    this.state.experienceToNext = experienceForNextLevel(START_LEVEL);
  }

  gainExperience(amount: number): ExperienceResult {
    const gained = Math.max(0, amount);
    if (gained === 0 || this.state.level >= this.state.maxLevel) {
      return { gained: 0, levelUps: 0, reachedMaxLevel: this.state.level >= this.state.maxLevel };
    }

    this.state.experience += gained;
    let levelUps = 0;
    while (this.state.level < this.state.maxLevel && this.state.experience >= this.state.experienceToNext) {
      this.state.experience -= this.state.experienceToNext;
      this.state.level += 1;
      levelUps += 1;
      this.state.experienceToNext = experienceForNextLevel(this.state.level);
    }

    return { gained, levelUps, reachedMaxLevel: this.state.level >= this.state.maxLevel };
  }
}

export function experienceForNextLevel(level: number) {
  return 3 + Math.max(0, level - 1) * 2;
}
