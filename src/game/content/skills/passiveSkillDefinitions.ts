export type PassiveSkillId =
  | 'attack-boost'
  | 'shield-capacity'
  | 'move-speed'
  | 'cooldown-reduction';

export type PassiveModifier = 'attack' | 'maxShield' | 'moveSpeed' | 'cooldown';

export interface PassiveSkillDefinition {
  id: PassiveSkillId;
  modifier: PassiveModifier;
  maxLevel: number;
  valuePerLevel: number;
}

export const passiveSkillDefinitions: Record<PassiveSkillId, PassiveSkillDefinition> = {
  'attack-boost': { id: 'attack-boost', modifier: 'attack', maxLevel: 3, valuePerLevel: 1 },
  'shield-capacity': { id: 'shield-capacity', modifier: 'maxShield', maxLevel: 3, valuePerLevel: 1 },
  'move-speed': { id: 'move-speed', modifier: 'moveSpeed', maxLevel: 3, valuePerLevel: 0.08 },
  'cooldown-reduction': {
    id: 'cooldown-reduction',
    modifier: 'cooldown',
    maxLevel: 3,
    valuePerLevel: 0.08,
  },
};
