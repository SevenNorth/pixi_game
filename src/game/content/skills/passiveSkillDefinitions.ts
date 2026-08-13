export type PassiveSkillId =
  | 'attack-boost'
  | 'shield-capacity'
  | 'move-speed'
  | 'cooldown-reduction'
  | 'piercing-current'
  | 'overflow-charge'
  | 'rapid-casting'
  | 'emergency-capacitor';

export type PassiveModifier =
  | 'attack'
  | 'maxShield'
  | 'moveSpeed'
  | 'cooldown'
  | 'projectilePierce'
  | 'foodShieldConversion'
  | 'postCastAttackSpeed'
  | 'emergencyShield';

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
  'piercing-current': {
    id: 'piercing-current',
    modifier: 'projectilePierce',
    maxLevel: 3,
    valuePerLevel: 1,
  },
  'overflow-charge': {
    id: 'overflow-charge',
    modifier: 'foodShieldConversion',
    maxLevel: 3,
    valuePerLevel: 0.25,
  },
  'rapid-casting': {
    id: 'rapid-casting',
    modifier: 'postCastAttackSpeed',
    maxLevel: 3,
    valuePerLevel: 0.12,
  },
  'emergency-capacitor': {
    id: 'emergency-capacitor',
    modifier: 'emergencyShield',
    maxLevel: 3,
    valuePerLevel: 0.5,
  },
};
