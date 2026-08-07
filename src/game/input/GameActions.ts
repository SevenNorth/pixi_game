export type SkillAction = 'skill-1' | 'skill-2' | 'skill-3';

export interface GameInputFrame {
  horizontal: number;
  vertical: number;
  basicAttackHeld: boolean;
  skillPressed: Record<SkillAction, boolean>;
  pausePressed: boolean;
  restartPressed: boolean;
}
