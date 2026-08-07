export interface MapProgressionState {
  level: number;
}

export class MapProgression {
  readonly state: MapProgressionState = { level: 1 };

  reset() {
    this.state.level = 1;
  }
}
