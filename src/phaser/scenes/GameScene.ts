import Phaser from 'phaser';
import { FoodEffectSystem } from '../../game/simulation/FoodEffectSystem';
import type { FoodKey } from '../../game/simulation/FoodEffectSystem';
import { PlayerProgression } from '../../game/simulation/PlayerProgression';
import { PlayerVitals } from '../../game/simulation/PlayerVitals';
import { t } from '../../i18n';
import { assets, foodKeys } from '../assets/manifest';
import {
  hideLevelUp,
  hideMenu,
  showHud,
  showLevelUp,
  showMenu,
  updateHud,
  updateEffects,
  updateProgression,
  updateVitals,
} from '../ui/domHud';
import { playMonsterDefeat } from '../view/fx/playMonsterDefeat';

type Direction = 'up' | 'right' | 'down' | 'left';

interface MonsterSprite extends Phaser.Physics.Arcade.Sprite {
  monsterId: string;
}

interface FoodSprite extends Phaser.Physics.Arcade.Image {
  foodId: string;
  foodKey: FoodKey;
  value: number;
  expiresAt: number;
}

interface BulletSprite extends Phaser.GameObjects.Container {
  lightning: Phaser.GameObjects.Graphics;
  directionX: number;
  directionY: number;
  remainingDistance: number;
  flickerElapsed: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private monsters!: Phaser.Physics.Arcade.Group;
  private foods!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private space!: Phaser.Input.Keyboard.Key;
  private score = 0;
  private killed = 0;
  private monsterTimer?: Phaser.Time.TimerEvent;
  private foodTimer?: Phaser.Time.TimerEvent;
  private bulletId = 0;
  private monsterId = 0;
  private foodId = 0;
  private ended = false;
  private paused = false;
  private lastShotAt = -Infinity;
  private gameplayTime = 0;
  private vitals = new PlayerVitals();
  private progression = new PlayerProgression();
  private effects = new FoodEffectSystem();
  private damageTween?: Phaser.Tweens.Tween;

  constructor() {
    super('GameScene');
  }

  create() {
    this.ended = false;
    this.paused = false;
    this.score = 0;
    this.killed = 0;
    this.gameplayTime = 0;
    this.lastShotAt = -Infinity;
    this.vitals.reset();
    this.progression.reset();
    this.effects.reset();
    hideMenu();
    hideLevelUp();
    window.addEventListener('restart-game', this.restart, { once: true });
    showHud();
    updateHud(this.score, this.killed);
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    updateProgression(
      this.progression.state.level,
      this.progression.state.experience,
      this.progression.state.experienceToNext,
    );
    updateEffects([]);

    this.physics.world.setBounds(-4000, -4000, 8000, 8000);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
    this.space = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.space.on('down', this.handleShoot, this);
    this.input.keyboard!.on('keydown-P', this.togglePause, this);
    this.input.keyboard!.on('keydown-R', this.restart, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.player = this.physics.add.sprite(0, 0, 'player', 0);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(34, 40).setOffset(7, 6);
    this.player.play('player-down');

    this.monsters = this.physics.add.group();
    this.foods = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.cameras.main.setBounds(-4000, -4000, 8000, 8000);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.physics.add.overlap(this.bullets, this.monsters, this.onBulletHit, undefined, this);
    this.physics.add.overlap(this.player, this.foods, this.onFoodEat, undefined, this);
    this.physics.add.overlap(this.player, this.monsters, this.onMonsterCatch, undefined, this);

    this.spawnMonster();
    this.monsterTimer = this.time.addEvent({ delay: 3000, loop: true, callback: this.spawnMonster, callbackScope: this });
    this.foodTimer = this.time.addEvent({ delay: 5000, loop: true, callback: this.spawnFood, callbackScope: this });
  }

  shutdown() {
    this.input.keyboard?.off('keydown-P', this.togglePause, this);
    this.input.keyboard?.off('keydown-R', this.restart, this);
    this.space?.off('down', this.handleShoot, this);
    window.removeEventListener('restart-game', this.restart);
  }

  update(_time: number, delta: number) {
    if (this.ended || this.paused) return;
    this.gameplayTime += Math.min(delta, 50);
    this.effects.update(this.gameplayTime);
    updateEffects(this.effects.getActive(this.gameplayTime));
    const speed = this.effects.getMoveSpeed(180);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    let direction: Direction | undefined;
    if (this.cursors.left.isDown || this.wasd.A.isDown) direction = 'left';
    else if (this.cursors.right.isDown || this.wasd.D.isDown) direction = 'right';
    else if (this.cursors.up.isDown || this.wasd.W.isDown) direction = 'up';
    else if (this.cursors.down.isDown || this.wasd.S.isDown) direction = 'down';
    if (direction) {
      this.player.play(`player-${direction}`, true);
      if (direction === 'left') body.setVelocityX(-speed);
      if (direction === 'right') body.setVelocityX(speed);
      if (direction === 'up') body.setVelocityY(-speed);
      if (direction === 'down') body.setVelocityY(speed);
      this.player.setData('face', direction);
    }
    this.monsters.children.each(child => {
      const monster = child as MonsterSprite;
      if (monster.getData('defeated')) return null;
      const angle = Phaser.Math.Angle.Between(monster.x, monster.y, this.player.x, this.player.y);
      const monsterBody = monster.body as Phaser.Physics.Arcade.Body;
      monsterBody.setVelocity(Math.cos(angle) * 98, Math.sin(angle) * 98);
      const face = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? (Math.cos(angle) < 0 ? 'left' : 'right') : (Math.sin(angle) < 0 ? 'up' : 'down');
      monster.play(`monster-${face}`, true);
      return null;
    });

    this.bullets.children.each(child => {
      const bullet = child as BulletSprite;
      const distance = Math.min(delta, 50) * 0.42;
      bullet.x += bullet.directionX * distance;
      bullet.y += bullet.directionY * distance;
      bullet.remainingDistance -= distance;
      bullet.flickerElapsed += delta;
      if (bullet.flickerElapsed >= 70) {
        bullet.flickerElapsed = 0;
        this.drawLightning(bullet.lightning);
      }
      (bullet.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
      if (bullet.remainingDistance <= 0) bullet.destroy();
      return null;
    });
    this.foods.children.each(child => {
      const food = child as FoodSprite;
      if (this.time.now > food.expiresAt) food.destroy();
      return null;
    });
  }

  private handleShoot() {
    if (
      this.ended ||
      this.paused ||
      this.time.now - this.lastShotAt < this.effects.getAttackCooldown(500)
    ) return;
    this.lastShotAt = this.time.now;
    this.shoot();
  }

  private shoot() {
    const face = (this.player.getData('face') as Direction | undefined) ?? 'down';
    const direction = {
      up: { x: 0, y: -1, angle: -Math.PI / 2 },
      right: { x: 1, y: 0, angle: 0 },
      down: { x: 0, y: 1, angle: Math.PI / 2 },
      left: { x: -1, y: 0, angle: Math.PI },
    }[face];
    const lightning = this.add.graphics();
    const bullet = this.add.container(
      this.player.x + direction.x * 72,
      this.player.y + direction.y * 72,
      lightning,
    ) as BulletSprite;
    this.physics.add.existing(bullet);
    this.bullets.add(bullet);
    bullet.lightning = lightning;
    bullet.directionX = direction.x;
    bullet.directionY = direction.y;
    bullet.remainingDistance = 500;
    bullet.flickerElapsed = 0;
    bullet.setData('bulletId', this.bulletId++);
    bullet.setDepth(2);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(direction.x === 0 ? 20 : 96, direction.y === 0 ? 20 : 96);
    body.setOffset(direction.x === 0 ? -10 : -48, direction.y === 0 ? -10 : -48);
    this.drawLightning(lightning);
    bullet.setAngle(Phaser.Math.RadToDeg(direction.angle));
    body.setVelocity(0, 0);
  }

  private drawLightning(graphics: Phaser.GameObjects.Graphics) {
    const points: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(-48, 0)];
    const segments = 7;
    for (let index = 1; index < segments; index += 1) {
      points.push(new Phaser.Math.Vector2(-48 + (96 / segments) * index, Phaser.Math.Between(-8, 8)));
    }
    points.push(new Phaser.Math.Vector2(48, 0));
    graphics.clear();
    this.strokeLightning(graphics, points, 7, 0x1677ff, 0.42);
    this.strokeLightning(graphics, points, 4, 0x4ebcff, 0.9);
    this.strokeLightning(graphics, points, 2, 0xf4ffff, 1);
  }

  private strokeLightning(
    graphics: Phaser.GameObjects.Graphics,
    points: Phaser.Math.Vector2[],
    width: number,
    color: number,
    alpha: number,
  ) {
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineTo(points[index].x, points[index].y);
    }
    graphics.strokePath();
  }

  private spawnMonster() {
    if (this.ended) return;
    const point = this.getSpawnPoint(450);
    const monster = this.physics.add.sprite(point.x, point.y, 'monster', 0) as unknown as MonsterSprite;
    monster.monsterId = `monster-${this.monsterId++}`;
    monster.setData('monsterId', monster.monsterId);
    monster.setSize(34, 48).setOffset(7, 8);
    monster.play('monster-down');
    this.monsters.add(monster);
  }

  private spawnFood() {
    if (this.ended) return;
    const index = Phaser.Math.Between(0, foodKeys.length - 1);
    const value = index + 1;
    const point = this.getSpawnPoint(250);
    const food = this.physics.add.image(point.x, point.y, foodKeys[index]) as FoodSprite;
    food.foodId = `food-${this.foodId++}`;
    food.foodKey = foodKeys[index];
    food.value = value;
    food.expiresAt = this.time.now + (10 - value) * 1000;
    this.foods.add(food);
  }

  private getSpawnPoint(distance: number) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    return { x: this.player.x + Math.cos(angle) * distance, y: this.player.y + Math.sin(angle) * distance };
  }

  private onBulletHit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (bulletObject, monsterObject) => {
    const bullet = bulletObject as unknown as BulletSprite;
    const monster = monsterObject as unknown as MonsterSprite;
    if (monster.getData('defeated')) return;
    monster.setData('defeated', true);
    bullet.destroy();
    playMonsterDefeat(this, monster);
    this.killed += 1;
    const experienceResult = this.progression.gainExperience(this.effects.getExperienceGain(1));
    updateHud(this.score, this.killed);
    updateProgression(
      this.progression.state.level,
      this.progression.state.experience,
      this.progression.state.experienceToNext,
    );
    if (experienceResult.levelUps > 0) this.handleLevelUp(experienceResult.levelUps);
  };

  private handleLevelUp(levelUps: number) {
    this.vitals.increaseMaxHp(levelUps, levelUps);
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    showLevelUp(this.progression.state.level, levelUps);
  };

  private onFoodEat: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (playerObject, foodObject) => {
    const food = foodObject as unknown as FoodSprite;
    food.destroy();
    const result = this.effects.consume(food.foodKey, this.gameplayTime);
    this.vitals.restoreHp(result.restoreHp);
    this.vitals.restoreShield(result.restoreShield);
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    updateEffects(this.effects.getActive(this.gameplayTime));
    this.score += food.value;
    updateHud(this.score, this.killed);
    void playerObject;
  };

  private onMonsterCatch: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_playerObject, monsterObject) => {
    const result = this.vitals.takeDamage(1, this.gameplayTime);
    if (!result.applied) return;

    (monsterObject as unknown as Phaser.GameObjects.GameObject).destroy();
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    this.playDamageFeedback();
    if (result.defeated) this.endGame();
  };

  private playDamageFeedback() {
    this.damageTween?.stop();
    this.player.setAlpha(1);
    this.cameras.main.shake(120, 0.006);
    this.damageTween = this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 90,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.player.setAlpha(1),
    });
  }

  private endGame() {
    if (this.ended) return;
    this.ended = true;
    this.damageTween?.stop();
    this.player.setAlpha(1);
    this.physics.pause();
    this.monsterTimer?.remove(false);
    this.foodTimer?.remove(false);
    showMenu(t('gameOver', { score: this.score, killed: this.killed }), false, true);
  }

  private restart = () => {
    if (!this.ended) return;
    this.scene.restart();
  };

  private togglePause() {
    if (this.ended) return;
    this.setGamePaused(!this.paused);
  }

  private setGamePaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.physics.pause();
      if (this.monsterTimer) this.monsterTimer.paused = true;
      if (this.foodTimer) this.foodTimer.paused = true;
      this.tweens.pauseAll();
      this.anims.pauseAll();
    } else {
      this.physics.resume();
      if (this.monsterTimer) this.monsterTimer.paused = false;
      if (this.foodTimer) this.foodTimer.paused = false;
      this.tweens.resumeAll();
      this.anims.resumeAll();
    }
  }
}
