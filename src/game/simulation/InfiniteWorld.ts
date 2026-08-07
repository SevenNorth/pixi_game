export const WORLD_CHUNK_SIZE = 640;
export const WORLD_ACTIVE_RADIUS = 1;
const OBSTACLE_COUNT_MIN = 3;
const OBSTACLE_COUNT_MAX = 6;
const SPAWN_CLEARANCE_RADIUS = 150;

export interface WorldObstacleState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
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
    const count = OBSTACLE_COUNT_MIN + Math.floor(random() * (OBSTACLE_COUNT_MAX - OBSTACLE_COUNT_MIN + 1));
    const originX = chunkX * WORLD_CHUNK_SIZE;
    const originY = chunkY * WORLD_CHUNK_SIZE;

    for (let index = 0; index < count; index += 1) {
      const width = 48 + Math.floor(random() * 56);
      const height = 40 + Math.floor(random() * 48);
      const x = originX + 64 + random() * (WORLD_CHUNK_SIZE - 128);
      const y = originY + 64 + random() * (WORLD_CHUNK_SIZE - 128);
      if (Math.hypot(x, y) < SPAWN_CLEARANCE_RADIUS) continue;
      const localX = x - originX;
      const localY = y - originY;
      if (
        Math.abs(localX - WORLD_CHUNK_SIZE / 2) < 86 ||
        Math.abs(localY - WORLD_CHUNK_SIZE / 2) < 86
      ) continue;
      obstacles.push({
        id: `obstacle-${id}-${index}`,
        x,
        y,
        width,
        height,
        rotation: (random() - 0.5) * 0.24,
      });
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
