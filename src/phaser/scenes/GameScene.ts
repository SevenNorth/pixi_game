import Phaser from 'phaser';
import {
  getPlayerSkillEffect,
  getPlayerSkillDefinition,
} from '../../game/content/skills/playerSkillDefinitions';
import type { PlayerSkillId } from '../../game/content/skills/playerSkillDefinitions';
import { getEnemyDefinition } from '../../game/content/enemies/enemyDefinitions';
import type {
  EnemyKind,
  EnemySkillKind,
} from '../../game/content/enemies/enemyDefinitions';
import { getFoodRecovery } from '../../game/simulation/FoodRecovery';
import type { FoodKey } from '../../game/simulation/FoodRecovery';
import { rollFoodDrop } from '../../game/simulation/FoodDropSystem';
import { InfiniteWorldSystem } from '../../game/simulation/InfiniteWorld';
import type { WorldChunkState, WorldObstacleState } from '../../game/simulation/InfiniteWorld';
import { MapProgression } from '../../game/simulation/MapProgression';
import { rollMonsterLevel } from '../../game/simulation/MonsterLevelScaling';
import {
  getMonsterSpawnProfile,
  MonsterSpawnDirector,
  rollMinionKind,
} from '../../game/simulation/MonsterSpawnDirector';
import {
  applyMonsterDamage,
  createMonsterCombatState,
  pauseMonsterPatrol,
  relocateMonsterCombatState,
  setMonsterPatrolTarget,
  finishEnemySkill,
  getEnemyAttackCooldownMs,
  getEnemySkillKind,
  startEnemySkill,
  updateMonsterAggro,
} from '../../game/simulation/MonsterCombat';
import type { MonsterCombatState } from '../../game/simulation/MonsterCombat';
import {
  createPlayerDirectionState,
  resolveCardinalDirection,
  updatePlayerFacing,
  updatePlayerDirection,
} from '../../game/simulation/PlayerMovement';
import type { CardinalDirection, PlayerDirectionState } from '../../game/simulation/PlayerMovement';
import { PlayerPassiveSystem } from '../../game/simulation/PlayerPassiveSystem';
import { PlayerProgression } from '../../game/simulation/PlayerProgression';
import { PostMaxProgression } from '../../game/simulation/PostMaxProgression';
import { RewardChoiceSystem } from '../../game/simulation/RewardChoiceSystem';
import {
  getRewardProfile,
  rollEliteCoreDrop,
  scalePlayerExperience,
} from '../../game/simulation/RewardScaling';
import { PlayerSkillSystem } from '../../game/simulation/PlayerSkillSystem';
import type {
  ActiveSkillSlotIndex,
  PlayerSkillRuntimeEvent,
} from '../../game/simulation/PlayerSkillSystem';
import { attackForLevel } from '../../game/simulation/PlayerCombatStats';
import { PLAYER_INVULNERABILITY_MS, PlayerVitals } from '../../game/simulation/PlayerVitals';
import { isSkillLoadoutSafe } from '../../game/simulation/SkillLoadoutSafety';
import {
  isPointWithinSegmentRadius,
  resolveSkillTarget,
} from '../../game/simulation/SkillTargeting';
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
  hideRewardChoice,
  hideSkillLoadout,
  showHud,
  showBossAppeared,
  showBossPhaseTwo,
  showActiveEquipChoice,
  showActiveForgetChoice,
  showLevelUp,
  showMapLevelUp,
  showMenu,
  showPassiveReplacementChoice,
  showRewardChoice,
  showSkillLoadout,
  showSkillLoadoutUnavailable,
  updateHud,
  updateMapProgression,
  updatePassiveSkills,
  updateProgression,
  updateSkillSlots,
  updateVitals,
} from '../ui/domHud';
import { playMonsterDefeat } from '../view/fx/playMonsterDefeat';
import { playFoodPickup } from '../view/fx/playFoodPickup';
import { playMonsterHit } from '../view/fx/playMonsterHit';
import {
  createPlayerShieldView,
  updatePlayerShieldView,
} from '../view/fx/PlayerShieldView';
import type { PlayerShieldView } from '../view/fx/PlayerShieldView';
import {
  playBossPhaseTransition,
  playEnemySkillImpact,
  playEnemyWarning,
} from '../view/fx/playEnemyWarning';
import {
  playLightningSkillCast,
  playLightningSkillImpact,
} from '../view/fx/playLightningSkillFx';
import {
  createProjectileView,
  getProjectileVisualLength,
  PROJECTILE_VISUAL_LENGTH,
  syncProjectileVisual,
  updateProjectileView,
} from '../view/projectiles/ProjectileView';
import type { ProjectileView, ProjectileVisualStyle } from '../view/projectiles/ProjectileView';
import { getRandomBossVisual, getRandomEnemyVisual } from '../view/enemies/enemyVisualDefinitions';
import type { EnemyVisualDefinition } from '../view/enemies/enemyVisualDefinitions';
import {
  createBossOffscreenIndicator,
  updateBossOffscreenIndicator,
} from '../view/ui/BossOffscreenIndicator';
import type { BossOffscreenIndicator } from '../view/ui/BossOffscreenIndicator';
import { ensureObstacleTexture } from '../view/world/createObstacleTexture';

const BULLET_SPEED = 420;
const WORLD_RUNTIME_HALF_EXTENT = 1_000_000_000;
const MINION_RECYCLE_DISTANCE = 1600;

interface MonsterSprite extends Phaser.Physics.Arcade.Sprite {
  monsterId: string;
  combat: MonsterCombatState;
  healthBar: Phaser.GameObjects.Graphics;
  animationDirection: CardinalDirection;
  warningView?: Phaser.GameObjects.Graphics;
  visualDefinition?: EnemyVisualDefinition;
  animationPrefix?: string;
}

interface FoodSprite extends Phaser.Physics.Arcade.Image {
  foodId: string;
  foodKey: FoodKey;
  expiresAt: number;
}

interface ObstacleSprite extends Phaser.Physics.Arcade.Image {
  obstacleId: string;
  obstacleKind: WorldObstacleState['kind'];
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private monsters!: Phaser.Physics.Arcade.Group;
  private foods!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private bushes!: Phaser.Physics.Arcade.StaticGroup;
  private inputController!: PhaserInputController;
  private killed = 0;
  private monsterTimer?: Phaser.Time.TimerEvent;
  private foodTimer?: Phaser.Time.TimerEvent;
  private bulletId = 0;
  private monsterId = 0;
  private foodId = 0;
  private ended = false;
  private paused = false;
  private rewardPauseActive = false;
  private bossDefeatCinematicActive = false;
  private skillLoadoutOpen = false;
  private skillLoadoutWasPaused = false;
  private selectedLoadoutSkillId: PlayerSkillId | null = null;
  private suppressCombatInputFrames = 0;
  private lastShotAt = -Infinity;
  private lockedTargetId: string | null = null;
  private currentTargetId: string | null = null;
  private gameplayTime = 0;
  private playerAttack = 1;
  private playerDirection: PlayerDirectionState = createPlayerDirectionState();
  private vitals = new PlayerVitals();
  private progression = new PlayerProgression();
  private postMaxProgression = new PostMaxProgression();
  private playerSkills = new PlayerSkillSystem();
  private playerPassives = new PlayerPassiveSystem();
  private rewardChoices = new RewardChoiceSystem();
  private world = new InfiniteWorldSystem();
  private mapProgression = new MapProgression();
  private obstacleSprites = new Map<string, ObstacleSprite>();
  private appliedPassiveMaxShieldBonus = 0;
  private damageTween?: Phaser.Tweens.Tween;
  private preserveMapProgressionOnRestart = false;
  private bossIndicator!: BossOffscreenIndicator;
  private playerShieldView!: PlayerShieldView;
  private spawnDirector = new MonsterSpawnDirector();

  constructor() {
    super('GameScene');
  }

  create(data: { preserveMapProgression?: boolean } = {}) {
    const preserveMapProgression = data.preserveMapProgression === true;
    this.preserveMapProgressionOnRestart = false;
    this.ended = false;
    this.paused = false;
    this.rewardPauseActive = false;
    this.bossDefeatCinematicActive = false;
    this.skillLoadoutOpen = false;
    this.skillLoadoutWasPaused = false;
    this.selectedLoadoutSkillId = null;
    this.suppressCombatInputFrames = 0;
    this.killed = 0;
    this.gameplayTime = 0;
    this.lastShotAt = -Infinity;
    this.lockedTargetId = null;
    this.currentTargetId = null;
    this.playerDirection = createPlayerDirectionState();
    this.vitals.reset();
    this.progression.reset();
    this.postMaxProgression.reset();
    this.playerSkills.reset(this.gameplayTime);
    this.playerPassives.reset();
    this.rewardChoices.reset(Phaser.Math.RND.integerInRange(1, 0x7fffffff));
    this.world.reset();
    if (!preserveMapProgression) this.mapProgression.reset();
    this.spawnDirector.reset(this.mapProgression.state.level);
    this.obstacleSprites.clear();
    this.appliedPassiveMaxShieldBonus = 0;
    this.playerAttack = attackForLevel(this.progression.state.level);
    hideMenu();
    hideLevelUp();
    hideRewardChoice();
    hideSkillLoadout();
    window.addEventListener('restart-game', this.restart, { once: true });
    window.addEventListener('reward-choice-selected', this.onRewardChoiceSelected);
    window.addEventListener('reward-resolution-action', this.onRewardResolutionAction);
    window.addEventListener('skill-loadout-action', this.onSkillLoadoutAction);
    window.addEventListener('keydown', this.onOverlayKeyDown);
    showHud();
    updateHud(this.killed);
    this.updateMapProgressionHud();
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    this.updatePlayerProgressionHud();
    updateSkillSlots(this.playerSkills.getSlotStates(this.gameplayTime));
    updatePassiveSkills(this.playerPassives.slots);

    this.physics.world.setBounds(
      -WORLD_RUNTIME_HALF_EXTENT,
      -WORLD_RUNTIME_HALF_EXTENT,
      WORLD_RUNTIME_HALF_EXTENT * 2,
      WORLD_RUNTIME_HALF_EXTENT * 2,
    );
    this.inputController = new PhaserInputController(this.input.keyboard!);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, this.syncBulletVisuals, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.player = this.physics.add.sprite(0, 0, 'player', 0);
    this.player.setDepth(2);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(34, 40).setOffset(7, 6);
    this.player.play('player-down');
    this.playerShieldView = createPlayerShieldView(this);

    this.monsters = this.physics.add.group();
    this.foods = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.walls = this.physics.add.staticGroup();
    this.bushes = this.physics.add.staticGroup();
    this.cameras.main.setBounds(
      -WORLD_RUNTIME_HALF_EXTENT,
      -WORLD_RUNTIME_HALF_EXTENT,
      WORLD_RUNTIME_HALF_EXTENT * 2,
      WORLD_RUNTIME_HALF_EXTENT * 2,
    );
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.bossIndicator = createBossOffscreenIndicator(this);

    this.physics.add.overlap(this.projectiles, this.monsters, this.onProjectileHitMonster, undefined, this);
    this.physics.add.overlap(this.projectiles, this.player, this.onProjectileHitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.foods, this.onFoodEat, undefined, this);
    this.physics.add.overlap(this.player, this.monsters, this.onMonsterCatch, undefined, this);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.monsters, this.walls);
    this.physics.add.collider(this.monsters, this.bushes);
    this.physics.add.collider(
      this.projectiles,
      this.walls,
      this.onProjectileHitObstacle,
      undefined,
      this,
    );

    this.syncWorldChunks();
    this.spawnMonster();
    this.resetMonsterSpawnTimer();
    this.foodTimer = this.time.addEvent({ delay: 5000, loop: true, callback: this.spawnFood, callbackScope: this });
  }

  shutdown() {
    this.events.off(Phaser.Scenes.Events.PRE_RENDER, this.syncBulletVisuals, this);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    window.removeEventListener('restart-game', this.restart);
    window.removeEventListener('reward-choice-selected', this.onRewardChoiceSelected);
    window.removeEventListener('reward-resolution-action', this.onRewardResolutionAction);
    window.removeEventListener('skill-loadout-action', this.onSkillLoadoutAction);
    window.removeEventListener('keydown', this.onOverlayKeyDown);
    hideRewardChoice();
    hideSkillLoadout();
  }

  update(_time: number, delta: number) {
    const inputFrame = this.inputController.readFrame();
    if (this.bossDefeatCinematicActive) return;
    if (this.rewardChoices.state.active) return;
    if (this.skillLoadoutOpen) {
      if (inputFrame.loadoutPressed) this.closeSkillLoadout();
      return;
    }
    if (inputFrame.loadoutPressed && !this.ended) {
      this.openSkillLoadout();
      return;
    }
    if (this.suppressCombatInputFrames > 0) {
      this.suppressCombatInputFrames -= 1;
      return;
    }
    if (inputFrame.pausePressed && !this.ended) this.togglePause();
    if (inputFrame.restartPressed) this.restart();
    if (this.ended || this.paused) return;
    this.gameplayTime += Math.min(delta, 50);
    const passiveModifiers = this.syncPassiveModifiers();
    this.playerSkills.setCooldownMultiplier(passiveModifiers.cooldownMultiplier);
    const speed = 180 * passiveModifiers.moveSpeedMultiplier;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const { horizontal, vertical } = inputFrame;
    updatePlayerDirection(this.playerDirection, horizontal, vertical);
    body.setVelocity(
      this.playerDirection.movementVector.x * speed,
      this.playerDirection.movementVector.y * speed,
    );
    this.syncWorldChunks();
    if (horizontal !== 0 || vertical !== 0) {
      this.playDirectionalAnimation(this.player, 'player', this.playerDirection.animationDirection);
    } else if (this.player.anims.isPlaying && !this.player.anims.isPaused) {
      this.player.anims.pause();
    }
    this.handleAutoAttack();
    if (inputFrame.basicAttackHeld) this.handleShoot();
    (Object.entries(inputFrame.skillPressed) as Array<
      [keyof typeof inputFrame.skillPressed, boolean]
    >).forEach(([action, pressed]) => {
      if (!pressed) return;
      const activation = this.playerSkills.requestAction(action, this.gameplayTime);
      this.handlePlayerSkillEvents(activation.events);
    });
    this.handlePlayerSkillEvents(this.playerSkills.update(this.gameplayTime));
    this.updatePlayerSkillPresentation();
    updatePlayerShieldView(
      this.playerShieldView,
      this.player.x,
      this.player.y,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
      delta,
    );
    updateSkillSlots(this.playerSkills.getSlotStates(this.gameplayTime));
    this.monsters.children.each(child => {
      const monster = child as MonsterSprite;
      if (!monster.active || monster.getData('defeated')) return null;
      const monsterBody = monster.body as Phaser.Physics.Arcade.Body;
      const playerDistance = Phaser.Math.Distance.Between(monster.x, monster.y, this.player.x, this.player.y);
      const homeDistance = Phaser.Math.Distance.Between(
        monster.x,
        monster.y,
        monster.combat.homeX,
        monster.combat.homeY,
      );
      const enemyDefinition = getEnemyDefinition(monster.combat.kind);
      const aggro = updateMonsterAggro(monster.combat, playerDistance, homeDistance);
      if (aggro === 'chasing') {
        if (monster.combat.kind === 'normal' || playerDistance > enemyDefinition.preferredRange * 1.25) {
          this.moveMonsterToward(monster, this.player.x, this.player.y, monster.combat.speed);
        } else if (playerDistance < enemyDefinition.preferredRange * 0.75) {
          this.moveMonsterToward(monster, this.player.x, this.player.y, -monster.combat.speed * 0.8);
        } else {
          monsterBody.setVelocity(0, 0);
        }
      } else if (aggro === 'returning') {
        if (homeDistance <= enemyDefinition.patrolReachDistance) {
          monster.combat.aggro = 'idle';
          pauseMonsterPatrol(
            monster.combat,
            this.gameplayTime + Phaser.Math.FloatBetween(250, 500),
          );
          monsterBody.setVelocity(0, 0);
        } else {
          this.moveMonsterToward(monster, monster.combat.homeX, monster.combat.homeY, monster.combat.speed);
        }
      } else if (homeDistance > enemyDefinition.patrolRadius * 1.25) {
        setMonsterPatrolTarget(monster.combat, monster.combat.homeX, monster.combat.homeY, 0);
        this.moveMonsterToward(monster, monster.combat.homeX, monster.combat.homeY, monster.combat.speed);
      } else if (this.gameplayTime < monster.combat.patrolPauseUntil) {
        monsterBody.setVelocity(0, 0);
      } else {
        if (!monster.combat.patrolTargetActive) {
          const patrolAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const patrolDistance = Phaser.Math.FloatBetween(
            enemyDefinition.patrolRadius * 0.4,
            enemyDefinition.patrolRadius,
          );
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
        if (patrolDistance <= enemyDefinition.patrolReachDistance) {
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
      this.updateEnemyAbilities(monster, playerDistance);
      if (monsterBody.velocity.lengthSq() > 0) {
        monster.animationDirection = resolveCardinalDirection(
          monsterBody.velocity.x,
          monsterBody.velocity.y,
          monster.animationDirection,
        );
        if (monster.animationPrefix) {
          this.playDirectionalAnimation(monster, monster.animationPrefix, monster.animationDirection);
        }
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
      if (this.gameplayTime > food.expiresAt) food.destroy();
      return null;
    });
    updateBossOffscreenIndicator(
      this.bossIndicator,
      this.cameras.main,
      this.getActiveBoss(),
    );
  }

  private handleShoot() {
    if (
      this.ended ||
      this.paused ||
      this.gameplayTime - this.lastShotAt < 500
    ) return;
    this.lastShotAt = this.gameplayTime;
    this.shoot(this.playerDirection.facingVector);
  }

  private handleAutoAttack() {
    const target = this.resolveAutoAttackTarget();
    if (!target || this.gameplayTime - this.lastShotAt < 500) return;
    this.lastShotAt = this.gameplayTime;
    this.shoot({
      x: target.x - this.player.x,
      y: target.y - this.player.y,
    });
  }

  private resolveAutoAttackTarget() {
    const range = 520;
    const locked = this.lockedTargetId
      ? this.findActiveMonster(this.lockedTargetId)
      : undefined;
    if (locked && Phaser.Math.Distance.Between(this.player.x, this.player.y, locked.x, locked.y) <= range) {
      this.currentTargetId = locked.monsterId;
      return locked;
    }
    if (this.lockedTargetId) this.lockedTargetId = null;

    const current = this.currentTargetId ? this.findActiveMonster(this.currentTargetId) : undefined;
    if (current && Phaser.Math.Distance.Between(this.player.x, this.player.y, current.x, current.y) <= range) {
      return current;
    }

    let nearest: MonsterSprite | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    this.monsters.children.each(child => {
      const monster = child as MonsterSprite;
      if (!monster.active || monster.getData('defeated')) return null;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, monster.x, monster.y);
      if (distance <= range && distance < nearestDistance) {
        nearest = monster;
        nearestDistance = distance;
      }
      return null;
    });
    this.currentTargetId = nearest?.monsterId ?? null;
    return nearest;
  }

  private findActiveMonster(monsterId: string) {
    return this.monsters.children.entries
      .map(child => child as MonsterSprite)
      .find(monster => monster.active && !monster.getData('defeated') && monster.monsterId === monsterId);
  }

  private onPointerDown = (pointer: Phaser.Input.Pointer) => {
    if (this.ended || this.paused || this.rewardChoices.state.active) return;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const target = this.findMonsterAtPoint(worldPoint.x, worldPoint.y);
    if (target) {
      this.lockedTargetId = target.monsterId;
      this.currentTargetId = target.monsterId;
      this.updateAim(worldPoint.x, worldPoint.y);
      return;
    }
    this.lockedTargetId = null;
    this.updateAim(worldPoint.x, worldPoint.y);
  };

  private onPointerMove = (pointer: Phaser.Input.Pointer) => {
    if (this.ended || this.paused || this.rewardChoices.state.active) return;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.updateAim(worldPoint.x, worldPoint.y);
  };

  private updateAim(worldX: number, worldY: number) {
    updatePlayerFacing(this.playerDirection, worldX - this.player.x, worldY - this.player.y);
  }

  private findMonsterAtPoint(x: number, y: number) {
    let closest: MonsterSprite | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    this.monsters.children.each(child => {
      const monster = child as MonsterSprite;
      if (!monster.active || monster.getData('defeated')) return null;
      const hitRadius = Math.max(26, Math.max(monster.displayWidth, monster.displayHeight) * 0.35);
      const distance = Phaser.Math.Distance.Between(x, y, monster.x, monster.y);
      if (distance <= hitRadius && distance < closestDistance) {
        closest = monster;
        closestDistance = distance;
      }
      return null;
    });
    return closest;
  }

  private handlePlayerSkillEvents(events: PlayerSkillRuntimeEvent[]) {
    events.forEach(({ skillId, event }) => {
      if (event.type === 'released') this.releasePlayerSkill(skillId);
    });
  }

  private releasePlayerSkill(skillId: PlayerSkillId) {
    const learned = this.playerSkills.getLearnedSkill(skillId);
    if (!learned) return;
    const definition = getPlayerSkillDefinition(
      skillId,
      learned.level,
      this.playerPassives.getModifiers().cooldownMultiplier,
    );
    const target = resolveSkillTarget(definition.targeting, {
      origin: { x: this.player.x, y: this.player.y },
      facing: this.playerDirection.facingVector,
      movement: this.playerDirection.movementVector,
      range: definition.range,
      candidates: this.monsters.children.entries.map(child => {
        const monster = child as MonsterSprite;
        return {
          id: monster.monsterId,
          x: monster.x,
          y: monster.y,
          active: monster.active && !monster.getData('defeated'),
        };
      }),
    });
    if (!target) return;

    const effect = getPlayerSkillEffect(skillId, learned.level);
    if (effect.type === 'projectile') {
      const passiveAttack = this.playerPassives.getModifiers().attackBonus;
      const damage = Math.round(
        (this.playerAttack + passiveAttack) * definition.damageMultiplier
          + definition.fixedDamage,
      );
      const projectile = createProjectileState({
        id: `projectile-${this.bulletId++}`,
        ownerId: 'player',
        faction: 'player',
        damage,
        velocityX: target.direction.x * effect.speed,
        velocityY: target.direction.y * effect.speed,
        remainingDistance: definition.range,
        collisionEnabledAt: this.gameplayTime + 30,
        impact: {
          type: 'splash',
          radius: effect.splashRadius,
          damageMultiplier: effect.splashDamageMultiplier,
        },
      });
      const visualStyle: ProjectileVisualStyle = 'skill-lightning';
      const visualLength = getProjectileVisualLength(visualStyle);
      playLightningSkillCast(this, this.player.x, this.player.y, target.direction);
      this.spawnProjectile(
        projectile,
        this.player.x + target.direction.x * (24 + visualLength / 2),
        this.player.y + target.direction.y * (24 + visualLength / 2),
        visualStyle,
      );
      return;
    }

    if (effect.type === 'dash') {
      const bounds = this.physics.world.bounds;
      const originX = this.player.x;
      const originY = this.player.y;
      const destinationX = Phaser.Math.Clamp(target.point.x, bounds.left + 24, bounds.right - 24);
      const destinationY = Phaser.Math.Clamp(target.point.y, bounds.top + 24, bounds.bottom - 24);
      this.vitals.grantInvulnerability(effect.invulnerabilityMs, this.gameplayTime);
      this.playDashTrail(
        originX,
        originY,
        destinationX,
        destinationY,
        effect.pathDamageMultiplier > 0,
      );
      (this.player.body as Phaser.Physics.Arcade.Body).reset(destinationX, destinationY);
      if (effect.pathDamageMultiplier > 0) {
        const damage = Math.max(1, Math.round(
          (this.playerAttack + this.playerPassives.getModifiers().attackBonus)
            * effect.pathDamageMultiplier,
        ));
        this.monsters.children.each(child => {
          const monster = child as MonsterSprite;
          if (
            monster.active
            && !monster.getData('defeated')
            && isPointWithinSegmentRadius(
              monster,
              { x: originX, y: originY },
              { x: destinationX, y: destinationY },
              effect.pathRadius + monster.displayWidth * 0.25,
            )
          ) {
            this.damageMonster(monster, damage);
          }
          return null;
        });
      }
      return;
    }

    this.vitals.restoreShield(effect.points);
    this.vitals.grantDamageProtection(
      effect.damageTakenMultiplier,
      effect.protectionMs,
      this.gameplayTime,
    );
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    this.playShieldPulse(effect.protectionMs > 0);
  }

  private updatePlayerSkillPresentation() {
    const windingUp = this.playerSkills.getSlotStates(this.gameplayTime)
      .some(slot => slot?.phase === 'windup');
    if (windingUp) this.player.setTint(0xbdefff);
    else if (this.gameplayTime < this.vitals.state.protectedUntil) this.player.setTint(0x85f7ff);
    else this.player.clearTint();
  }

  private playDashTrail(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    damaging: boolean,
  ) {
    const trail = this.add.graphics().setDepth(1);
    trail.lineStyle(damaging ? 12 : 8, damaging ? 0xd9fbff : 0x4ebcff, 0.72);
    trail.lineBetween(fromX, fromY, toX, toY);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 220,
      onComplete: () => trail.destroy(),
    });
  }

  private playShieldPulse(protectedByShield: boolean) {
    const pulse = this.add.graphics({ x: this.player.x, y: this.player.y }).setDepth(3);
    if (protectedByShield) {
      pulse.fillStyle(0x55d8ff, 0.16);
      pulse.fillCircle(0, 0, 28);
    }
    pulse.lineStyle(4, 0x55d8ff, 0.9);
    pulse.strokeCircle(0, 0, 28);
    this.tweens.add({
      targets: pulse,
      scale: 1.8,
      alpha: 0,
      duration: 360,
      onComplete: () => pulse.destroy(),
    });
  }

  private shoot(directionInput = this.playerDirection.facingVector) {
    const length = Math.hypot(directionInput.x, directionInput.y);
    const direction = length > 0
      ? { x: directionInput.x / length, y: directionInput.y / length }
      : this.playerDirection.facingVector;
    const projectile = createProjectileState({
      id: `projectile-${this.bulletId++}`,
      ownerId: 'player',
      faction: 'player',
      damage: this.playerAttack + this.playerPassives.getModifiers().attackBonus,
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

  private spawnProjectile(
    projectile: ReturnType<typeof createProjectileState>,
    x: number,
    y: number,
    visualStyle: ProjectileVisualStyle = 'basic-lightning',
  ) {
    const budget = getMonsterSpawnProfile(this.mapProgression.state.level);
    const activeProjectiles = this.projectiles.children.entries.filter(child => child.active);
    if (activeProjectiles.length >= budget.maxActiveProjectiles) {
      activeProjectiles[0]?.destroy();
    }
    return createProjectileView(this, this.projectiles, projectile, x, y, visualStyle);
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
    this.recycleDistantMinions();
    if (this.spawnDirector.syncMapLevel(this.mapProgression.state.level)) {
      this.resetMonsterSpawnTimer();
    }
    const activeMinions = this.countActiveMinions();
    const kind = this.getNextEnemyKind();
    if (kind !== 'boss') {
      if (!this.spawnDirector.canActivateMinion(activeMinions)) return;
      const reusePoint = this.getSpawnPoint(450);
      if (this.reactivateDormantMinion(reusePoint.x, reusePoint.y)) return;
      if (!this.spawnDirector.canCreateMinion(activeMinions)) return;
    }
    const point = this.getSpawnPoint(450);
    if (kind === 'boss') {
      if (!this.mapProgression.markBossSpawned()) return;
      this.updateMapProgressionHud();
    }
    const monsterLevel = kind === 'boss'
      ? this.mapProgression.state.level
      : rollMonsterLevel(this.mapProgression.state.level, Phaser.Math.RND.frac());
    const definition = getEnemyDefinition(kind);
    const visualDefinition = kind === 'boss' ? undefined : getRandomEnemyVisual();
    const bossVisual = kind === 'boss' ? getRandomBossVisual() : undefined;
    const monster = this.physics.add.sprite(
      point.x,
      point.y,
      visualDefinition?.textureKey ?? bossVisual!.textureKey,
      0,
    ) as unknown as MonsterSprite;
    monster.monsterId = `monster-${this.monsterId++}`;
    monster.combat = createMonsterCombatState(
      monsterLevel,
      point.x,
      point.y,
      kind,
      this.gameplayTime,
      bossVisual?.id,
    );
    monster.animationDirection = 'down';
    monster.visualDefinition = visualDefinition;
    monster.animationPrefix = visualDefinition?.animationPrefix;
    monster.healthBar = this.add.graphics().setDepth(4);
    monster.healthBar.setVisible(false);
    monster.setData('monsterId', monster.monsterId);
    if (visualDefinition) {
      const sizeMultiplier = definition.sizeMultiplier;
      monster.setDisplaySize(
        visualDefinition.displayWidth * sizeMultiplier,
        visualDefinition.displayHeight * sizeMultiplier,
      );
      const bodyWidth = visualDefinition.frameWidth * 0.68;
      const bodyHeight = visualDefinition.frameHeight * 0.72;
      monster.setSize(bodyWidth, bodyHeight).setOffset(
        (visualDefinition.frameWidth - bodyWidth) / 2,
        visualDefinition.frameHeight - bodyHeight,
      );
      monster.play(`${visualDefinition.animationPrefix}-down`);
    } else {
      const displaySize = 48 * definition.sizeMultiplier;
      monster.setDisplaySize(displaySize, displaySize);
      monster.setSize(400, 420).setOffset(120, 150);
      monster.setData('enemyKind', kind);
      monster.setData('bossVisual', bossVisual!.id);
    }
    this.monsters.add(monster);
    if (kind === 'boss') {
      showBossAppeared(monsterLevel);
    } else {
      this.spawnDirector.recordMinionSpawn();
    }
  }

  private getNextEnemyKind(): EnemyKind {
    if (
      this.mapProgression.state.status === 'boss-ready' &&
      !this.hasActiveBoss()
    ) return 'boss';
    return rollMinionKind(this.mapProgression.state.level, Phaser.Math.RND.frac());
  }

  private countActiveMinions() {
    return this.monsters.children.entries.reduce((count, child) => {
      const monster = child as MonsterSprite;
      return count + Number(
        monster.active &&
        monster.combat.kind !== 'boss' &&
        !monster.getData('defeated'),
      );
    }, 0);
  }

  private recycleDistantMinions() {
    const distantMinions = this.monsters.children.entries.filter(child => {
      const monster = child as MonsterSprite;
      return (
        monster.active &&
        monster.combat.kind !== 'boss' &&
        !monster.getData('defeated') &&
        Phaser.Math.Distance.Between(monster.x, monster.y, this.player.x, this.player.y)
          > MINION_RECYCLE_DISTANCE
      );
    }) as MonsterSprite[];
    distantMinions.forEach(monster => {
      monster.warningView?.destroy();
      monster.warningView = undefined;
      monster.healthBar.clear().setVisible(false);
      monster.setData('dormant', true);
      monster.disableBody(true, true);
    });
  }

  private reactivateDormantMinion(x: number, y: number) {
    const monster = this.monsters.children.entries.find(child => {
      const candidate = child as MonsterSprite;
      return !candidate.active && candidate.getData('dormant') === true;
    }) as MonsterSprite | undefined;
    if (!monster) return false;
    relocateMonsterCombatState(monster.combat, x, y, this.gameplayTime);
    monster.setData('dormant', false);
    monster.setData('defeated', false);
    monster.animationDirection = 'down';
    monster.enableBody(true, x, y, true, true);
    monster.setAlpha(1).clearTint();
    monster.healthBar.clear().setVisible(false);
    if (monster.animationPrefix) {
      monster.play(`${monster.animationPrefix}-down`, true);
    }
    return true;
  }

  private hasActiveBoss() {
    return this.getActiveBoss() !== undefined;
  }

  private getActiveBoss() {
    return this.monsters.children.entries.find(child => {
      const monster = child as MonsterSprite;
      return (
        monster.active &&
        monster.combat.kind === 'boss' &&
        !monster.getData('defeated')
      );
    }) as MonsterSprite | undefined;
  }

  private spawnFood() {
    if (this.ended) return;
    const point = this.getSpawnPoint(250);
    const foodKey = foodKeys[Phaser.Math.Between(0, foodKeys.length - 1)];
    this.spawnFoodAt(point.x, point.y, foodKey);
  }

  private spawnFoodAt(x: number, y: number, foodKey: FoodKey) {
    const budget = getMonsterSpawnProfile(this.mapProgression.state.level);
    const activeFoods = this.foods.children.entries.filter(child => child.active);
    if (activeFoods.length >= budget.maxActiveFoods) activeFoods[0]?.destroy();
    const recovery = getFoodRecovery(foodKey);
    const displaySize = recovery >= 2 ? 38 : 32;
    const food = this.physics.add.image(x, y, foodKey) as FoodSprite;
    food.foodId = `food-${this.foodId++}`;
    food.foodKey = foodKey;
    food.expiresAt = this.gameplayTime + 9000;
    food.setDepth(1.5).setDisplaySize(displaySize, displaySize);
    const targetScaleX = food.scaleX;
    const targetScaleY = food.scaleY;
    food.setScale(targetScaleX * 0.35, targetScaleY * 0.35).setAlpha(0.2);
    this.foods.add(food);
    food.once(Phaser.GameObjects.Events.DESTROY, () => this.tweens.killTweensOf(food));
    this.tweens.add({
      targets: food,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      alpha: 1,
      duration: 180,
      ease: 'Back.Out',
    });
    this.tweens.add({
      targets: food,
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private resetMonsterSpawnTimer() {
    this.monsterTimer?.remove(false);
    this.monsterTimer = this.time.addEvent({
      delay: getMonsterSpawnProfile(this.mapProgression.state.level).spawnIntervalMs,
      loop: true,
      callback: this.spawnMonster,
      callbackScope: this,
    });
    this.monsterTimer.paused = this.paused || this.bossDefeatCinematicActive;
  }

  private syncWorldChunks() {
    const delta = this.world.syncAround(this.player.x, this.player.y);
    if (this.mapProgression.gainExplorationExperience(delta.discovered.length) > 0) {
      this.updateMapProgressionHud();
    }
    delta.exited.forEach(chunk => this.removeWorldChunk(chunk));
    delta.entered.forEach(chunk => this.addWorldChunk(chunk));
  }

  private addWorldChunk(chunk: WorldChunkState) {
    const formations = new Map<string, WorldObstacleState[]>();
    chunk.obstacles.forEach(obstacle => {
      const formation = formations.get(obstacle.formationId) ?? [];
      formation.push(obstacle);
      formations.set(obstacle.formationId, formation);
    });
    formations.forEach(formation => {
      if (!formation.every(obstacle => this.isWorldPositionClear(obstacle.x, obstacle.y, 90))) {
        return;
      }
      formation.forEach(obstacle => this.addWorldObstacle(obstacle));
    });
  }

  private removeWorldChunk(chunk: WorldChunkState) {
    chunk.obstacles.forEach(obstacle => {
      const sprite = this.obstacleSprites.get(obstacle.id);
      if (!sprite) return;
      sprite.destroy();
      this.obstacleSprites.delete(obstacle.id);
    });
  }

  private addWorldObstacle(obstacle: WorldObstacleState) {
    if (this.obstacleSprites.has(obstacle.id)) return;
    const group = obstacle.kind === 'wall' ? this.walls : this.bushes;
    const sprite = group.create(
      obstacle.x,
      obstacle.y,
      ensureObstacleTexture(this, obstacle.kind),
    ) as ObstacleSprite;
    sprite.obstacleId = obstacle.id;
    sprite.obstacleKind = obstacle.kind;
    sprite.setDisplaySize(obstacle.width, obstacle.height);
    sprite.setRotation(obstacle.rotation);
    sprite.setDepth(obstacle.kind === 'bush' ? 3 : 1);
    if (obstacle.kind === 'bush') sprite.setAlpha(0.9);
    sprite.refreshBody();
    this.obstacleSprites.set(obstacle.id, sprite);
  }

  private isWorldPositionClear(x: number, y: number, clearance: number) {
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < clearance) return false;
    const occupiedByMonster = this.monsters.children.entries.some(child => {
      const monster = child as MonsterSprite;
      return monster.active && Phaser.Math.Distance.Between(x, y, monster.x, monster.y) < clearance;
    });
    if (occupiedByMonster) return false;
    return !this.foods.children.entries.some(child => {
      const food = child as FoodSprite;
      return food.active && Phaser.Math.Distance.Between(x, y, food.x, food.y) < clearance;
    });
  }

  private getSpawnPoint(distance: number) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const point = {
        x: this.player.x + Math.cos(angle) * distance,
        y: this.player.y + Math.sin(angle) * distance,
      };
      if (!this.isObstacleNear(point.x, point.y, 48)) return point;
    }
    return { x: this.player.x + distance, y: this.player.y };
  }

  private isObstacleNear(x: number, y: number, clearance: number) {
    return Array.from(this.obstacleSprites.values()).some(obstacle => (
      Math.abs(obstacle.x - x) <= obstacle.displayWidth / 2 + clearance &&
      Math.abs(obstacle.y - y) <= obstacle.displayHeight / 2 + clearance
    ));
  }

  private moveMonsterToward(monster: MonsterSprite, targetX: number, targetY: number, speed: number) {
    const angle = Phaser.Math.Angle.Between(monster.x, monster.y, targetX, targetY);
    const body = monster.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private updateEnemyAbilities(monster: MonsterSprite, playerDistance: number) {
    if (monster.combat.kind === 'normal') return;
    const now = this.gameplayTime;

    if (now < monster.combat.invulnerableUntil) {
      (monster.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }

    if (monster.combat.activeSkill) {
      (monster.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      if (now >= monster.combat.activeSkill.endsAt) {
        const skill = monster.combat.activeSkill;
        monster.warningView?.destroy();
        monster.warningView = undefined;
        this.launchEnemySkill(monster, skill.kind, skill.directionX, skill.directionY);
        finishEnemySkill(monster.combat, now);
      }
      return;
    }

    if (
      now >= monster.combat.nextSkillAt &&
      playerDistance <= 760
    ) {
      const skill = getEnemySkillKind(monster.combat);
      if (skill) {
        const direction = this.getDirectionToPlayer(monster);
        startEnemySkill(monster.combat, skill, direction.x, direction.y, now);
        const warningView = playEnemyWarning(
          this,
          monster.x,
          monster.y,
          skill,
          direction.x,
          direction.y,
        );
        monster.warningView = warningView;
        warningView.once(Phaser.GameObjects.Events.DESTROY, () => {
          if (monster.warningView === warningView) monster.warningView = undefined;
        });
        return;
      }
    }

    if (now >= monster.combat.nextAttackAt && playerDistance <= 680) {
      const direction = this.getDirectionToPlayer(monster);
      this.launchEnemyProjectile(monster, direction.x, direction.y);
      monster.combat.nextAttackAt = now + getEnemyAttackCooldownMs(monster.combat);
    }
  }

  private getDirectionToPlayer(monster: MonsterSprite) {
    const distance = Phaser.Math.Distance.Between(monster.x, monster.y, this.player.x, this.player.y);
    if (distance <= 0) return { x: 0, y: 1 };
    return {
      x: (this.player.x - monster.x) / distance,
      y: (this.player.y - monster.y) / distance,
    };
  }

  private launchEnemyProjectile(
    monster: MonsterSprite,
    directionX: number,
    directionY: number,
    damage = monster.combat.projectileDamage,
  ) {
    const isBoss = monster.combat.kind === 'boss';
    const speed = isBoss ? 300 : 250;
    const visualStyle: ProjectileVisualStyle = isBoss
      ? (monster.combat.bossVariant === 'dragon-green' ? 'enemy-venom' : 'enemy-void')
      : monster.visualDefinition?.projectileStyle ?? 'enemy-ghost';
    const visualLength = getProjectileVisualLength(visualStyle);
    const muzzleDistance = Math.max(24, monster.displayWidth * 0.42);
    const projectile = createProjectileState({
      id: `projectile-${this.bulletId++}`,
      ownerId: monster.monsterId,
      faction: 'enemy',
      damage,
      velocityX: directionX * speed,
      velocityY: directionY * speed,
      remainingDistance: 720,
      collisionEnabledAt: this.gameplayTime + 40,
    });
    this.spawnProjectile(
      projectile,
      monster.x + directionX * (muzzleDistance + visualLength / 2),
      monster.y + directionY * (muzzleDistance + visualLength / 2),
      visualStyle,
    );
  }

  private launchEnemySkill(
    monster: MonsterSprite,
    skill: EnemySkillKind,
    directionX: number,
    directionY: number,
  ) {
    if (skill === 'aimed-shot') {
      this.launchEnemyProjectile(
        monster,
        directionX,
        directionY,
        monster.combat.skillDamage,
      );
      return;
    }

    if (skill === 'spread-shot') {
      const baseAngle = Math.atan2(directionY, directionX);
      [-24, -12, 0, 12, 24].forEach(offset => {
        const angle = baseAngle + Phaser.Math.DegToRad(offset);
        this.launchEnemyProjectile(
          monster,
          Math.cos(angle),
          Math.sin(angle),
          monster.combat.skillDamage,
        );
      });
      return;
    }

    const radius = monster.combat.kind === 'boss'
      ? (monster.combat.bossPhase === 2 ? 170 : 150)
      : 100;
    const impactColor = monster.combat.bossVariant === 'dragon-black'
      ? 0xb767ff
      : monster.combat.bossVariant === 'dragon-green' ? 0x70e56f : 0xff8654;
    playEnemySkillImpact(this, monster.x, monster.y, radius, impactColor);
    const distance = Phaser.Math.Distance.Between(monster.x, monster.y, this.player.x, this.player.y);
    if (distance <= radius) this.applyPlayerDamage(monster.combat.skillDamage);
  }

  private applyPlayerDamage(damage: number) {
    const result = this.vitals.takeDamage(damage, this.gameplayTime);
    if (!result.applied) return result;
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    this.playDamageFeedback();
    if (result.defeated) this.endGame();
    return result;
  }

  private playDirectionalAnimation(
    sprite: Phaser.Physics.Arcade.Sprite,
    prefix: string,
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
    const impactX = monster.x;
    const impactY = monster.y;
    projectileView.destroy();
    this.damageMonster(monster, projectile.damage);

    if (projectile.impact?.type === 'splash') {
      const { radius, damageMultiplier } = projectile.impact;
      playLightningSkillImpact(this, impactX, impactY, radius);
      const splashDamage = Math.max(1, Math.round(projectile.damage * damageMultiplier));
      this.monsters.children.each(child => {
        const nearbyMonster = child as MonsterSprite;
        if (
          !nearbyMonster.active ||
          nearbyMonster === monster ||
          nearbyMonster.getData('defeated') ||
          Phaser.Math.Distance.Between(
            impactX,
            impactY,
            nearbyMonster.x,
            nearbyMonster.y,
          ) > radius
        ) return null;
        this.damageMonster(nearbyMonster, splashDamage);
        return null;
      });
    }
  };

  private onProjectileHitObstacle: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    firstObject,
    secondObject,
  ) => {
    this.resolveProjectileView(firstObject, secondObject)?.destroy();
  };

  private damageMonster(monster: MonsterSprite, damage: number) {
    if (monster.getData('defeated')) return;
    const damageResult = applyMonsterDamage(monster.combat, damage, this.gameplayTime);
    if (!damageResult.applied) return;
    monster.healthBar.setVisible(!damageResult.defeated);
    this.updateMonsterHealthBar(monster);
    if (damageResult.phaseChanged) {
      monster.warningView?.destroy();
      monster.warningView = undefined;
      playBossPhaseTransition(
        this,
        monster,
        monster.combat.bossVariant ?? 'dragon-black',
      );
      showBossPhaseTwo();
      return;
    }
    if (!damageResult.defeated) {
      playMonsterHit(this, monster);
      return;
    }
    monster.setData('defeated', true);
    monster.warningView?.destroy();
    monster.warningView = undefined;
    monster.healthBar.destroy();
    const isBoss = monster.combat.kind === 'boss';
    if (isBoss) this.startBossDefeatCinematic();
    this.killed += 1;
    const rewardProfile = getRewardProfile(
      this.progression.state.level,
      this.mapProgression.state.level,
    );
    const droppedFood = rollFoodDrop(monster.combat.kind, rewardProfile, {
      drop: Phaser.Math.RND.frac(),
      quality: Phaser.Math.RND.frac(),
      item: Phaser.Math.RND.frac(),
    });
    if (droppedFood) this.spawnFoodAt(monster.x, monster.y, droppedFood);
    const wasMaxLevel = this.progression.state.level >= this.progression.state.maxLevel;
    let mapLevelAdvanced = false;
    if (isBoss) {
      if (this.mapProgression.completeBoss()) {
        mapLevelAdvanced = true;
        this.spawnDirector.syncMapLevel(this.mapProgression.state.level);
        this.resetMonsterSpawnTimer();
        this.rewardChoices.enqueue('boss');
      }
    } else {
      this.mapProgression.gainKillExperience(monster.combat.level);
    }
    if (
      monster.combat.kind === 'elite'
      && rollEliteCoreDrop(rewardProfile, Phaser.Math.RND.frac())
    ) {
      this.rewardChoices.enqueue('elite-core');
    }
    this.updateMapProgressionHud();
    const playerExperience = scalePlayerExperience(
      monster.combat.experience,
      rewardProfile.playerExperienceMultiplier,
    );
    const experienceResult = this.progression.gainExperience(playerExperience);
    if (experienceResult.levelUps > 0) this.handleLevelUp(experienceResult.levelUps);
    if (wasMaxLevel && monster.combat.kind !== 'boss') {
      const postMaxResult = this.postMaxProgression.recordKills();
      if (postMaxResult.rewardsEarned > 0) {
        this.rewardChoices.enqueue('post-max', postMaxResult.rewardsEarned);
      }
    }
    updateHud(this.killed);
    this.updatePlayerProgressionHud();
    if (isBoss) {
      const defeatColor = monster.combat.bossVariant === 'dragon-green' ? 0x70e56f : 0xb767ff;
      playMonsterDefeat(this, monster, {
        color: defeatColor,
        durationMs: 650,
        onComplete: () => this.finishBossDefeatCinematic(mapLevelAdvanced),
      });
    } else {
      playMonsterDefeat(this, monster);
      this.presentNextRewardChoice();
    }
  }

  private updatePlayerProgressionHud() {
    updateProgression(
      this.progression.state.level,
      this.progression.state.experience,
      this.progression.state.experienceToNext,
      this.progression.state.maxLevel,
      this.postMaxProgression.state.kills,
      this.postMaxProgression.state.killsToNext,
    );
  }

  private updateMapProgressionHud() {
    const state = this.mapProgression.state;
    updateMapProgression(
      state.level,
      state.experience,
      state.experienceToNext,
      state.status,
    );
  }

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
    this.applyPlayerDamage(projectile.damage);
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
    this.rewardChoices.enqueue('level-up', levelUps);
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    showLevelUp(this.progression.state.level, levelUps);
  };

  private presentNextRewardChoice() {
    if (this.bossDefeatCinematicActive) return;
    const choice = this.rewardChoices.activateNext({
      activeSkills: this.playerSkills.state.learned,
      passiveSkills: this.playerPassives.slots,
    });
    if (!choice) {
      hideRewardChoice();
      if (this.rewardPauseActive) {
        this.rewardPauseActive = false;
        this.suppressCombatInputFrames = 1;
        this.setGamePaused(false);
      }
      return;
    }

    if (!this.rewardPauseActive) {
      this.rewardPauseActive = true;
      this.setGamePaused(true);
    }
    showRewardChoice(choice, this.rewardChoices.state.pending.length + 1);
  }

  private onRewardChoiceSelected = (event: Event) => {
    const candidateId = (event as CustomEvent<{ candidateId?: string }>).detail?.candidateId;
    if (candidateId) this.selectReward(candidateId);
  };

  private onRewardResolutionAction = (event: Event) => {
    const detail = (event as CustomEvent<{
      action?: string;
      value?: number | string;
    }>).detail;
    if (detail?.action) this.handleRewardResolutionAction(detail.action, detail.value);
  };

  private onOverlayKeyDown = (event: KeyboardEvent) => {
    if (this.skillLoadoutOpen) {
      const numericIndex = /^\d$/.test(event.key) ? Number(event.key) - 1 : -1;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeSkillLoadout();
      } else if (numericIndex >= 0) {
        const skill = this.playerSkills.state.learned[numericIndex];
        if (skill) {
          event.preventDefault();
          this.selectedLoadoutSkillId = skill.id;
          this.presentSkillLoadout();
        }
      } else {
        const slot = ({ q: 0, e: 1, r: 2 } as const)[event.key.toLowerCase() as 'q' | 'e' | 'r'];
        if (slot !== undefined) {
          event.preventDefault();
          this.equipSelectedLoadoutSkill(slot);
        }
      }
      return;
    }

    const choice = this.rewardChoices.state.active;
    if (!choice) return;
    const resolution = this.rewardChoices.state.resolution;
    const numericIndex = /^\d$/.test(event.key) ? Number(event.key) - 1 : -1;

    if (!resolution) {
      if (numericIndex >= 0 && numericIndex < choice.candidates.length) {
        event.preventDefault();
        this.selectRewardByIndex(numericIndex);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.rewardChoices.clearResolutionSelection();
      this.presentRewardResolution();
      return;
    }
    if (event.key === 'Enter') {
      const confirmAction = resolution.kind === 'passive-replace'
        ? 'confirm-passive-replacement'
        : resolution.kind === 'active-forget'
          ? 'confirm-active-forget'
          : '';
      if (confirmAction) {
        event.preventDefault();
        this.handleRewardResolutionAction(confirmAction);
      }
      return;
    }
    if (resolution.kind === 'active-equip' && event.key === '0') {
      event.preventDefault();
      this.handleRewardResolutionAction('store-active');
      return;
    }
    if (numericIndex < 0) return;
    event.preventDefault();
    if (resolution.kind === 'active-equip' && numericIndex < 3) {
      this.handleRewardResolutionAction('equip-active', numericIndex);
    } else if (resolution.kind === 'passive-replace') {
      this.handleRewardResolutionAction('select-passive-slot', numericIndex);
    } else if (resolution.kind === 'active-forget') {
      const skillId = this.playerSkills.state.learned[numericIndex]?.id;
      if (skillId) this.handleRewardResolutionAction('select-active-forget', skillId);
    }
  };

  private onSkillLoadoutAction = (event: Event) => {
    const detail = (event as CustomEvent<{
      action?: string;
      value?: number | string;
    }>).detail;
    if (!this.skillLoadoutOpen || !detail?.action) return;
    if (detail.action === 'close') {
      this.closeSkillLoadout();
    } else if (detail.action === 'select' && typeof detail.value === 'string') {
      const skill = this.playerSkills.getLearnedSkill(detail.value as PlayerSkillId);
      if (!skill) return;
      this.selectedLoadoutSkillId = skill.id;
      this.presentSkillLoadout();
    } else if (detail.action === 'equip' && typeof detail.value === 'number') {
      this.equipSelectedLoadoutSkill(detail.value);
    }
  };

  private openSkillLoadout() {
    if (this.ended || this.rewardChoices.state.active) return;
    if (!this.isSafeToChangeSkillLoadout()) {
      showSkillLoadoutUnavailable();
      return;
    }
    this.selectedLoadoutSkillId = this.playerSkills.state.learned.find(
      skill => !this.playerSkills.state.equipped.includes(skill.id),
    )?.id ?? this.playerSkills.state.learned[0]?.id ?? null;
    this.skillLoadoutWasPaused = this.paused;
    this.skillLoadoutOpen = true;
    if (!this.paused) this.setGamePaused(true);
    this.presentSkillLoadout();
  }

  private closeSkillLoadout() {
    if (!this.skillLoadoutOpen) return;
    const shouldResume = !this.skillLoadoutWasPaused;
    this.skillLoadoutOpen = false;
    this.skillLoadoutWasPaused = false;
    this.selectedLoadoutSkillId = null;
    hideSkillLoadout();
    this.suppressCombatInputFrames = 1;
    if (shouldResume) this.setGamePaused(false);
  }

  private presentSkillLoadout() {
    showSkillLoadout(
      this.playerSkills.state.learned,
      this.playerSkills.state.equipped,
      this.selectedLoadoutSkillId,
    );
  }

  private equipSelectedLoadoutSkill(slot: number) {
    if (slot < 0 || slot > 2 || !this.selectedLoadoutSkillId) return;
    if (!this.isSafeToChangeSkillLoadout()) {
      this.closeSkillLoadout();
      showSkillLoadoutUnavailable();
      return;
    }
    const equipped = this.playerSkills.equipSkill(
      this.selectedLoadoutSkillId,
      slot as ActiveSkillSlotIndex,
      this.gameplayTime,
      true,
    );
    if (!equipped) return;
    updateSkillSlots(this.playerSkills.getSlotStates(this.gameplayTime));
    this.presentSkillLoadout();
  }

  private isSafeToChangeSkillLoadout() {
    const threats = this.monsters.children.entries
      .map(child => child as MonsterSprite)
      .filter(monster => monster.active && !monster.getData('defeated'))
      .map(monster => {
        const definition = getEnemyDefinition(monster.combat.kind);
        return {
          kind: monster.combat.kind,
          aggro: monster.combat.aggro,
          distance: Phaser.Math.Distance.Between(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          ),
          safeDistance: definition.aggroEnterDistance + 80,
        };
      });
    const hasEnemyProjectiles = this.projectiles.children.entries.some(child => (
      child.active && (child as ProjectileView).projectile?.faction === 'enemy'
    ));
    return isSkillLoadoutSafe({ threats, hasEnemyProjectiles });
  }

  private selectRewardByIndex(index: number) {
    const candidate = this.rewardChoices.state.active?.candidates[index];
    if (candidate) this.selectReward(candidate.id);
  }

  private selectReward(candidateId: string) {
    if (this.rewardChoices.state.resolution) return;
    const candidate = this.rewardChoices.state.active?.candidates.find(
      item => item.id === candidateId,
    );
    if (!candidate) return;

    if (candidate.kind === 'passive-slot') {
      if (this.playerPassives.expandSlots() <= 0) return;
    } else if (candidate.kind === 'active-skill') {
      const result = this.playerSkills.learnSkill(candidate.skillId, this.gameplayTime);
      if (result.status === 'requires-forget') {
        this.rewardChoices.beginResolution({
          kind: 'active-forget',
          candidateId,
          selectedSkillId: null,
        });
        this.presentRewardResolution();
        return;
      }
      if (result.status !== 'learned' && result.status !== 'upgraded') return;
      if (
        result.status === 'learned'
        && !this.playerSkills.state.equipped.includes(candidate.skillId)
      ) {
        this.rewardChoices.beginResolution({
          kind: 'active-equip',
          candidateId,
          selectedSlot: null,
        });
        this.presentRewardResolution();
        return;
      }
    } else {
      const result = this.playerPassives.acquire(candidate.skillId);
      if (result.status === 'requires-replacement') {
        this.rewardChoices.beginResolution({
          kind: 'passive-replace',
          candidateId,
          selectedSlot: null,
        });
        this.presentRewardResolution();
        return;
      }
      if (result.status !== 'learned' && result.status !== 'upgraded') return;
    }

    this.completeRewardSelection(candidateId);
  }

  private completeRewardSelection(candidateId: string) {
    this.rewardChoices.select(candidateId);
    updateSkillSlots(this.playerSkills.getSlotStates(this.gameplayTime));
    updatePassiveSkills(this.playerPassives.slots);
    this.syncPassiveModifiers();
    this.presentNextRewardChoice();
  }

  private presentRewardResolution() {
    const resolution = this.rewardChoices.state.resolution;
    const candidate = this.rewardChoices.state.active?.candidates.find(
      item => item.id === resolution?.candidateId,
    );
    if (!resolution || !candidate) return;

    if (resolution.kind === 'active-equip' && candidate.kind === 'active-skill') {
      showActiveEquipChoice(
        candidate,
        this.playerSkills.getSlotStates(this.gameplayTime),
      );
    } else if (resolution.kind === 'active-forget' && candidate.kind === 'active-skill') {
      showActiveForgetChoice(
        candidate,
        this.playerSkills.state.learned,
        resolution.selectedSkillId,
      );
    } else if (resolution.kind === 'passive-replace' && candidate.kind === 'passive-skill') {
      showPassiveReplacementChoice(
        candidate,
        this.playerPassives.slots,
        resolution.selectedSlot,
      );
    }
  }

  private handleRewardResolutionAction(action: string, value?: number | string) {
    const resolution = this.rewardChoices.state.resolution;
    const candidate = this.rewardChoices.state.active?.candidates.find(
      item => item.id === resolution?.candidateId,
    );
    if (!resolution || !candidate) return;

    if (action === 'back') {
      this.rewardChoices.clearResolutionSelection();
      this.presentRewardResolution();
      return;
    }
    if (resolution.kind === 'active-equip' && candidate.kind === 'active-skill') {
      if (action === 'store-active') {
        this.completeRewardSelection(candidate.id);
      } else if (action === 'equip-active' && typeof value === 'number') {
        const equipped = this.playerSkills.equipSkill(
          candidate.skillId,
          value as ActiveSkillSlotIndex,
          this.gameplayTime,
          true,
        );
        if (equipped) this.completeRewardSelection(candidate.id);
      }
      return;
    }
    if (resolution.kind === 'passive-replace' && candidate.kind === 'passive-skill') {
      if (action === 'select-passive-slot' && typeof value === 'number') {
        if (value < 0 || value >= this.playerPassives.slots.length) return;
        this.rewardChoices.selectResolutionSlot(value);
        this.presentRewardResolution();
      } else if (
        action === 'confirm-passive-replacement'
        && resolution.selectedSlot !== null
      ) {
        const result = this.playerPassives.acquire(
          candidate.skillId,
          resolution.selectedSlot,
          true,
        );
        if (result.status === 'learned') this.completeRewardSelection(candidate.id);
      }
      return;
    }
    if (resolution.kind === 'active-forget' && candidate.kind === 'active-skill') {
      if (action === 'select-active-forget' && typeof value === 'string') {
        const learned = this.playerSkills.getLearnedSkill(value as PlayerSkillId);
        if (!learned) return;
        this.rewardChoices.selectSkillToForget(learned.id);
        this.presentRewardResolution();
      } else if (
        action === 'confirm-active-forget'
        && resolution.selectedSkillId
      ) {
        const result = this.playerSkills.learnSkill(
          candidate.skillId,
          this.gameplayTime,
          resolution.selectedSkillId,
          true,
        );
        if (result.status !== 'learned') return;
        if (this.playerSkills.state.equipped.includes(candidate.skillId)) {
          this.completeRewardSelection(candidate.id);
        } else {
          this.rewardChoices.beginResolution({
            kind: 'active-equip',
            candidateId: candidate.id,
            selectedSlot: null,
          });
          this.presentRewardResolution();
        }
      }
    }
  }

  private syncPassiveModifiers() {
    const passiveModifiers = this.playerPassives.getModifiers();
    if (passiveModifiers.maxShieldBonus !== this.appliedPassiveMaxShieldBonus) {
      this.vitals.adjustMaxShield(
        passiveModifiers.maxShieldBonus - this.appliedPassiveMaxShieldBonus,
      );
      this.appliedPassiveMaxShieldBonus = passiveModifiers.maxShieldBonus;
      updateVitals(
        this.vitals.state.hp,
        this.vitals.state.maxHp,
        this.vitals.state.shield,
        this.vitals.state.maxShield,
      );
    }
    return passiveModifiers;
  }

  private onFoodEat: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (playerObject, foodObject) => {
    const food = foodObject as unknown as FoodSprite;
    if (this.vitals.state.hp >= this.vitals.state.maxHp) return;
    const recovery = getFoodRecovery(food.foodKey);
    const pickupX = food.x;
    const pickupY = food.y;
    food.destroy();
    const restoredHp = this.vitals.restoreHp(recovery);
    if (restoredHp > 0) playFoodPickup(this, pickupX, pickupY, restoredHp);
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
    const result = this.applyPlayerDamage(monster.combat.contactDamage);
    if (!result.applied) return;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, monster.x, monster.y);
    const separation = Math.max(
      48,
      (this.player.displayWidth + monster.displayWidth) * 0.35,
    );
    const body = monster.body as Phaser.Physics.Arcade.Body;
    body.reset(
      this.player.x + Math.cos(angle) * separation,
      this.player.y + Math.sin(angle) * separation,
    );
  };

  private playDamageFeedback() {
    this.damageTween?.stop();
    this.player.setAlpha(1);
    this.cameras.main.shake(120, 0.006);
    this.damageTween = this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: PLAYER_INVULNERABILITY_MS / 10,
      yoyo: true,
      repeat: 4,
      onComplete: () => this.player.setAlpha(1),
    });
  }

  private updateMonsterHealthBar(monster: MonsterSprite) {
    if (!monster.healthBar.visible || !monster.active) return;
    const width = monster.combat.kind === 'boss' ? 120 : monster.combat.kind === 'elite' ? 76 : 36;
    const height = 4;
    const ratio = Phaser.Math.Clamp(monster.combat.hp / monster.combat.maxHp, 0, 1);
    const healthBarY = monster.y - monster.displayHeight / 2 - 8;
    monster.healthBar.clear();
    monster.healthBar.fillStyle(0x15252d, 0.9);
    monster.healthBar.fillRect(monster.x - width / 2, healthBarY, width, height);
    const healthColor = monster.combat.kind === 'boss'
      ? (monster.combat.bossPhase === 2 ? 0xff4f63 : 0xff9d45)
      : monster.combat.kind === 'elite' ? 0xc778ff : 0xff5b68;
    monster.healthBar.fillStyle(healthColor, 1);
    monster.healthBar.fillRect(monster.x - width / 2, healthBarY, width * ratio, height);
  }

  private endGame() {
    if (this.ended) return;
    this.ended = true;
    this.damageTween?.stop();
    this.player.setAlpha(1);
    this.player.clearTint();
    this.physics.pause();
    this.monsterTimer?.remove(false);
    this.foodTimer?.remove(false);
    this.bossIndicator.container.setVisible(false);
    this.preserveMapProgressionOnRestart = this.mapProgression.failBoss();
    if (this.preserveMapProgressionOnRestart) this.updateMapProgressionHud();
    showMenu(t('gameOver', { killed: this.killed }), false, true);
  }

  private restart = () => {
    if (!this.ended) return;
    this.scene.restart({
      preserveMapProgression: this.preserveMapProgressionOnRestart,
    });
  };

  private togglePause() {
    if (this.ended || this.rewardPauseActive) return;
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

  private startBossDefeatCinematic() {
    this.bossDefeatCinematicActive = true;
    this.physics.pause();
    if (this.monsterTimer) this.monsterTimer.paused = true;
    if (this.foodTimer) this.foodTimer.paused = true;
  }

  private finishBossDefeatCinematic(mapLevelAdvanced: boolean) {
    if (!this.bossDefeatCinematicActive || this.ended) return;
    this.bossDefeatCinematicActive = false;
    this.setGamePaused(false);
    if (mapLevelAdvanced) showMapLevelUp(this.mapProgression.state.level);
    this.presentNextRewardChoice();
  }
}
