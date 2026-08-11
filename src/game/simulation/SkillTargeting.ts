import type { SkillTargeting } from './SkillSystem';

export interface SkillPoint {
  x: number;
  y: number;
}

export interface SkillTargetCandidate extends SkillPoint {
  id: string;
  active: boolean;
}

export interface SkillTargetContext {
  origin: SkillPoint;
  facing: SkillPoint;
  movement: SkillPoint;
  range: number;
  candidates?: SkillTargetCandidate[];
}

export interface ResolvedSkillTarget {
  origin: SkillPoint;
  point: SkillPoint;
  direction: SkillPoint;
  targetId?: string;
}

export function resolveChainTargetIds(
  initialTargetId: string,
  candidates: readonly SkillTargetCandidate[],
  maxTargets: number,
  jumpRange: number,
) {
  const targetById = new Map(candidates.filter(candidate => candidate.active).map(target => [target.id, target]));
  const initialTarget = targetById.get(initialTargetId);
  if (!initialTarget) return [];
  const selected = [initialTarget];
  const selectedIds = new Set([initialTarget.id]);
  const jumpRangeSquared = Math.max(0, jumpRange) ** 2;

  while (selected.length < Math.max(1, Math.floor(maxTargets))) {
    const previous = selected[selected.length - 1];
    const next = Array.from(targetById.values())
      .filter(candidate => !selectedIds.has(candidate.id))
      .map(candidate => ({ candidate, distanceSquared: distanceSquared(previous, candidate) }))
      .filter(entry => entry.distanceSquared <= jumpRangeSquared)
      .sort((left, right) => left.distanceSquared - right.distanceSquared)[0]?.candidate;
    if (!next) break;
    selected.push(next);
    selectedIds.add(next.id);
  }
  return selected.map(target => target.id);
}

export function resolveSkillTarget(
  targeting: SkillTargeting,
  context: SkillTargetContext,
): ResolvedSkillTarget | null {
  if (targeting === 'nearest') return resolveNearestTarget(context);

  const direction = targeting === 'dash'
    ? normalizeOrFallback(context.movement, context.facing)
    : normalizeOrFallback(context.facing, { x: 0, y: 1 });
  const distance = targeting === 'area' ? 0 : Math.max(0, context.range);
  return {
    origin: { ...context.origin },
    point: {
      x: context.origin.x + direction.x * distance,
      y: context.origin.y + direction.y * distance,
    },
    direction,
  };
}

export function isPointWithinSegmentRadius(
  point: SkillPoint,
  start: SkillPoint,
  end: SkillPoint,
  radius: number,
) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection = segmentLengthSquared > 0
    ? ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY)
      / segmentLengthSquared
    : 0;
  const t = Math.max(0, Math.min(1, projection));
  const nearestX = start.x + segmentX * t;
  const nearestY = start.y + segmentY * t;
  return Math.hypot(point.x - nearestX, point.y - nearestY) <= Math.max(0, radius);
}

function resolveNearestTarget(context: SkillTargetContext): ResolvedSkillTarget | null {
  const rangeSquared = Math.max(0, context.range) ** 2;
  const nearest = (context.candidates ?? [])
    .filter(candidate => candidate.active)
    .map(candidate => ({
      candidate,
      distanceSquared: distanceSquared(context.origin, candidate),
    }))
    .filter(entry => entry.distanceSquared <= rangeSquared)
    .sort((left, right) => left.distanceSquared - right.distanceSquared)[0]?.candidate;
  if (!nearest) return null;

  return {
    origin: { ...context.origin },
    point: { x: nearest.x, y: nearest.y },
    direction: normalizeOrFallback(
      { x: nearest.x - context.origin.x, y: nearest.y - context.origin.y },
      context.facing,
    ),
    targetId: nearest.id,
  };
}

function normalizeOrFallback(vector: SkillPoint, fallback: SkillPoint): SkillPoint {
  const length = Math.hypot(vector.x, vector.y);
  if (length > 0) return { x: vector.x / length, y: vector.y / length };
  const fallbackLength = Math.hypot(fallback.x, fallback.y);
  if (fallbackLength > 0) {
    return { x: fallback.x / fallbackLength, y: fallback.y / fallbackLength };
  }
  return { x: 0, y: 1 };
}

function distanceSquared(left: SkillPoint, right: SkillPoint) {
  const x = right.x - left.x;
  const y = right.y - left.y;
  return x * x + y * y;
}
