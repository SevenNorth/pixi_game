import { passiveSkillDefinitions } from '../content/skills/passiveSkillDefinitions';
import type { PassiveSkillId } from '../content/skills/passiveSkillDefinitions';

export const INITIAL_PASSIVE_SLOT_COUNT = 4;
export const MAX_PASSIVE_SLOT_COUNT = 6;

export interface PassiveSkillSlot {
  id: PassiveSkillId;
  level: number;
}

export type AcquirePassiveResult =
  | { status: 'learned' | 'upgraded'; slot: number; passive: PassiveSkillSlot }
  | { status: 'max-level'; slot: number; passive: PassiveSkillSlot }
  | { status: 'requires-replacement' | 'requires-confirmation'; passiveId: PassiveSkillId }
  | { status: 'invalid-slot'; passiveId: PassiveSkillId };

export class PlayerPassiveSystem {
  slots: Array<PassiveSkillSlot | null> = Array.from(
    { length: INITIAL_PASSIVE_SLOT_COUNT },
    () => null,
  );

  reset() {
    this.slots = Array.from({ length: INITIAL_PASSIVE_SLOT_COUNT }, () => null);
  }

  expandSlots(count = 1) {
    const available = MAX_PASSIVE_SLOT_COUNT - this.slots.length;
    const added = Math.min(available, Math.max(0, Math.floor(count)));
    for (let index = 0; index < added; index += 1) this.slots.push(null);
    return added;
  }

  acquire(
    passiveId: PassiveSkillId,
    replacementSlot?: number,
    confirmed = false,
  ): AcquirePassiveResult {
    const existingSlot = this.slots.findIndex(slot => slot?.id === passiveId);
    if (existingSlot >= 0) {
      const passive = this.slots[existingSlot]!;
      const maxLevel = passiveSkillDefinitions[passiveId].maxLevel;
      if (passive.level >= maxLevel) return { status: 'max-level', slot: existingSlot, passive };
      passive.level += 1;
      return { status: 'upgraded', slot: existingSlot, passive };
    }

    const emptySlot = this.slots.findIndex(slot => slot === null);
    if (emptySlot >= 0) {
      const passive = { id: passiveId, level: 1 };
      this.slots[emptySlot] = passive;
      return { status: 'learned', slot: emptySlot, passive };
    }

    if (replacementSlot === undefined) {
      return { status: 'requires-replacement', passiveId };
    }
    if (replacementSlot < 0 || replacementSlot >= this.slots.length) {
      return { status: 'invalid-slot', passiveId };
    }
    if (!confirmed) return { status: 'requires-confirmation', passiveId };

    const passive = { id: passiveId, level: 1 };
    this.slots[replacementSlot] = passive;
    return { status: 'learned', slot: replacementSlot, passive };
  }

  getModifiers() {
    const modifiers = {
      attackBonus: 0,
      maxShieldBonus: 0,
      moveSpeedMultiplier: 1,
      cooldownMultiplier: 1,
    };
    this.slots.forEach(slot => {
      if (!slot) return;
      const definition = passiveSkillDefinitions[slot.id];
      const value = definition.valuePerLevel * slot.level;
      if (definition.modifier === 'attack') modifiers.attackBonus += value;
      if (definition.modifier === 'maxShield') modifiers.maxShieldBonus += value;
      if (definition.modifier === 'moveSpeed') modifiers.moveSpeedMultiplier += value;
      if (definition.modifier === 'cooldown') modifiers.cooldownMultiplier -= value;
    });
    modifiers.cooldownMultiplier = Math.max(0.5, modifiers.cooldownMultiplier);
    return modifiers;
  }
}
