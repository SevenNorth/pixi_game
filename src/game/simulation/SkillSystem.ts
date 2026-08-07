export type SkillTargeting = 'direction' | 'nearest' | 'area' | 'dash';
export type SkillPhase = 'ready' | 'windup' | 'casting' | 'recovery' | 'cooldown';

export interface SkillDefinition {
  id: string;
  cooldownMs: number;
  windupMs: number;
  castMs: number;
  recoveryMs: number;
  range: number;
  damageMultiplier: number;
  fixedDamage: number;
  targeting: SkillTargeting;
}

export interface SkillRuntimeState {
  skillId: string;
  phase: SkillPhase;
  phaseStartedAt: number;
  phaseEndsAt: number;
  castSequence: number;
}

export interface SkillRuntimeEvent {
  type: 'phase-changed' | 'released' | 'ready';
  at: number;
  phase: SkillPhase;
}

export interface SkillActivationResult {
  accepted: boolean;
  events: SkillRuntimeEvent[];
}

export function createSkillRuntime(
  definition: SkillDefinition,
  now = 0,
): SkillRuntimeState {
  return {
    skillId: definition.id,
    phase: 'ready',
    phaseStartedAt: now,
    phaseEndsAt: now,
    castSequence: 0,
  };
}

export function requestSkillActivation(
  definition: SkillDefinition,
  state: SkillRuntimeState,
  now: number,
): SkillActivationResult {
  assertMatchingSkill(definition, state);
  const events = advanceSkillRuntime(definition, state, now);
  if (state.phase !== 'ready') return { accepted: false, events };

  state.castSequence += 1;
  enterPhase(definition, state, definition.windupMs > 0 ? 'windup' : 'casting', now, events);
  settleImmediatePhases(definition, state, now, events);
  return { accepted: true, events };
}

export function advanceSkillRuntime(
  definition: SkillDefinition,
  state: SkillRuntimeState,
  now: number,
) {
  assertMatchingSkill(definition, state);
  const events: SkillRuntimeEvent[] = [];
  while (state.phase !== 'ready' && now >= state.phaseEndsAt) {
    enterNextPhase(definition, state, state.phaseEndsAt, events);
  }
  return events;
}

export function getSkillTimeUntilReady(
  definition: SkillDefinition,
  state: SkillRuntimeState,
  now: number,
) {
  if (state.phase === 'ready') return 0;
  const remainingCurrentPhase = Math.max(0, state.phaseEndsAt - now);
  const remainingAfterCurrent: Record<Exclude<SkillPhase, 'ready'>, number> = {
    windup: getPhaseDuration(definition, 'casting')
      + getPhaseDuration(definition, 'recovery')
      + getPhaseDuration(definition, 'cooldown'),
    casting: getPhaseDuration(definition, 'recovery')
      + getPhaseDuration(definition, 'cooldown'),
    recovery: getPhaseDuration(definition, 'cooldown'),
    cooldown: 0,
  };
  return remainingCurrentPhase + remainingAfterCurrent[state.phase];
}

function settleImmediatePhases(
  definition: SkillDefinition,
  state: SkillRuntimeState,
  now: number,
  events: SkillRuntimeEvent[],
) {
  while (state.phase !== 'ready' && state.phaseEndsAt <= now) {
    enterNextPhase(definition, state, state.phaseEndsAt, events);
  }
}

function enterNextPhase(
  definition: SkillDefinition,
  state: SkillRuntimeState,
  at: number,
  events: SkillRuntimeEvent[],
) {
  const nextPhase: Record<Exclude<SkillPhase, 'ready'>, SkillPhase> = {
    windup: 'casting',
    casting: 'recovery',
    recovery: 'cooldown',
    cooldown: 'ready',
  };
  enterPhase(definition, state, nextPhase[state.phase as Exclude<SkillPhase, 'ready'>], at, events);
}

function enterPhase(
  definition: SkillDefinition,
  state: SkillRuntimeState,
  phase: SkillPhase,
  at: number,
  events: SkillRuntimeEvent[],
) {
  state.phase = phase;
  state.phaseStartedAt = at;
  state.phaseEndsAt = at + getPhaseDuration(definition, phase);
  events.push({ type: 'phase-changed', at, phase });
  if (phase === 'casting') events.push({ type: 'released', at, phase });
  if (phase === 'ready') events.push({ type: 'ready', at, phase });
}

function getPhaseDuration(definition: SkillDefinition, phase: SkillPhase) {
  const durations: Record<SkillPhase, number> = {
    ready: 0,
    windup: definition.windupMs,
    casting: definition.castMs,
    recovery: definition.recoveryMs,
    cooldown: definition.cooldownMs,
  };
  return Math.max(0, durations[phase]);
}

function assertMatchingSkill(definition: SkillDefinition, state: SkillRuntimeState) {
  if (definition.id !== state.skillId) {
    throw new Error(`Skill runtime ${state.skillId} cannot use definition ${definition.id}`);
  }
}
