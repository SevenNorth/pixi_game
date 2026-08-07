export const WORLD_CHUNK_SIZE = 640;
export const WORLD_ACTIVE_RADIUS = 1;
const SPAWN_CLEARANCE_RADIUS = 150;

export type WorldObstacleKind = 'wall' | 'bush';

export interface WorldObstacleState {
  id: string;
  formationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  kind: WorldObstacleKind;
}

export interface WorldChunkState {
  id: string;
  chunkX: number;
  chunkY: number;
  obstacles: WorldObstacleState[];
}

export interface WorldChunkDelta {
  entered: WorldChunkState[];
  exited: WorldChunkState[];
  discovered: WorldChunkState[];
}

export class InfiniteWorldSystem {
  private activeChunks = new Map<string, WorldChunkState>();
  private discoveredChunkIds = new Set<string>();

  reset() {
    this.activeChunks.clear();
    this.discoveredChunkIds.clear();
  }

  syncAround(worldX: number, worldY: number): WorldChunkDelta {
    const centerX = Math.floor(worldX / WORLD_CHUNK_SIZE);
    const centerY = Math.floor(worldY / WORLD_CHUNK_SIZE);
    const desiredIds = new Set<string>();
    const entered: WorldChunkState[] = [];
    const discovered: WorldChunkState[] = [];

    for (let offsetY = -WORLD_ACTIVE_RADIUS; offsetY <= WORLD_ACTIVE_RADIUS; offsetY += 1) {
      for (let offsetX = -WORLD_ACTIVE_RADIUS; offsetX <= WORLD_ACTIVE_RADIUS; offsetX += 1) {
        const chunk = this.getChunk(centerX + offsetX, centerY + offsetY);
        desiredIds.add(chunk.id);
        if (!this.activeChunks.has(chunk.id)) {
          this.activeChunks.set(chunk.id, chunk);
          entered.push(chunk);
        }
        if (!this.discoveredChunkIds.has(chunk.id)) {
          this.discoveredChunkIds.add(chunk.id);
          discovered.push(chunk);
        }
      }
    }

    const exited: WorldChunkState[] = [];
    this.activeChunks.forEach((chunk, id) => {
      if (desiredIds.has(id)) return;
      this.activeChunks.delete(id);
      exited.push(chunk);
    });
    return { entered, exited, discovered };
  }

  getDiscoveredChunkCount() {
    return this.discoveredChunkIds.size;
  }

  private getChunk(chunkX: number, chunkY: number): WorldChunkState {
    const id = `${chunkX}:${chunkY}`;
    const random = createSeededRandom(hashChunk(chunkX, chunkY));
    const obstacles: WorldObstacleState[] = [];
    const originX = chunkX * WORLD_CHUNK_SIZE;
    const originY = chunkY * WORLD_CHUNK_SIZE;
    const quadrantCenters = [
      { x: 130, y: 130 },
      { x: 510, y: 130 },
      { x: 130, y: 510 },
      { x: 510, y: 510 },
    ];
    const densityRoll = random();
    const formationCount = densityRoll < 0.25 ? 0 : densityRoll < 0.8 ? 1 : 2;
    const availableQuadrants = [...quadrantCenters];

    for (let formationIndex = 0; formationIndex < formationCount; formationIndex += 1) {
      const quadrantIndex = Math.floor(random() * availableQuadrants.length);
      const center = availableQuadrants.splice(quadrantIndex, 1)[0];
      const kind: WorldObstacleKind = random() < 0.5 ? 'wall' : 'bush';
      const horizontal = random() < 0.5;
      const segmentCount = 3 + Math.floor(random() * 2);
      const spacing = 48;
      const span = (segmentCount - 1) * spacing;
      const centerX = originX + center.x + (random() - 0.5) * 34;
      const centerY = originY + center.y + (random() - 0.5) * 34;
      const formationId = `formation-${id}-${formationIndex}`;

      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const offset = -span / 2 + segmentIndex * spacing;
        const x = centerX + (horizontal ? offset : 0);
        const y = centerY + (horizontal ? 0 : offset);
        if (Math.hypot(x, y) < SPAWN_CLEARANCE_RADIUS) continue;
        obstacles.push({
          id: `obstacle-${id}-${formationIndex}-${segmentIndex}`,
          formationId,
          x,
          y,
          width: kind === 'wall' ? 54 : 58,
          height: kind === 'wall' ? 54 : 58,
          rotation: 0,
          kind,
        });
      }
    }
    return { id, chunkX, chunkY, obstacles };
  }
}

function hashChunk(chunkX: number, chunkY: number) {
  let value = Math.imul(chunkX, 374761393) ^ Math.imul(chunkY, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

function createSeededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
