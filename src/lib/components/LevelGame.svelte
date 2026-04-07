<script>
	import { onDestroy, onMount } from 'svelte';
	import { levelConfigs } from '$lib/game/levels';

	let { level = 1 } = $props();

	const WORLD_WIDTH = 1900;
	const WORLD_HEIGHT = 600;
	const VIEWPORT_WIDTH = 800;
	const GRAVITY = 1500;
	const MOVE_SPEED = 220;
	const JUMP_SPEED = 560;
	const WALK_ANIMATION_SPEED = 150;
	const PLAYER_DISPLAY_WIDTH = 64;
	const PLAYER_DISPLAY_HEIGHT = 102;
	const PLAYER_HITBOX_WIDTH = 38;
	const PLAYER_HITBOX_HEIGHT = 90;
	const BULLET_SPEED = 600;

	let PhaserLib;
	let game;
	let levelComplete = false;
	let walkFrame = 0;
	let walkInterval = null;
	let backgroundAudio = null;
	let jumpAudio = null;
	let landAudio = null;
	let runningSoundAudio = null;
	let shootAudio = null;
	let lives = $state(3);
	let collectedItems = $state([]);
	const walkFrames = ['walking_pose1', 'standing_pose1', 'walking_pose2', 'standing_pose1'];

	onMount(async () => {
		PhaserLib = await import('phaser');
		backgroundAudio = new Audio('/sounds/backgroundsound.wav');
		backgroundAudio.loop = true;
		backgroundAudio.volume = 0.4;
		backgroundAudio.play();
		jumpAudio = new Audio('/sounds/swing.mp3');
		jumpAudio.volume = 0.5;
		landAudio = new Audio('/sounds/land.wav');
		landAudio.volume = 0.5;
		runningSoundAudio = new Audio('/sounds/running_sound.mp3');
		runningSoundAudio.loop = true;
		runningSoundAudio.volume = 0.5;
		shootAudio = new Audio('/sounds/click.mp3');
		shootAudio.volume = 0.6;
		createGame();
	});

	onDestroy(() => {
		if (backgroundAudio) {
			backgroundAudio.pause();
			backgroundAudio.currentTime = 0;
			backgroundAudio = null;
		}

		if (jumpAudio) {
			jumpAudio.pause();
			jumpAudio = null;
		}

		if (landAudio) {
			landAudio.pause();
			landAudio = null;
		}

		if (shootAudio) {
			shootAudio.pause();
			shootAudio = null;
		}

		stopRunningSound();
		stopWalkAnimation();

		if (game) {
			game.destroy(true);
		}
	});

	function startRunningSound() {
		if (!runningSoundAudio || !runningSoundAudio.paused) return;
		runningSoundAudio.play();
	}

	function stopRunningSound() {
		if (!runningSoundAudio) return;
		runningSoundAudio.pause();
		runningSoundAudio.currentTime = 0;
	}

	function startWalkAnimation(scene) {
		if (!scene?.player) return;

		if (!walkInterval) {
			walkFrame = (walkFrame + 1) % walkFrames.length;
			scene.player.setTexture(walkFrames[walkFrame]);
		}

		if (walkInterval) return;

		walkInterval = setInterval(() => {
			if (!scene.player || levelComplete) return;

			walkFrame = (walkFrame + 1) % walkFrames.length;
			scene.player.setTexture(walkFrames[walkFrame]);
		}, WALK_ANIMATION_SPEED);
	}

	function stopWalkAnimation(scene, resetToStanding = true) {
		if (walkInterval) {
			clearInterval(walkInterval);
			walkInterval = null;
		}

		walkFrame = 0;

		if (scene?.player && resetToStanding) {
			scene.player.setTexture('standing_pose1');
		}
	}

	function setCrouchState(scene, shouldCrouch) {
		const state = scene.playerState;

		if (shouldCrouch === state.isCrouching) return;

		state.isCrouching = shouldCrouch;

		if (shouldCrouch) {
			stopWalkAnimation(scene, false);
			scene.player.setTexture('crouching_pose1');
		} else {
			scene.player.setTexture('standing_pose1');
		}
	}

	function getRectBounds(entity) {
		return {
			left: entity.x - entity.width / 2,
			right: entity.x + entity.width / 2,
			top: entity.y - entity.height / 2,
			bottom: entity.y + entity.height / 2
		};
	}

	function intersects(a, b) {
		return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
	}

	function createGame() {
		const Phaser = PhaserLib.default;
		const levelData = levelConfigs[level];
		const LEVEL_WORLD_WIDTH = levelData?.worldWidth ?? WORLD_WIDTH;

		if (!levelData) return;

		const config = {
			type: Phaser.AUTO,
			width: VIEWPORT_WIDTH,
			height: WORLD_HEIGHT,
			parent: `game-container-${level}`,
			scene: {
				preload() {
					this.load.image('sky', '/sky.png');
					if (level === 1) {
						this.load.image('long_background', '/long_background.png');
					}
					this.load.image('enemy_standing', '/charachters/enemy/pjeter/enemy_standing.png');
					this.load.image('enemy_moving', '/charachters/enemy/pjeter/enemy_moving.png');
					this.load.image('enemy_moving1', '/charachters/enemy/pjeter/enemy_moving1.png');
					this.load.image('standing_pose1', '/charachters/eni/standing_pose1.png');
					this.load.image('walking_pose1', '/charachters/eni/walking_pose1.png');
					this.load.image('walking_pose2', '/charachters/eni/walking_pose2.png');
					this.load.image('jumping_pose1', '/charachters/eni/jumping_pose1.png');
					this.load.image('crouching_pose1', '/charachters/eni/crouching_pose1.png');
				},
				create() {
					levelComplete = false;
					lives = 3;
					collectedItems = [];
					this.levelWorldWidth = LEVEL_WORLD_WIDTH;
					this.bullets = [];
					this.lastShotTime = 0;
					this.shootCooldown = 0.1;

					this.solids = [];
					this.hazards = [];
					this.checkpointReached = false;

					const floorY = level === 1 ? 600 : 560;
					const floor = this.add.rectangle(
						LEVEL_WORLD_WIDTH / 2,
						floorY,
						LEVEL_WORLD_WIDTH,
						80,
						0x4f7942
					);
					floor.setAlpha(0);
					this.solids.push({
						x: LEVEL_WORLD_WIDTH / 2,
						y: floorY,
						width: LEVEL_WORLD_WIDTH,
						height: 80,
						visual: floor
					});

					levelData.platforms.forEach((platformData) => {
						const platform = this.add.rectangle(
							platformData.x,
							platformData.y,
							platformData.width,
							platformData.height,
							platformData.color
						);

						if (platformData.invisible) {
							platform.setAlpha(0);
						}

						this.solids.push({
							x: platformData.x,
							y: platformData.y,
							width: platformData.width,
							height: platformData.height,
							visual: platform
						});
					});

					this.enemies = [];

					(levelData.enemies || []).forEach((enemyData) => {
						const enemy = this.add.sprite(enemyData.x, enemyData.y, 'enemy_standing');
						enemy.setOrigin(0.5, 0.5);
						enemy.setDisplaySize(enemyData.width, enemyData.height);

						this.enemies.push({
							x: enemyData.x,
							y: enemyData.y,
							width: enemyData.width,
							height: enemyData.height,
							visual: enemy,
							speed: 60,
							hitCooldown: 0,
							walkFrame: 0,
							walkTimer: 0,
							patrolLeft: enemyData.patrolLeft,
							patrolRight: enemyData.patrolRight,
							patrolDirection: 1
						});
					});

					this.livesText = this.add
						.text(16, 16, '❤️ ❤️ ❤️', {
							fontSize: '20px',
							color: '#ff4444',
							fontFamily: 'Press Start 2P'
						})
						.setScrollFactor(0);

					levelData.hazards.forEach((hazardData) => {
						const hazard = this.add.rectangle(
							hazardData.x,
							hazardData.y,
							hazardData.width,
							hazardData.height,
							0xd62828
						);

						this.hazards.push({
							x: hazardData.x,
							y: hazardData.y,
							width: hazardData.width,
							height: hazardData.height,
							visual: hazard
						});
					});

					this.collectables = [];

					(levelData.collectables || []).forEach((collectableData) => {
						const collectable = this.add.rectangle(
							collectableData.x,
							collectableData.y,
							collectableData.width,
							collectableData.height,
							collectableData.color
						);

						this.collectables.push({
							x: collectableData.x,
							y: collectableData.y,
							width: collectableData.width,
							height: collectableData.height,
							type: collectableData.type,
							visual: collectable,
							collected: false
						});
					});

					const checkpointData = levelData.checkpoint;
					this.checkpoint = {
						x: checkpointData.x,
						y: checkpointData.y,
						width: checkpointData.width,
						height: checkpointData.height,
						visual: this.add.rectangle(
							checkpointData.x,
							checkpointData.y,
							checkpointData.width,
							checkpointData.height,
							0xffff00
						)
					};

					const finishData = levelData.finish;
					this.finish = {
						x: finishData.x,
						y: finishData.y,
						width: finishData.width,
						height: finishData.height,
						visual: this.add.rectangle(
							finishData.x,
							finishData.y,
							finishData.width,
							finishData.height,
							0x2a9d8f
						)
					};

					this.respawnX = levelData.respawn.x;
					this.respawnY = levelData.respawn.y;

					const player = this.add.sprite(levelData.respawn.x, levelData.respawn.y, 'standing_pose1');
					player.setOrigin(0.5, 0.5);
					player.setDisplaySize(PLAYER_DISPLAY_WIDTH, PLAYER_DISPLAY_HEIGHT);
					player.setTint(0x888888);

					this.player = player;
					this.playerState = {
						x: levelData.respawn.x,
						y: levelData.respawn.y,
						vx: 0,
						vy: 0,
						onGround: false,
						isCrouching: false,
						facingLeft: false,
						width: PLAYER_HITBOX_WIDTH,
						height: PLAYER_HITBOX_HEIGHT
					};

					this.cameras.main.setBounds(0, 0, LEVEL_WORLD_WIDTH, WORLD_HEIGHT);
					this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

					this.cursors = this.input.keyboard.createCursorKeys();
					this.wasd = this.input.keyboard.addKeys({
						up: Phaser.Input.Keyboard.KeyCodes.W,
						down: Phaser.Input.Keyboard.KeyCodes.S,
						left: Phaser.Input.Keyboard.KeyCodes.A,
					right: Phaser.Input.Keyboard.KeyCodes.D,
					space: Phaser.Input.Keyboard.KeyCodes.SPACE
					});

					const onMoveKeyDown = () => {
						if (this.playerState.isCrouching || !this.playerState.onGround) return;

						walkFrame = (walkFrame + 1) % walkFrames.length;
						this.player.setTexture(walkFrames[walkFrame]);
						startWalkAnimation(this);
					};

					this.cursors.left.on('down', onMoveKeyDown);
					this.cursors.right.on('down', onMoveKeyDown);
					this.wasd.left.on('down', onMoveKeyDown);
					this.wasd.right.on('down', onMoveKeyDown);
				},
				update(_, deltaMs) {
					if (!this.player || !this.cursors || !this.wasd || levelComplete) return;

					const dt = Math.min(deltaMs / 1000, 1 / 30);
					const state = this.playerState;
					const previousOnGround = state.onGround;
					const moveLeft = this.cursors.left.isDown || this.wasd.left.isDown;
					const moveRight = this.cursors.right.isDown || this.wasd.right.isDown;
					const crouchPressed = this.cursors.down.isDown || this.wasd.down.isDown;
					const jumpPressed = this.cursors.up.isDown || this.wasd.up.isDown;

					if (crouchPressed && previousOnGround) {
						setCrouchState(this, true);
					} else if (state.isCrouching) {
						setCrouchState(this, false);
					}

					if (moveLeft) {
						state.vx = state.isCrouching ? 0 : -MOVE_SPEED;
						state.facingLeft = true;
					} else if (moveRight) {
						state.vx = state.isCrouching ? 0 : MOVE_SPEED;
						state.facingLeft = false;
					} else {
						state.vx = 0;
					}

					if (jumpPressed && previousOnGround && !state.isCrouching) {
						state.vy = -JUMP_SPEED;
						state.onGround = false;
						if (jumpAudio) {
							jumpAudio.currentTime = 0;
							jumpAudio.play();
						}
					}

					resolveHorizontalMovement(this, dt);
					resolveVerticalMovement(this, dt, previousOnGround);
					handleWorldBounds(this);
					handleTriggers(this);				handleShooting(this, dt);
				updateBullets(this, dt);					updateEnemies(this, dt);
					syncPlayerSprite(this);
					updatePlayerTexture(this, (moveLeft || moveRight) && !state.isCrouching);
				}
			}
		};

		game = new Phaser.Game(config);
	}

	function getPlayerBounds(scene) {
		return getRectBounds(scene.playerState);
	}

	function resolveHorizontalMovement(scene, dt) {
		const state = scene.playerState;
		state.x += state.vx * dt;

		let playerBounds = getPlayerBounds(scene);

		for (const solid of scene.solids) {
			const solidBounds = getRectBounds(solid);

			if (!intersects(playerBounds, solidBounds)) continue;

			if (state.vx > 0) {
				state.x = solidBounds.left - state.width / 2;
			} else if (state.vx < 0) {
				state.x = solidBounds.right + state.width / 2;
			}

			state.vx = 0;
			playerBounds = getPlayerBounds(scene);
		}
	}

	function resolveVerticalMovement(scene, dt, previousOnGround) {
		const state = scene.playerState;
		state.vy += GRAVITY * dt;
		state.y += state.vy * dt;
		state.onGround = false;

		let playerBounds = getPlayerBounds(scene);

		for (const solid of scene.solids) {
			const solidBounds = getRectBounds(solid);

			if (!intersects(playerBounds, solidBounds)) continue;

			if (state.vy > 0) {
				state.y = solidBounds.top - state.height / 2;
				state.vy = 0;
				state.onGround = true;
				if (landAudio && !previousOnGround) {
					landAudio.currentTime = 0;
					landAudio.play();
				}
			} else if (state.vy < 0) {
				state.y = solidBounds.bottom + state.height / 2;
				state.vy = 0;
			}

			playerBounds = getPlayerBounds(scene);
		}
	}

	function handleWorldBounds(scene) {
		const state = scene.playerState;
		const levelWorldWidth = scene.levelWorldWidth ?? WORLD_WIDTH;
		const halfWidth = state.width / 2;
		const halfHeight = state.height / 2;

		if (state.x - halfWidth < 0) {
			state.x = halfWidth;
			state.vx = 0;
		}

		if (state.x + halfWidth > levelWorldWidth) {
			state.x = levelWorldWidth - halfWidth;
			state.vx = 0;
		}

		if (state.y - halfHeight < 0) {
			state.y = halfHeight;
			state.vy = 0;
		}

		if (state.y - halfHeight > WORLD_HEIGHT) {
			respawnPlayer(scene);
		}
	}

	function handleTriggers(scene) {
		const playerBounds = getPlayerBounds(scene);

		for (const hazard of scene.hazards) {
			if (intersects(playerBounds, getRectBounds(hazard))) {
				respawnPlayer(scene);
				return;
			}
		}

		for (const collectable of scene.collectables) {
			if (!collectable.collected && intersects(playerBounds, getRectBounds(collectable))) {
				collectable.collected = true;
				collectable.visual.destroy();
				collectedItems.push(collectable.type);
			}
		}

		if (scene.checkpoint && intersects(playerBounds, getRectBounds(scene.checkpoint))) {
			scene.respawnX = scene.checkpoint.x;
			scene.respawnY = scene.checkpoint.y - PLAYER_HITBOX_HEIGHT / 2;
			scene.checkpointReached = true;
		}

		if (scene.finish && intersects(playerBounds, getRectBounds(scene.finish))) {
			levelComplete = true;
			scene.playerState.vx = 0;
			scene.playerState.vy = 0;
			scene.add.text(265, 60, `${levelConfigs[level].label} Complete!`, {
				fontSize: '32px',
				color: '#1b4332'
			});
		}
	}

	function updateEnemies(scene, dt) {
		if (!scene.enemies) return;

		const state = scene.playerState;
		const enemyWalkFrames = ['enemy_moving', 'enemy_standing', 'enemy_moving1', 'enemy_standing'];
		const levelWorldWidth = scene.levelWorldWidth ?? WORLD_WIDTH;

		for (const enemy of scene.enemies) {
			const previousX = enemy.x;

			// Handle patrol or chase behavior
			if (enemy.patrolLeft !== undefined && enemy.patrolRight !== undefined) {
				// Patrol behavior: move between boundaries
				if (enemy.patrolDirection > 0) {
					enemy.x += enemy.speed * dt;
					enemy.visual.setFlipX(false);

					if (enemy.x >= enemy.patrolRight) {
						enemy.x = enemy.patrolRight;
						enemy.patrolDirection = -1;
					}
				} else {
					enemy.x -= enemy.speed * dt;
					enemy.visual.setFlipX(true);

					if (enemy.x <= enemy.patrolLeft) {
						enemy.x = enemy.patrolLeft;
						enemy.patrolDirection = 1;
					}
				}
			} else {
				// Chase behavior (original): follow the player
				const dx = state.x - enemy.x;
				const deadZone = 10;

				if (dx > deadZone) {
					enemy.x += enemy.speed * dt;
					enemy.visual.setFlipX(false);
				} else if (dx < -deadZone) {
					enemy.x -= enemy.speed * dt;
					enemy.visual.setFlipX(true);
				}
			}

			for (const solid of scene.solids) {
				if (solid.width >= levelWorldWidth) continue;

				const solidBounds = getRectBounds(solid);
				const enemyBounds = getRectBounds(enemy);

				if (!intersects(enemyBounds, solidBounds)) continue;

				if (enemy.x > previousX) {
					enemy.x = solidBounds.left - enemy.width / 2;
				} else if (enemy.x < previousX) {
					enemy.x = solidBounds.right + enemy.width / 2;
				}
			}

			enemy.x = Math.max(enemy.width / 2, Math.min(levelWorldWidth - enemy.width / 2, enemy.x));

			enemy.walkTimer += dt * 1000;

			if (enemy.walkTimer >= 150) {
				enemy.walkTimer = 0;
				enemy.walkFrame = (enemy.walkFrame + 1) % enemyWalkFrames.length;
				enemy.visual.setTexture(enemyWalkFrames[enemy.walkFrame]);
			}

			enemy.visual.setPosition(enemy.x, enemy.y);

			if (enemy.hitCooldown > 0) {
				enemy.hitCooldown -= dt;
				return;
			}

			const enemyBounds = getRectBounds(enemy);
			const playerBounds = getPlayerBounds(scene);

			if (intersects(playerBounds, enemyBounds)) {
				lives -= 1;
				enemy.hitCooldown = 1.5;

				const heartsMap = { 3: '❤️ ❤️ ❤️', 2: '❤️ ❤️', 1: '❤️', 0: '' };
				if (scene.livesText) {
					scene.livesText.setText(heartsMap[Math.max(lives, 0)] ?? '');
				}

				if (lives <= 0) {
					lives = 3;
					if (scene.livesText) scene.livesText.setText('❤️ ❤️ ❤️');
					respawnPlayer(scene);
				} else {
					respawnPlayer(scene);
				}

				return;
			}
		}
	}

	function handleShooting(scene, dt) {
		if (!scene.wasd || collectedItems.length === 0) return;

		scene.lastShotTime += dt;

		if (scene.wasd.space.isDown && scene.lastShotTime >= scene.shootCooldown) {
			const state = scene.playerState;
			const bulletX = state.x + (state.facingLeft ? -20 : 20);
			const bulletVx = state.facingLeft ? -BULLET_SPEED : BULLET_SPEED;

			scene.bullets.push({
				x: bulletX,
				y: state.y - 10,
				vx: bulletVx,
				width: 12,
				height: 6,
				visual: scene.add.rectangle(bulletX, state.y - 10, 12, 6, 0xffff00)
			});

			scene.lastShotTime = 0;

			if (shootAudio) {
				shootAudio.currentTime = 0;
				shootAudio.play();
			}
		}
	}

	function updateBullets(scene, dt) {
		if (!scene.bullets) return;

		const levelWorldWidth = scene.levelWorldWidth ?? WORLD_WIDTH;

		for (let i = scene.bullets.length - 1; i >= 0; i--) {
			const bullet = scene.bullets[i];
			bullet.x += bullet.vx * dt;
			bullet.visual.setPosition(bullet.x, bullet.y);

			// Remove bullet if out of bounds
			if (bullet.x < 0 || bullet.x > levelWorldWidth) {
				bullet.visual.destroy();
				scene.bullets.splice(i, 1);
				continue;
			}

			// Check collision with enemies
			const bulletBounds = getRectBounds(bullet);

			for (let j = scene.enemies.length - 1; j >= 0; j--) {
				const enemy = scene.enemies[j];
				const enemyBounds = getRectBounds(enemy);

				if (intersects(bulletBounds, enemyBounds)) {
					// Remove bullet
					bullet.visual.destroy();
					scene.bullets.splice(i, 1);

					// Remove enemy
					enemy.visual.destroy();
					scene.enemies.splice(j, 1);
					break;
				}
			}
		}
	}

	function respawnPlayer(scene) {
		scene.playerState.x = scene.respawnX;
		scene.playerState.y = scene.respawnY;
		scene.playerState.vx = 0;
		scene.playerState.vy = 0;
		scene.playerState.onGround = false;
		scene.playerState.isCrouching = false;
		stopWalkAnimation(scene);

		// Clear bullets
		for (const bullet of scene.bullets) {
			bullet.visual.destroy();
		}
		scene.bullets = [];

		const levelData = levelConfigs[level];
		
		// Reset enemies (recreate ones that were destroyed)
		const existingEnemies = scene.enemies.length;
		(levelData.enemies || []).forEach((enemyData, i) => {
			if (scene.enemies[i]) {
				// Reset existing enemy
				scene.enemies[i].x = enemyData.x;
				scene.enemies[i].y = enemyData.y;
				scene.enemies[i].hitCooldown = 0;
				scene.enemies[i].patrolDirection = 1;
				scene.enemies[i].visual.setPosition(enemyData.x, enemyData.y);
			} else {
				// Recreate destroyed enemy
				const enemy = scene.add.sprite(enemyData.x, enemyData.y, 'enemy_standing');
				enemy.setOrigin(0.5, 0.5);
				enemy.setDisplaySize(enemyData.width, enemyData.height);

				scene.enemies[i] = {
					x: enemyData.x,
					y: enemyData.y,
					width: enemyData.width,
					height: enemyData.height,
					visual: enemy,
					speed: 60,
					hitCooldown: 0,
					walkFrame: 0,
					walkTimer: 0,
					patrolLeft: enemyData.patrolLeft,
					patrolRight: enemyData.patrolRight,
					patrolDirection: 1
				};
			}
		});

		// Reset uncollected items on respawn
		(levelData.collectables || []).forEach((collectableData, i) => {
			if (scene.collectables[i] && !scene.collectables[i].collected) {
				return;
			}

			if (scene.collectables[i]) {
				scene.collectables[i].visual.destroy();
			}

			if (!scene.collectables[i] && collectableData) {
				const collectable = scene.add.rectangle(
					collectableData.x,
					collectableData.y,
					collectableData.width,
					collectableData.height,
					collectableData.color
				);

				scene.collectables[i] = {
					x: collectableData.x,
					y: collectableData.y,
					width: collectableData.width,
					height: collectableData.height,
					type: collectableData.type,
					visual: collectable,
					collected: false
				};
			}
		});
	}

	function syncPlayerSprite(scene) {
		scene.player.setPosition(scene.playerState.x, scene.playerState.y);
		scene.player.setFlipX(scene.playerState.facingLeft);
	}

	function updatePlayerTexture(scene, isMoving) {
		const state = scene.playerState;

		if (!state.onGround) {
			if (state.isCrouching) {
				setCrouchState(scene, false);
			}

			stopRunningSound();
			stopWalkAnimation(scene, false);
			scene.player.setTexture('jumping_pose1');
		} else if (state.isCrouching) {
			stopRunningSound();
			stopWalkAnimation(scene, false);
			scene.player.setTexture('crouching_pose1');
		} else if (isMoving) {
			startRunningSound();
			startWalkAnimation(scene);
		} else {
			stopRunningSound();
			stopWalkAnimation(scene);
		}
	}
</script>

<div class="game-shell">
	<div id={"game-container-" + level} class="game-container"></div>
	<div class="collectables-display">
		<div class="display-row">
			<div>
				<p class="collectables-label">Weapons:</p>
				<div class="collectables-list">
					{#each collectedItems as item (item)}
						<span class="collectable-item gun-item">🔫</span>
					{/each}
					{#if collectedItems.length === 0}
						<span class="collectable-empty">None</span>
					{/if}
				</div>
			</div>
			{#if collectedItems.length > 0}
				<div class="shoot-info">
					<p class="shoot-label">PRESS SPACE TO SHOOT</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.game-shell {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.game-container {
		width: min(100%, 800px);
		min-height: 600px;
		overflow: hidden;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
	}

	:global(.game-container canvas) {
		display: block;
		width: 100%;
		height: auto;
	}

	.collectables-display {
		width: min(100%, 800px);
		padding: 12px 16px;
		background: rgba(0, 0, 0, 0.8);
		border: 2px solid #fbbf24;
		border-radius: 4px;
		font-family: 'Press Start 2P', monospace;
		font-size: 0.75rem;
		color: #fbbf24;
	}

	.display-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
	}

	.collectables-label {
		margin: 0 0 8px 0;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.collectables-list {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
		min-height: 24px;
	}

	.collectable-item {
		font-size: 1.5rem;
		display: inline-block;
	}

	.collectable-empty {
		color: #888;
		font-size: 0.75rem;
	}

	.shoot-info {
		text-align: right;
	}

	.shoot-label {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.65rem;
		color: #ff6b6b;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	@media (max-width: 720px) {
		.game-container {
			min-height: auto;
		}

		.collectables-display {
			width: 100%;
		}
	}
</style>
