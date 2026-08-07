export type CardinalDirection = 'up' | 'right' | 'down' | 'left';

export interface DirectionVector {
  x: number;
  y: number;
}

export interface PlayerDirectionState {
  movementVector: DirectionVector;
  facingVector: DirectionVector;
  animationDirection: CardinalDirection;
}

export function createPlayerDirectionState(): PlayerDirectionState {
  return {
    movementVector: { x: 0, y: 0 },
    facingVector: { x: 0, y: 1 },
    animationDirection: 'down',
  };
}

export function updatePlayerDirection(state: PlayerDirectionState, horizontal: number, vertical: number) {
  const length = Math.hypot(horizontal, vertical);
  if (length === 0) {
    state.movementVector.x = 0;
    state.movementVector.y = 0;
    return state;
  }

  const x = horizontal / length;
  const y = vertical / length;
  state.movementVector.x = x;
  state.movementVector.y = y;
  state.facingVector.x = x;
  state.facingVector.y = y;
  state.animationDirection = resolveCardinalDirection(x, y, state.animationDirection);
  return state;
}

export function resolveCardinalDirection(
  x: number,
  y: number,
  previous: CardinalDirection = 'down',
): CardinalDirection {
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const previousWasHorizontal = previous === 'left' || previous === 'right';
  const keepPreviousAxis = previousWasHorizontal
    ? absX >= absY * 0.8
    : absY >= absX * 0.8;

  if (keepPreviousAxis) {
    return previousWasHorizontal ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
  }
  return absX > absY ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
}

