import Phaser from 'phaser';
import { getFoodRecovery } from '../../game/simulation/FoodRecovery';
import type { FoodKey } from '../../game/simulation/FoodRecovery';
import {
  applyMonsterDamage,
  createMonsterCombatState,
  MONSTER_MAX_CHASE_DISTANCE,
  MONSTER_PATROL_RADIUS,
  MONSTER_PATROL_REACH_DISTANCE,
  pauseMonsterPatrol,
  setMonsterPatrolTarget,
  updateMonsterAggro,
} from '../../game/simulation/MonsterCombat';
import type { MonsterCombatState } from '../../game/simulation/MonsterCombat';
import {
  createPlayerDirectionState,
  resolveCardinalDirection,
  updatePlayerDirection,
} from '../../game/simulation/PlayerMovement';
import type { CardinalDirection, PlayerDirectionState } from '../../game/simulation/PlayerMovement';
import { PlayerProgression } from '../../game/simulation/PlayerProgression';
import { attackForLevel } from '../../game/simulation/PlayerCombatStats';
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
  updateProgression,
  updateVitals,
} from '../ui/domHud';
import { playMonsterDefeat } from '../view/fx/playMonsterDefeat';
import { playMonsterHit } from '../view/fx/playMonsterHit';

const BULLET_LENGTH = 64;
const BULLET_THICKNESS = 20;
const BULLET_SPEED = 420;

interface MonsterSprite extends Phaser.Physics.Arcade.Sprite {
  monsterId: string;
  combat: MonsterCombatState;
  healthBar: Phaser.GameObjects.Graphics;
  animationDirection: CardinalDirection;
}

interface FoodSprite extends Phaser.Physics.Arcade.Image {
  foodId: string;
  foodKey: FoodKey;
  expiresAt: number;
}

interface BulletSprite extends Phaser.GameObjects.Zone {
  lightning: Phaser.GameObjects.Graphics;
  damage: number;
  directionX: number;
  directionY: number;
  remainingDistance: number;
  flickerElapsed: number;
  collisionEnabledAt: number;
  launched: boolean;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private monsters!: Phaser.Physics.Arcade.Group;
  private foods!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private space!: Phaser.Input.Keyboard.Key;
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
  private playerAttack = 1;
  private playerDirection: PlayerDirectionState = createPlayerDirectionState();
  private vitals = new PlayerVitals();
  private progression = new PlayerProgression();
  private damageTween?: Phaser.Tweens.Tween;

  constructor() {
    super('GameScene');
  }

  create() {
    this.ended = false;
    this.paused = false;
    this.killed = 0;
    this.gameplayTime = 0;
    this.lastShotAt = -Infinity;
    this.playerDirection = createPlayerDirectionState();
    this.vitals.reset();
    this.progression.reset();
    this.playerAttack = attackForLevel(this.progression.state.level);
    hideMenu();
    hideLevelUp();
    window.addEventListener('restart-game', this.restart, { once: true });
    showHud();
    updateHud(this.killed);
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

    this.physics.world.setBounds(-4000, -4000, 8000, 8000);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
    this.space = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.on('keydown-P', this.togglePause, this);
    this.input.keyboard!.on('keydown-R', this.restart, this);
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, this.syncBulletVisuals, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.player = this.physics.add.sprite(0, 0, 'player', 0);
    this.player.setDepth(2);
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
    this.events.off(Phaser.Scenes.Events.PRE_RENDER, this.syncBulletVisuals, this);
    window.removeEventListener('restart-game', this.restart);
  }

  update(_time: number, delta: number) {
    if (this.ended || this.paused) return;
    this.gameplayTime += Math.min(delta, 50);
    const speed = 180;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const horizontal = Number(this.cursors.right.isDown || this.wasd.D.isDown)
      - Number(this.cursors.left.isDown || this.wasd.A.isDown);
    const vertical = Number(this.cursors.down.isDown || this.wasd.S.isDown)
      - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    updatePlayerDirection(this.playerDirection, horizontal, vertical);
    body.setVelocity(
      this.playerDirection.movementVector.x * speed,
      this.playerDirection.movementVector.y * speed,
    );
    if (horizontal !== 0 || vertical !== 0) {
      this.playDirectionalAnimation(this.player, 'player', this.playerDirection.animationDirection);
    } else if (this.player.anims.isPlaying && !this.player.anims.isPaused) {
      this.player.anims.pause();
    }
    if (this.space.isDown) this.handleShoot();
    this.monsters.children.each(child => {
      const monster = child as MonsterSprite;
      if (monster.getData('defeated')) return null;
      const monsterBody = monster.body as Phaser.Physics.Arcade.Body;
      const playerDistance = Phaser.Math.Distance.Between(monster.x, monster.y, this.player.x, this.player.y);
      const homeDistance = Phaser.Math.Distance.Between(
        monster.x,
        monster.y,
        monster.combat.homeX,
        monster.combat.homeY,
      );
      const aggro = updateMonsterAggro(monster.combat, playerDistance, homeDistance);
      if (aggro === 'chasing') {
        this.moveMonsterToward(monster, this.player.x, this.player.y, monster.combat.speed);
      } else if (aggro === 'returning') {
        if (homeDistance <= MONSTER_PATROL_REACH_DISTANCE) {
          monster.combat.aggro = 'idle';
          pauseMonsterPatrol(
            monster.combat,
            this.gameplayTime + Phaser.Math.FloatBetween(250, 500),
          );
          monsterBody.setVelocity(0, 0);
        } else {
          this.moveMonsterToward(monster, monster.combat.homeX, monster.combat.homeY, monster.combat.speed);
        }
      } else if (homeDistance > MONSTER_PATROL_RADIUS * 1.25) {
        setMonsterPatrolTarget(monster.combat, monster.combat.homeX, monster.combat.homeY, 0);
        this.moveMonsterToward(monster, monster.combat.homeX, monster.combat.homeY, monster.combat.speed);
      } else if (this.gameplayTime < monster.combat.patrolPauseUntil) {
        monsterBody.setVelocity(0, 0);
      } else {
        if (!monster.combat.patrolTargetActive) {
          const patrolAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const patrolDistance = Phaser.Math.FloatBetween(60, MONSTER_PATROL_RADIUS);
          setMonsterPatrolTarget(
            monster.combat,
            monster.combat.homeX + Math.cos(patrolAngle) * patrolDistance,
            monster.combat.homeY + Math.sin(patrolAngle) * patrolDistance,
            this.gameplayTime,
          );
        }
        const patrolDistance = Phaser.Math.Distance.Between(
          monster.x,
          monster.y,
          monster.combat.patrolTargetX,
          monster.combat.patrolTargetY,
        );
        if (patrolDistance <= MONSTER_PATROL_REACH_DISTANCE) {
          pauseMonsterPatrol(
            monster.combat,
            this.gameplayTime + Phaser.Math.FloatBetween(300, 700),
          );
          monsterBody.setVelocity(0, 0);
        } else {
          this.moveMonsterToward(
            monster,
            monster.combat.patrolTargetX,
            monster.combat.patrolTargetY,
            monster.combat.speed * 0.55,
          );
        }
      }
      if (monsterBody.velocity.lengthSq() > 0) {
        monster.animationDirection = resolveCardinalDirection(
          monsterBody.velocity.x,
          monsterBody.velocity.y,
          monster.animationDirection,
        );
        this.playDirectionalAnimation(monster, 'monster', monster.animationDirection);
      } else if (monster.anims.isPlaying && !monster.anims.isPaused) {
        monster.anims.pause();
      }
      this.updateMonsterHealthBar(monster);
      return null;
    });

    this.bullets.children.each(child => {
      const bullet = child as BulletSprite;
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      if (!bullet.launched && this.gameplayTime >= bullet.collisionEnabledAt) {
        body.setVelocity(bullet.directionX * BULLET_SPEED, bullet.directionY * BULLET_SPEED);
        bullet.launched = true;
      }
      if (bullet.launched) bullet.remainingDistance -= Math.min(delta, 50) * (BULLET_SPEED / 1000);
      bullet.flickerElapsed += delta;
      if (bullet.flickerElapsed >= 70) {
        bullet.flickerElapsed = 0;
        this.drawLightning(bullet.lightning, bullet.directionX, bullet.directionY);
      }
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
      this.gameplayTime - this.lastShotAt < 500
    ) return;
    this.lastShotAt = this.gameplayTime;
    this.shoot();
  }

  private shoot() {
    const direction = this.playerDirection.facingVector;
    const bodyWidth = Math.abs(direction.x) * BULLET_LENGTH + BULLET_THICKNESS;
    const bodyHeight = Math.abs(direction.y) * BULLET_LENGTH + BULLET_THICKNESS;
    const lightning = this.add.graphics();
    const bullet = this.add.zone(
      this.player.x + direction.x * (24 + BULLET_LENGTH / 2),
      this.player.y + direction.y * (24 + BULLET_LENGTH / 2),
      bodyWidth,
      bodyHeight,
    ) as BulletSprite;
    this.physics.add.existing(bullet);
    this.bullets.add(bullet);
    bullet.lightning = lightning;
    lightning.setPosition(bullet.x, bullet.y).setDepth(1);
    bullet.once(Phaser.GameObjects.Events.DESTROY, () => lightning.destroy());
    bullet.damage = this.playerAttack;
    bullet.directionX = direction.x;
    bullet.directionY = direction.y;
    bullet.remainingDistance = 500;
    bullet.flickerElapsed = 0;
    bullet.collisionEnabledAt = this.gameplayTime + 50;
    bullet.launched = false;
    bullet.setData('bulletId', this.bulletId++);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(bodyWidth, bodyHeight);
    body.setOffset(0, 0);
    this.drawLightning(lightning, direction.x, direction.y);
    body.setVelocity(0, 0);
  }

  private syncBulletVisuals() {
    this.bullets.children.each(child => {
      const bullet = child as BulletSprite;
      bullet.lightning.setPosition(bullet.x, bullet.y);
      return null;
    });
  }

  private drawLightning(
    graphics: Phaser.GameObjects.Graphics,
    directionX: number,
    directionY: number,
  ) {
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    const points: Phaser.Math.Vector2[] = [
      new Phaser.Math.Vector2(
        -directionX * BULLET_LENGTH / 2,
        -directionY * BULLET_LENGTH / 2,
      ),
    ];
    const segments = 6;
    for (let index = 1; index < segments; index += 1) {
      const distance = -BULLET_LENGTH / 2 + (BULLET_LENGTH / segments) * index;
      const jitter = Phaser.Math.Between(-7, 7);
      points.push(new Phaser.Math.Vector2(
        directionX * distance + perpendicularX * jitter,
        directionY * distance + perpendicularY * jitter,
      ));
    }
    points.push(new Phaser.Math.Vector2(
      directionX * BULLET_LENGTH / 2,
      directionY * BULLET_LENGTH / 2,
    ));
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
    monster.combat = createMonsterCombatState(1, point.x, point.y);
    monster.animationDirection = 'down';
    monster.healthBar = this.add.graphics().setDepth(4);
    monster.healthBar.setVisible(false);
    monster.setData('monsterId', monster.monsterId);
    monster.setSize(34, 48).setOffset(7, 8);
    monster.play('monster-down');
    this.monsters.add(monster);
  }

  private spawnFood() {
    if (this.ended) return;
    const index = Phaser.Math.Between(0, foodKeys.length - 1);
    const point = this.getSpawnPoint(250);
    const food = this.physics.add.image(point.x, point.y, foodKeys[index]) as FoodSprite;
    food.foodId = `food-${this.foodId++}`;
    food.foodKey = foodKeys[index];
    food.expiresAt = this.time.now + 9000;
    this.foods.add(food);
  }

  private getSpawnPoint(distance: number) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    return { x: this.player.x + Math.cos(angle) * distance, y: this.player.y + Math.sin(angle) * distance };
  }

  private moveMonsterToward(monster: MonsterSprite, targetX: number, targetY: number, speed: number) {
    const angle = Phaser.Math.Angle.Between(monster.x, monster.y, targetX, targetY);
    const body = monster.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private playDirectionalAnimation(
    sprite: Phaser.Physics.Arcade.Sprite,
    prefix: 'player' | 'monster',
    direction: CardinalDirection,
  ) {
    const key = `${prefix}-${direction}`;
    if (sprite.anims.currentAnim?.key !== key || sprite.anims.isPaused) {
      sprite.play(key, true);
    }
  }

  private onBulletHit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (bulletObject, monsterObject) => {
    const bullet = bulletObject as unknown as BulletSprite;
    const monster = monsterObject as unknown as MonsterSprite;
    if (monster.getData('defeated') || this.gameplayTime < bullet.collisionEnabledAt) return;
    bullet.destroy();
    const damageResult = applyMonsterDamage(monster.combat, bullet.damage);
    monster.healthBar.setVisible(!damageResult.defeated);
    this.updateMonsterHealthBar(monster);
    if (!damageResult.defeated) {
      playMonsterHit(this, monster);
      return;
    }
    monster.setData('defeated', true);
    monster.healthBar.destroy();
    playMonsterDefeat(this, monster);
    this.killed += 1;
    const experienceResult = this.progression.gainExperience(monster.combat.experience);
    updateHud(this.killed);
    updateProgression(
      this.progression.state.level,
      this.progression.state.experience,
      this.progression.state.experienceToNext,
    );
    if (experienceResult.levelUps > 0) this.handleLevelUp(experienceResult.levelUps);
  };

  private handleLevelUp(levelUps: number) {
    this.vitals.increaseMaxHp(levelUps, levelUps);
    this.playerAttack = attackForLevel(this.progression.state.level);
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
    if (this.vitals.state.hp >= this.vitals.state.maxHp) return;
    food.destroy();
    this.vitals.restoreHp(getFoodRecovery(food.foodKey));
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    updateHud(this.killed);
    void playerObject;
  };

  private onMonsterCatch: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_playerObject, monsterObject) => {
    const monster = monsterObject as unknown as MonsterSprite;
    const result = this.vitals.takeDamage(monster.combat.attack, this.gameplayTime);
    if (!result.applied) return;

    monster.healthBar.destroy();
    monster.destroy();
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

  private updateMonsterHealthBar(monster: MonsterSprite) {
    if (!monster.healthBar.visible || !monster.active) return;
    const width = 36;
    const height = 4;
    const ratio = Phaser.Math.Clamp(monster.combat.hp / monster.combat.maxHp, 0, 1);
    monster.healthBar.clear();
    monster.healthBar.fillStyle(0x15252d, 0.9);
    monster.healthBar.fillRect(monster.x - width / 2, monster.y - 36, width, height);
    monster.healthBar.fillStyle(0xff5b68, 1);
    monster.healthBar.fillRect(monster.x - width / 2, monster.y - 36, width * ratio, height);
  }

  private endGame() {
    if (this.ended) return;
    this.ended = true;
    this.damageTween?.stop();
    this.player.setAlpha(1);
    this.physics.pause();
    this.monsterTimer?.remove(false);
    this.foodTimer?.remove(false);
    showMenu(t('gameOver', { killed: this.killed }), false, true);
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
