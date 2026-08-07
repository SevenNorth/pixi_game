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
import {
  canProjectileHit,
  createProjectileState,
  isProjectileCollisionEnabled,
} from '../../game/simulation/ProjectileSystem';
import { t } from '../../i18n';
import { assets, foodKeys } from '../assets/manifest';
import { PhaserInputController } from '../input/PhaserInputController';
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
import {
  createProjectileView,
  PROJECTILE_VISUAL_LENGTH,
  syncProjectileVisual,
  updateProjectileView,
} from '../view/projectiles/ProjectileView';
import type { ProjectileView } from '../view/projectiles/ProjectileView';

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

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private monsters!: Phaser.Physics.Arcade.Group;
  private foods!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private inputController!: PhaserInputController;
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
    this.inputController = new PhaserInputController(this.input.keyboard!);
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, this.syncBulletVisuals, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.player = this.physics.add.sprite(0, 0, 'player', 0);
    this.player.setDepth(2);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(34, 40).setOffset(7, 6);
    this.player.play('player-down');

    this.monsters = this.physics.add.group();
    this.foods = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.cameras.main.setBounds(-4000, -4000, 8000, 8000);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.physics.add.overlap(this.projectiles, this.monsters, this.onProjectileHitMonster, undefined, this);
    this.physics.add.overlap(this.projectiles, this.player, this.onProjectileHitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.foods, this.onFoodEat, undefined, this);
    this.physics.add.overlap(this.player, this.monsters, this.onMonsterCatch, undefined, this);

    this.spawnMonster();
    this.monsterTimer = this.time.addEvent({ delay: 3000, loop: true, callback: this.spawnMonster, callbackScope: this });
    this.foodTimer = this.time.addEvent({ delay: 5000, loop: true, callback: this.spawnFood, callbackScope: this });
  }

  shutdown() {
    this.events.off(Phaser.Scenes.Events.PRE_RENDER, this.syncBulletVisuals, this);
    window.removeEventListener('restart-game', this.restart);
  }

  update(_time: number, delta: number) {
    const inputFrame = this.inputController.readFrame();
    if (inputFrame.pausePressed && !this.ended) this.togglePause();
    if (inputFrame.restartPressed) this.restart();
    if (this.ended || this.paused) return;
    this.gameplayTime += Math.min(delta, 50);
    const speed = 180;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const { horizontal, vertical } = inputFrame;
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
    if (inputFrame.basicAttackHeld) this.handleShoot();
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

    this.projectiles.children.each(child => {
      const projectileView = child as ProjectileView;
      if (!updateProjectileView(projectileView, this.gameplayTime, delta)) projectileView.destroy();
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
    const projectile = createProjectileState({
      id: `projectile-${this.bulletId++}`,
      ownerId: 'player',
      faction: 'player',
      damage: this.playerAttack,
      velocityX: direction.x * BULLET_SPEED,
      velocityY: direction.y * BULLET_SPEED,
      remainingDistance: 500,
      collisionEnabledAt: this.gameplayTime + 50,
    });
    this.spawnProjectile(
      projectile,
      this.player.x + direction.x * (24 + PROJECTILE_VISUAL_LENGTH / 2),
      this.player.y + direction.y * (24 + PROJECTILE_VISUAL_LENGTH / 2),
    );
  }

  private spawnProjectile(projectile: ReturnType<typeof createProjectileState>, x: number, y: number) {
    return createProjectileView(this, this.projectiles, projectile, x, y);
  }

  private syncBulletVisuals() {
    this.projectiles.children.each(child => {
      const projectileView = child as ProjectileView;
      syncProjectileVisual(projectileView);
      return null;
    });
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

  private onProjectileHitMonster: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    firstObject,
    secondObject,
  ) => {
    const projectileView = this.resolveProjectileView(firstObject, secondObject);
    const monster = this.resolveMonsterSprite(firstObject, secondObject);
    if (!projectileView || !monster) return;
    const projectile = projectileView.projectile;
    if (
      monster.getData('defeated') ||
      !canProjectileHit(projectile, 'enemy') ||
      !isProjectileCollisionEnabled(projectile, this.gameplayTime)
    ) return;
    projectileView.destroy();
    const damageResult = applyMonsterDamage(monster.combat, projectile.damage);
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

  private onProjectileHitPlayer: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    firstObject,
    secondObject,
  ) => {
    const projectileView = this.resolveProjectileView(firstObject, secondObject);
    if (!projectileView) return;
    const projectile = projectileView.projectile;
    if (
      !canProjectileHit(projectile, 'player') ||
      !isProjectileCollisionEnabled(projectile, this.gameplayTime)
    ) return;
    projectileView.destroy();
    const result = this.vitals.takeDamage(projectile.damage, this.gameplayTime);
    if (!result.applied) return;
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    this.playDamageFeedback();
    if (result.defeated) this.endGame();
  };

  private resolveProjectileView(firstObject: unknown, secondObject: unknown) {
    return [firstObject, secondObject].find(object => (
      object as Partial<ProjectileView> | undefined
    )?.projectile) as ProjectileView | undefined;
  }

  private resolveMonsterSprite(firstObject: unknown, secondObject: unknown) {
    return [firstObject, secondObject].find(object => (
      object as Partial<MonsterSprite> | undefined
    )?.combat) as MonsterSprite | undefined;
  }

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
