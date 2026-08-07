export function attackForLevel(level: number) {
  return 1 + Math.floor(Math.max(0, level - 1) / 2);
}

