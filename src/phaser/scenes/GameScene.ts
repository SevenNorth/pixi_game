import Phaser from 'phaser';
import {
  getPlayerSkillDefinition,
  getShieldPoints,
  playerSkillDefinitions,
} from '../../game/content/skills/playerSkillDefinitions';
import type { PlayerSkillId } from '../../game/content/skills/playerSkillDefinitions';
import { getEnemyDefinition } from '../../game/content/enemies/enemyDefinitions';
import type { EnemyKind } from '../../game/content/enemies/enemyDefinitions';
import { getFoodRecovery } from '../../game/simulation/FoodRecovery';
import type { FoodKey } from '../../game/simulation/FoodRecovery';
import { InfiniteWorldSystem } from '../../game/simulation/InfiniteWorld';
import type { WorldChunkState, WorldObstacleState } from '../../game/simulation/InfiniteWorld';
import { MapProgression } from '../../game/simulation/MapProgression';
import { rollMonsterLevel } from '../../game/simulation/MonsterLevelScaling';
import {
  MonsterSpawnDirector,
  rollMinionKind,
} from '../../game/simulation/MonsterSpawnDirector';
import {
  applyMonsterDamage,
  createMonsterCombatState,
  pauseMonsterPatrol,
  setMonsterPatrolTarget,
  finishEnemySkill,
  getEnemySkillKind,
  startEnemySkill,
  updateMonsterAggro,
} from '../../game/simulation/MonsterCombat';
import type { MonsterCombatState } from '../../game/simulation/MonsterCombat';
import {
  createPlayerDirectionState,
  resolveCardinalDirection,
  updatePlayerDirection,
} from '../../game/simulation/PlayerMovement';
import type { CardinalDirection, PlayerDirectionState } from '../../game/simulation/PlayerMovement';
import { PlayerPassiveSystem } from '../../game/simulation/PlayerPassiveSystem';
import { PlayerProgression } from '../../game/simulation/PlayerProgression';
import { getRewardProfile, scalePlayerExperience } from '../../game/simulation/RewardScaling';
import { PlayerSkillSystem } from '../../game/simulation/PlayerSkillSystem';
import type { PlayerSkillRuntimeEvent } from '../../game/simulation/PlayerSkillSystem';
import { attackForLevel } from '../../game/simulation/PlayerCombatStats';
import { PLAYER_INVULNERABILITY_MS, PlayerVitals } from '../../game/simulation/PlayerVitals';
import { resolveSkillTarget } from '../../game/simulation/SkillTargeting';
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
  showBossAppeared,
  showLevelUp,
  showMapLevelUp,
  showMenu,
  updateHud,
  updateMapProgression,
  updatePassiveSkills,
  updateProgression,
  updateSkillSlots,
  updateVitals,
} from '../ui/domHud';
import { playMonsterDefeat } from '../view/fx/playMonsterDefeat';
import { playMonsterHit } from '../view/fx/playMonsterHit';
import { playEnemySkillImpact, playEnemyWarning } from '../view/fx/playEnemyWarning';
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
  private lastShotAt = -Infinity;
  private gameplayTime = 0;
  private playerAttack = 1;
  private playerDirection: PlayerDirectionState = createPlayerDirectionState();
  private vitals = new PlayerVitals();
  private progression = new PlayerProgression();
  private playerSkills = new PlayerSkillSystem();
  private playerPassives = new PlayerPassiveSystem();
  private world = new InfiniteWorldSystem();
  private mapProgression = new MapProgression();
  private obstacleSprites = new Map<string, ObstacleSprite>();
  private appliedPassiveMaxShieldBonus = 0;
  private damageTween?: Phaser.Tweens.Tween;
  private preserveMapProgressionOnRestart = false;
  private bossIndicator!: BossOffscreenIndicator;
  private spawnDirector = new MonsterSpawnDirector();

  constructor() {
    super('GameScene');
  }

  create(data: { preserveMapProgression?: boolean } = {}) {
    const preserveMapProgression = data.preserveMapProgression === true;
    this.preserveMapProgressionOnRestart = false;
    this.ended = false;
    this.paused = false;
    this.killed = 0;
    this.gameplayTime = 0;
    this.lastShotAt = -Infinity;
    this.playerDirection = createPlayerDirectionState();
    this.vitals.reset();
    this.progression.reset();
    this.playerSkills.reset(this.gameplayTime);
    this.playerPassives.reset();
    this.world.reset();
    if (!preserveMapProgression) this.mapProgression.reset();
    this.spawnDirector.reset(this.mapProgression.state.level);
    this.obstacleSprites.clear();
    this.appliedPassiveMaxShieldBonus = 0;
    this.playerAttack = attackForLevel(this.progression.state.level);
    hideMenu();
    hideLevelUp();
    window.addEventListener('restart-game', this.restart, { once: true });
    showHud();
    updateHud(this.killed);
    this.updateMapProgressionHud();
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
    updateSkillSlots(this.playerSkills.getSlotStates(this.gameplayTime));
    updatePassiveSkills(this.playerPassives.slots);

    this.physics.world.setBounds(
      -WORLD_RUNTIME_HALF_EXTENT,
      -WORLD_RUNTIME_HALF_EXTENT,
      WORLD_RUNTIME_HALF_EXTENT * 2,
      WORLD_RUNTIME_HALF_EXTENT * 2,
    );
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
    updateSkillSlots(this.playerSkills.getSlotStates(this.gameplayTime));
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
      if (this.time.now > food.expiresAt) food.destroy();
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
    this.shoot();
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

    const effect = playerSkillDefinitions[skillId].effect;
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
      const destinationX = Phaser.Math.Clamp(target.point.x, bounds.left + 24, bounds.right - 24);
      const destinationY = Phaser.Math.Clamp(target.point.y, bounds.top + 24, bounds.bottom - 24);
      this.playDashTrail(this.player.x, this.player.y, destinationX, destinationY);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(destinationX, destinationY);
      return;
    }

    this.vitals.restoreShield(getShieldPoints(skillId, learned.level));
    updateVitals(
      this.vitals.state.hp,
      this.vitals.state.maxHp,
      this.vitals.state.shield,
      this.vitals.state.maxShield,
    );
    this.playShieldPulse();
  }

  private updatePlayerSkillPresentation() {
    const windingUp = this.playerSkills.getSlotStates(this.gameplayTime)
      .some(slot => slot?.phase === 'windup');
    if (windingUp) this.player.setTint(0xbdefff);
    else this.player.clearTint();
  }

  private playDashTrail(fromX: number, fromY: number, toX: number, toY: number) {
    const trail = this.add.graphics().setDepth(1);
    trail.lineStyle(8, 0x4ebcff, 0.65);
    trail.lineBetween(fromX, fromY, toX, toY);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 220,
      onComplete: () => trail.destroy(),
    });
  }

  private playShieldPulse() {
    const pulse = this.add.graphics({ x: this.player.x, y: this.player.y }).setDepth(3);
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

  private shoot() {
    const direction = this.playerDirection.facingVector;
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
    this.spawnDirector.syncMapLevel(this.mapProgression.state.level);
    const activeMinions = this.countActiveMinions();
    if (this.mapProgression.state.status === 'boss-active') return;
    if (
      this.mapProgression.state.status === 'boss-ready' &&
      activeMinions > 0
    ) return;
    const kind = this.getNextEnemyKind();
    if (
      kind !== 'boss' &&
      !this.spawnDirector.canSpawnMinion(activeMinions)
    ) return;
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
      monster.healthBar.destroy();
      monster.destroy();
    });
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
    const index = Phaser.Math.Between(0, foodKeys.length - 1);
    const point = this.getSpawnPoint(250);
    const food = this.physics.add.image(point.x, point.y, foodKeys[index]) as FoodSprite;
    food.foodId = `food-${this.foodId++}`;
    food.foodKey = foodKeys[index];
    food.expiresAt = this.time.now + 9000;
    this.foods.add(food);
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
    const definition = getEnemyDefinition(monster.combat.kind);
    const now = this.gameplayTime;

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
      monster.combat.nextAttackAt = now + definition.attackCooldownMs;
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
      ? 'enemy-skill'
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
    skill: 'aimed-shot' | 'radial-burst',
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

    const radius = monster.combat.kind === 'boss' ? 150 : 100;
    playEnemySkillImpact(this, monster.x, monster.y, radius);
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
    const damageResult = applyMonsterDamage(monster.combat, damage);
    monster.healthBar.setVisible(!damageResult.defeated);
    this.updateMonsterHealthBar(monster);
    if (!damageResult.defeated) {
      playMonsterHit(this, monster);
      return;
    }
    monster.setData('defeated', true);
    monster.warningView?.destroy();
    monster.warningView = undefined;
    monster.healthBar.destroy();
    playMonsterDefeat(this, monster);
    this.killed += 1;
    const rewardProfile = getRewardProfile(
      this.progression.state.level,
      this.mapProgression.state.level,
    );
    if (monster.combat.kind === 'boss') {
      if (this.mapProgression.completeBoss()) {
        showMapLevelUp(this.mapProgression.state.level);
      }
    } else {
      this.mapProgression.gainKillExperience(monster.combat.level);
    }
    this.updateMapProgressionHud();
    const playerExperience = scalePlayerExperience(
      monster.combat.experience,
      rewardProfile.playerExperienceMultiplier,
    );
    const experienceResult = this.progression.gainExperience(playerExperience);
    updateHud(this.killed);
    updateProgression(
      this.progression.state.level,
      this.progression.state.experience,
      this.progression.state.experienceToNext,
    );
    if (experienceResult.levelUps > 0) this.handleLevelUp(experienceResult.levelUps);
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
    const healthColor = monster.combat.kind === 'boss' ? 0xff9d45 : monster.combat.kind === 'elite' ? 0xc778ff : 0xff5b68;
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
