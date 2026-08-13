import type { PassiveSkillId } from './passiveSkillDefinitions';
import type { PlayerSkillId } from './playerSkillDefinitions';

export type PlayerSkillEvolutionId =
  | 'star-piercing-lance'
  | 'thunder-barrier'
  | 'chain-storm-cloud';

export interface PlayerSkillEvolutionDefinition {
  id: PlayerSkillEvolutionId;
  skillId: PlayerSkillId;
  requiredPassiveId: PassiveSkillId;
  requiredPassiveLevel: number;
}

export const playerSkillEvolutionDefinitions: Record<
  PlayerSkillEvolutionId,
  PlayerSkillEvolutionDefinition
> = {
  'star-piercing-lance': {
    id: 'star-piercing-lance',
    skillId: 'lightning-bolt',
    requiredPassiveId: 'piercing-current',
    requiredPassiveLevel: 1,
  },
  'thunder-barrier': {
    id: 'thunder-barrier',
    skillId: 'magnetic-orbit',
    requiredPassiveId: 'shield-capacity',
    requiredPassiveLevel: 1,
  },
  'chain-storm-cloud': {
    id: 'chain-storm-cloud',
    skillId: 'ball-lightning',
    requiredPassiveId: 'rapid-casting',
    requiredPassiveLevel: 1,
  },
};

export function getSkillEvolutionForSkill(skillId: PlayerSkillId) {
  return Object.values(playerSkillEvolutionDefinitions).find(
    definition => definition.skillId === skillId,
  );
}
