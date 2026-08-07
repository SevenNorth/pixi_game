export type MapProgressionStatus = 'progressing' | 'boss-ready' | 'boss-active';

export interface MapProgressionState {
  level: number;
  experience: number;
  experienceToNext: number;
  explorationExperience: number;
  explorationExperienceCap: number;
  status: MapProgressionStatus;
}

const START_MAP_LEVEL = 1;
const EXPLORATION_SHARE = 0.35;

export class MapProgression {
  readonly state: MapProgressionState = createMapProgressionState(START_MAP_LEVEL);

  reset() {
    Object.assign(this.state, createMapProgressionState(START_MAP_LEVEL));
  }

  gainKillExperience(amount: number) {
    if (this.state.status !== 'progressing') return 0;
    return this.addExperience(Math.max(0, Math.floor(amount)));
  }

  gainExplorationExperience(amount: number) {
    if (this.state.status !== 'progressing') return 0;
    const available = Math.max(
      0,
      this.state.explorationExperienceCap - this.state.explorationExperience,
    );
    const gained = Math.min(available, Math.max(0, Math.floor(amount)));
    const applied = this.addExperience(gained);
    this.state.explorationExperience += applied;
    return applied;
  }

  markBossSpawned() {
    if (this.state.status !== 'boss-ready') return false;
    this.state.status = 'boss-active';
    return true;
  }

  completeBoss() {
    if (this.state.status !== 'boss-active') return false;
    Object.assign(this.state, createMapProgressionState(this.state.level + 1));
    return true;
  }

  failBoss() {
    if (this.state.status !== 'boss-active') return false;
    this.state.status = 'boss-ready';
    return true;
  }

  private addExperience(amount: number) {
    const previous = this.state.experience;
    this.state.experience = Math.min(
      this.state.experienceToNext,
      this.state.experience + amount,
    );
    if (this.state.experience >= this.state.experienceToNext) {
      this.state.status = 'boss-ready';
    }
    return this.state.experience - previous;
  }
}

function createMapProgressionState(level: number): MapProgressionState {
  const experienceToNext = experienceForNextMapLevel(level);
  return {
    level,
    experience: 0,
    experienceToNext,
    explorationExperience: 0,
    explorationExperienceCap: Math.floor(experienceToNext * EXPLORATION_SHARE),
    status: 'progressing',
  };
}

function experienceForNextMapLevel(level: number) {
  return 12 + Math.max(0, level - 1) * 8;
}
