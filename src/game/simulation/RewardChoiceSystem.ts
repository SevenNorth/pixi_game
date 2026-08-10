import {
  playerSkillDefinitions,
} from '../content/skills/playerSkillDefinitions';
import type { PlayerSkillId } from '../content/skills/playerSkillDefinitions';
import {
  passiveSkillDefinitions,
} from '../content/skills/passiveSkillDefinitions';
import type { PassiveSkillId } from '../content/skills/passiveSkillDefinitions';
import type { LearnedPlayerSkill } from './PlayerSkillSystem';
import type { PassiveSkillSlot } from './PlayerPassiveSystem';

export const REWARD_CANDIDATE_COUNT = 3;

export type RewardSource = 'level-up' | 'elite-core' | 'boss' | 'post-max';
export type RewardOperation = 'learn' | 'upgrade';

interface RewardCandidateBase {
  id: string;
  operation: RewardOperation;
  currentLevel: number;
  nextLevel: number;
  maxLevel: number;
}

export interface ActiveSkillRewardCandidate extends RewardCandidateBase {
  kind: 'active-skill';
  skillId: PlayerSkillId;
}

export interface PassiveSkillRewardCandidate extends RewardCandidateBase {
  kind: 'passive-skill';
  skillId: PassiveSkillId;
}

export type RewardCandidate = ActiveSkillRewardCandidate | PassiveSkillRewardCandidate;

export interface RewardChoice {
  id: number;
  source: RewardSource;
  candidates: RewardCandidate[];
}

export type RewardResolution =
  | {
      kind: 'active-equip';
      candidateId: string;
      selectedSlot: number | null;
    }
  | {
      kind: 'active-forget';
      candidateId: string;
      selectedSkillId: PlayerSkillId | null;
    }
  | {
      kind: 'passive-replace';
      candidateId: string;
      selectedSlot: number | null;
    };

export interface RewardChoiceContext {
  activeSkills: readonly LearnedPlayerSkill[];
  passiveSkills: readonly (PassiveSkillSlot | null)[];
}

export interface RewardChoiceState {
  active: RewardChoice | null;
  resolution: RewardResolution | null;
  pending: RewardSource[];
  randomState: number;
  nextChoiceId: number;
}

const DEFAULT_RANDOM_SEED = 0x6d2b79f5;

export class RewardChoiceSystem {
  readonly state: RewardChoiceState = {
    active: null,
    resolution: null,
    pending: [],
    randomState: DEFAULT_RANDOM_SEED,
    nextChoiceId: 1,
  };

  reset(seed = DEFAULT_RANDOM_SEED) {
    this.state.active = null;
    this.state.resolution = null;
    this.state.pending = [];
    this.state.randomState = normalizeSeed(seed);
    this.state.nextChoiceId = 1;
  }

  enqueue(source: RewardSource, count = 1) {
    const normalizedCount = Math.max(0, Math.floor(count));
    for (let index = 0; index < normalizedCount; index += 1) {
      this.state.pending.push(source);
    }
  }

  activateNext(context: RewardChoiceContext) {
    if (this.state.active) return this.state.active;

    while (this.state.pending.length > 0) {
      const source = this.state.pending.shift()!;
      const candidates = this.generateCandidates(source, context);
      if (candidates.length === 0) continue;
      this.state.active = {
        id: this.state.nextChoiceId,
        source,
        candidates,
      };
      this.state.nextChoiceId += 1;
      return this.state.active;
    }

    return null;
  }

  select(candidateId: string) {
    const choice = this.state.active;
    if (!choice) return null;
    const candidate = choice.candidates.find(item => item.id === candidateId);
    if (!candidate) return null;
    this.state.active = null;
    this.state.resolution = null;
    return candidate;
  }

  beginResolution(resolution: RewardResolution) {
    const candidateExists = this.state.active?.candidates.some(
      candidate => candidate.id === resolution.candidateId,
    );
    if (!candidateExists) return false;
    this.state.resolution = resolution;
    return true;
  }

  selectResolutionSlot(slot: number) {
    const resolution = this.state.resolution;
    if (!resolution || resolution.kind === 'active-forget') return false;
    resolution.selectedSlot = Math.max(0, Math.floor(slot));
    return true;
  }

  selectSkillToForget(skillId: PlayerSkillId) {
    const resolution = this.state.resolution;
    if (!resolution || resolution.kind !== 'active-forget') return false;
    resolution.selectedSkillId = skillId;
    return true;
  }

  clearResolutionSelection() {
    const resolution = this.state.resolution;
    if (!resolution) return;
    if (resolution.kind === 'active-forget') resolution.selectedSkillId = null;
    else resolution.selectedSlot = null;
  }

  generateCandidates(source: RewardSource, context: RewardChoiceContext) {
    const pool = this.buildCandidatePool(source, context);
    const selected: RewardCandidate[] = [];

    if (source === 'level-up' || source === 'boss') {
      this.takeRandom(
        pool.filter(candidate => candidate.operation === 'upgrade'),
        pool,
        selected,
      );
      this.takeRandom(
        pool.filter(candidate => (
          candidate.kind === 'active-skill' && candidate.operation === 'learn'
        )),
        pool,
        selected,
      );
    } else if (source === 'elite-core') {
      this.takeRandom(
        pool.filter(candidate => candidate.operation === 'upgrade'),
        pool,
        selected,
      );
    }

    while (selected.length < REWARD_CANDIDATE_COUNT && pool.length > 0) {
      const candidate = this.takeWeighted(pool, source);
      selected.push(candidate);
    }

    return selected;
  }

  private buildCandidatePool(source: RewardSource, context: RewardChoiceContext) {
    const candidates: RewardCandidate[] = [];
    const allowActive = source !== 'post-max';
    const allowPassive = source !== 'elite-core';

    if (allowActive) {
      (Object.keys(playerSkillDefinitions) as PlayerSkillId[]).forEach(skillId => {
        const definition = playerSkillDefinitions[skillId];
        const learned = context.activeSkills.find(skill => skill.id === skillId);
        if (learned && learned.level >= definition.maxLevel) return;
        const currentLevel = learned?.level ?? 0;
        candidates.push({
          id: `active-skill:${skillId}:${learned ? 'upgrade' : 'learn'}`,
          kind: 'active-skill',
          skillId,
          operation: learned ? 'upgrade' : 'learn',
          currentLevel,
          nextLevel: currentLevel + 1,
          maxLevel: definition.maxLevel,
        });
      });
    }

    if (allowPassive) {
      (Object.keys(passiveSkillDefinitions) as PassiveSkillId[]).forEach(skillId => {
        const definition = passiveSkillDefinitions[skillId];
        const learned = context.passiveSkills.find(skill => skill?.id === skillId);
        if (learned && learned.level >= definition.maxLevel) return;
        const currentLevel = learned?.level ?? 0;
        candidates.push({
          id: `passive-skill:${skillId}:${learned ? 'upgrade' : 'learn'}`,
          kind: 'passive-skill',
          skillId,
          operation: learned ? 'upgrade' : 'learn',
          currentLevel,
          nextLevel: currentLevel + 1,
          maxLevel: definition.maxLevel,
        });
      });
    }

    return candidates;
  }

  private takeRandom(
    candidates: RewardCandidate[],
    pool: RewardCandidate[],
    selected: RewardCandidate[],
  ) {
    if (selected.length >= REWARD_CANDIDATE_COUNT || candidates.length === 0) return;
    const candidate = candidates[Math.floor(this.nextRandom() * candidates.length)];
    removeCandidate(pool, candidate.id);
    selected.push(candidate);
  }

  private takeWeighted(pool: RewardCandidate[], source: RewardSource) {
    const weights = pool.map(candidate => getCandidateWeight(candidate, source));
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    let roll = this.nextRandom() * totalWeight;
    let selectedIndex = pool.length - 1;
    for (let index = 0; index < pool.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) {
        selectedIndex = index;
        break;
      }
    }
    return pool.splice(selectedIndex, 1)[0];
  }

  private nextRandom() {
    let state = this.state.randomState;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.state.randomState = state >>> 0;
    return this.state.randomState / 0x1_0000_0000;
  }
}

function getCandidateWeight(candidate: RewardCandidate, source: RewardSource) {
  if (source === 'elite-core') return candidate.operation === 'upgrade' ? 4 : 1.5;
  if (source === 'post-max') return candidate.operation === 'upgrade' ? 2 : 1;
  if (source === 'boss') {
    return (candidate.kind === 'active-skill' ? 1.4 : 1)
      * (candidate.operation === 'upgrade' ? 1.4 : 1);
  }
  return candidate.operation === 'upgrade' ? 1.25 : 1;
}

function removeCandidate(pool: RewardCandidate[], candidateId: string) {
  const index = pool.findIndex(candidate => candidate.id === candidateId);
  if (index >= 0) pool.splice(index, 1);
}

function normalizeSeed(seed: number) {
  const normalized = Math.floor(seed) >>> 0;
  return normalized === 0 ? DEFAULT_RANDOM_SEED : normalized;
}
