export interface PostMaxProgressionState {
  kills: number;
  killsToNext: number;
  rewardsEarned: number;
}

export interface PostMaxKillResult {
  killsAdded: number;
  rewardsEarned: number;
}

const START_KILLS_TO_NEXT = 12;
const KILLS_TO_NEXT_INCREASE = 4;

export class PostMaxProgression {
  readonly state: PostMaxProgressionState = {
    kills: 0,
    killsToNext: START_KILLS_TO_NEXT,
    rewardsEarned: 0,
  };

  reset() {
    this.state.kills = 0;
    this.state.killsToNext = START_KILLS_TO_NEXT;
    this.state.rewardsEarned = 0;
  }

  recordKills(count = 1): PostMaxKillResult {
    const killsAdded = Math.max(0, Math.floor(count));
    this.state.kills += killsAdded;
    let rewardsEarned = 0;
    while (this.state.kills >= this.state.killsToNext) {
      this.state.kills -= this.state.killsToNext;
      this.state.rewardsEarned += 1;
      rewardsEarned += 1;
      this.state.killsToNext += KILLS_TO_NEXT_INCREASE;
    }
    return { killsAdded, rewardsEarned };
  }
}
