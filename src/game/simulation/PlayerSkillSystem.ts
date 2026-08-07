import {
  getPlayerSkillDefinition,
  playerSkillDefinitions,
} from '../content/skills/playerSkillDefinitions';
import type { PlayerSkillId } from '../content/skills/playerSkillDefinitions';
import type { SkillAction } from '../input/GameActions';
import {
  advanceSkillRuntime,
  createSkillRuntime,
  getSkillTimeUntilReady,
  requestSkillActivation,
  startSkillCooldown,
} from './SkillSystem';
import type { SkillRuntimeEvent, SkillRuntimeState } from './SkillSystem';

export const ACTIVE_SKILL_SLOT_COUNT = 3;
export const LEARNED_SKILL_LIMIT = 6;
export type ActiveSkillSlotIndex = 0 | 1 | 2;

export interface LearnedPlayerSkill {
  id: PlayerSkillId;
  level: number;
}

export interface PlayerSkillState {
  learned: LearnedPlayerSkill[];
  equipped: [PlayerSkillId | null, PlayerSkillId | null, PlayerSkillId | null];
}

export interface PlayerSkillRuntimeEvent {
  skillId: PlayerSkillId;
  slot: ActiveSkillSlotIndex | null;
  event: SkillRuntimeEvent;
}

export interface PlayerSkillSlotState {
  id: PlayerSkillId;
  level: number;
  phase: SkillRuntimeState['phase'];
  remainingMs: number;
  cooldownMs: number;
}

export type LearnSkillResult =
  | { status: 'learned' | 'upgraded'; skill: LearnedPlayerSkill }
  | { status: 'max-level'; skill: LearnedPlayerSkill }
  | { status: 'requires-forget' | 'requires-confirmation'; skillId: PlayerSkillId }
  | { status: 'invalid-replacement'; skillId: PlayerSkillId };

export class PlayerSkillSystem {
  readonly state: PlayerSkillState = {
    learned: [],
    equipped: [null, null, null],
  };

  private readonly runtimes = new Map<PlayerSkillId, SkillRuntimeState>();
  private cooldownMultiplier = 1;

  reset(now = 0) {
    this.state.learned = [{ id: 'lightning-bolt', level: 1 }];
    this.state.equipped = ['lightning-bolt', null, null];
    this.runtimes.clear();
    this.runtimes.set(
      'lightning-bolt',
      createSkillRuntime(getPlayerSkillDefinition('lightning-bolt', 1), now),
    );
    this.cooldownMultiplier = 1;
  }

  setCooldownMultiplier(multiplier: number) {
    this.cooldownMultiplier = Math.max(0.5, Math.min(1, multiplier));
  }

  learnSkill(
    skillId: PlayerSkillId,
    now: number,
    replacementId?: PlayerSkillId,
    confirmed = false,
  ): LearnSkillResult {
    const existing = this.getLearnedSkill(skillId);
    if (existing) {
      const maxLevel = playerSkillDefinitions[skillId].maxLevel;
      if (existing.level >= maxLevel) return { status: 'max-level', skill: existing };
      existing.level += 1;
      return { status: 'upgraded', skill: existing };
    }

    if (this.state.learned.length >= LEARNED_SKILL_LIMIT) {
      if (!replacementId) return { status: 'requires-forget', skillId };
      if (!confirmed) return { status: 'requires-confirmation', skillId };
      const replacementIndex = this.state.learned.findIndex(skill => skill.id === replacementId);
      if (replacementIndex < 0) return { status: 'invalid-replacement', skillId };
      this.state.learned.splice(replacementIndex, 1);
      this.runtimes.delete(replacementId);
      this.state.equipped = this.state.equipped.map(id => (
        id === replacementId ? null : id
      )) as PlayerSkillState['equipped'];
    }

    const learned = { id: skillId, level: 1 };
    this.state.learned.push(learned);
    const definition = getPlayerSkillDefinition(skillId, 1, this.cooldownMultiplier);
    const runtime = createSkillRuntime(definition, now);
    this.runtimes.set(skillId, runtime);
    const emptySlot = this.state.equipped.findIndex(id => id === null);
    if (emptySlot >= 0) {
      this.state.equipped[emptySlot as ActiveSkillSlotIndex] = skillId;
      startSkillCooldown(definition, runtime, now);
    }
    return { status: 'learned', skill: learned };
  }

  equipSkill(
    skillId: PlayerSkillId,
    slot: ActiveSkillSlotIndex,
    now: number,
    safeToChange: boolean,
  ) {
    if (!safeToChange) return false;
    const learned = this.getLearnedSkill(skillId);
    const runtime = this.runtimes.get(skillId);
    if (!learned || !runtime) return false;

    this.state.equipped = this.state.equipped.map(id => (
      id === skillId ? null : id
    )) as PlayerSkillState['equipped'];
    this.state.equipped[slot] = skillId;
    startSkillCooldown(
      getPlayerSkillDefinition(skillId, learned.level, this.cooldownMultiplier),
      runtime,
      now,
    );
    return true;
  }

  requestAction(action: SkillAction, now: number) {
    const slot = ({ 'skill-1': 0, 'skill-2': 1, 'skill-3': 2 } as const)[action];
    const skillId = this.state.equipped[slot];
    if (!skillId) return { accepted: false, events: [] as PlayerSkillRuntimeEvent[] };
    const learned = this.getLearnedSkill(skillId)!;
    const definition = getPlayerSkillDefinition(skillId, learned.level, this.cooldownMultiplier);
    const activation = requestSkillActivation(definition, this.runtimes.get(skillId)!, now);
    return {
      accepted: activation.accepted,
      events: activation.events.map(event => ({ skillId, slot, event })),
    };
  }

  update(now: number) {
    const events: PlayerSkillRuntimeEvent[] = [];
    this.state.learned.forEach(skill => {
      const runtime = this.runtimes.get(skill.id);
      if (!runtime) return;
      const definition = getPlayerSkillDefinition(
        skill.id,
        skill.level,
        this.cooldownMultiplier,
      );
      const slotIndex = this.state.equipped.indexOf(skill.id);
      advanceSkillRuntime(definition, runtime, now).forEach(event => {
        events.push({
          skillId: skill.id,
          slot: slotIndex >= 0 ? slotIndex as ActiveSkillSlotIndex : null,
          event,
        });
      });
    });
    return events;
  }

  getSlotStates(now: number): Array<PlayerSkillSlotState | null> {
    return this.state.equipped.map(skillId => {
      if (!skillId) return null;
      const learned = this.getLearnedSkill(skillId)!;
      const definition = getPlayerSkillDefinition(skillId, learned.level, this.cooldownMultiplier);
      const runtime = this.runtimes.get(skillId)!;
      return {
        id: skillId,
        level: learned.level,
        phase: runtime.phase,
        remainingMs: getSkillTimeUntilReady(definition, runtime, now),
        cooldownMs: definition.cooldownMs,
      };
    });
  }

  getLearnedSkill(skillId: PlayerSkillId) {
    return this.state.learned.find(skill => skill.id === skillId);
  }
}
