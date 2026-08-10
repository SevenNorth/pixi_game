import Phaser from 'phaser';
import type { GameInputFrame } from '../../game/input/GameActions';

type InputKey =
  | 'up'
  | 'right'
  | 'down'
  | 'left'
  | 'w'
  | 'a'
  | 's'
  | 'd'
  | 'basicAttack'
  | 'skill1Primary'
  | 'skill1Secondary'
  | 'skill1Tertiary'
  | 'skill2Primary'
  | 'skill2Secondary'
  | 'skill2Tertiary'
  | 'skill3Primary'
  | 'skill3Secondary'
  | 'skill3Tertiary'
  | 'pause'
  | 'restart';

export class PhaserInputController {
  private readonly keys: Record<InputKey, Phaser.Input.Keyboard.Key>;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    const keyCodes = Phaser.Input.Keyboard.KeyCodes;
    this.keys = keyboard.addKeys({
      up: keyCodes.UP,
      right: keyCodes.RIGHT,
      down: keyCodes.DOWN,
      left: keyCodes.LEFT,
      w: keyCodes.W,
      a: keyCodes.A,
      s: keyCodes.S,
      d: keyCodes.D,
      basicAttack: keyCodes.SPACE,
      skill1Primary: keyCodes.Q,
      skill1Secondary: keyCodes.J,
      skill1Tertiary: keyCodes.ONE,
      skill2Primary: keyCodes.E,
      skill2Secondary: keyCodes.K,
      skill2Tertiary: keyCodes.TWO,
      skill3Primary: keyCodes.R,
      skill3Secondary: keyCodes.L,
      skill3Tertiary: keyCodes.THREE,
      pause: keyCodes.P,
      restart: keyCodes.R,
    }) as Record<InputKey, Phaser.Input.Keyboard.Key>;
  }

  readFrame(): GameInputFrame {
    const skill1Pressed = this.consumePress(
      this.keys.skill1Primary,
      this.keys.skill1Secondary,
      this.keys.skill1Tertiary,
    );
    const skill2Pressed = this.consumePress(
      this.keys.skill2Primary,
      this.keys.skill2Secondary,
      this.keys.skill2Tertiary,
    );
    const skill3Pressed = this.consumePress(
      this.keys.skill3Primary,
      this.keys.skill3Secondary,
      this.keys.skill3Tertiary,
    );

    return {
      horizontal: Number(this.keys.right.isDown || this.keys.d.isDown)
        - Number(this.keys.left.isDown || this.keys.a.isDown),
      vertical: Number(this.keys.down.isDown || this.keys.s.isDown)
        - Number(this.keys.up.isDown || this.keys.w.isDown),
      basicAttackHeld: this.keys.basicAttack.isDown,
      skillPressed: {
        'skill-1': skill1Pressed,
        'skill-2': skill2Pressed,
        'skill-3': skill3Pressed,
      },
      pausePressed: this.consumePress(this.keys.pause),
      restartPressed: this.consumePress(this.keys.restart),
    };
  }

  private consumePress(...keys: Phaser.Input.Keyboard.Key[]) {
    const pressed = keys.map(key => Phaser.Input.Keyboard.JustDown(key));
    return pressed.some(Boolean);
  }
}
