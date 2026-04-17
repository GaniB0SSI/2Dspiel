<script>
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { levelConfigs } from '$lib/game/levels';

	let { level = 1 } = $props();

	// --- GAME CONSTANTS ---
	// Tweak these to adjust feel and difficulty
	const WORLD_WIDTH = 1900;
	const WORLD_HEIGHT = 600;
	const VIEWPORT_WIDTH = 800;
	const GRAVITY = 1500;          // Higher = falls faster
	const MOVE_SPEED = 220;        // Player horizontal speed
	const JUMP_SPEED = 560;        // Higher = jumps higher
	const WALK_ANIMATION_SPEED = 150;
	const PLAYER_DISPLAY_WIDTH = 64;
	const PLAYER_DISPLAY_HEIGHT = 102;
	const PLAYER_HITBOX_WIDTH = 38;
	const PLAYER_HITBOX_HEIGHT = 90;
	const PLAYER_CROUCH_HITBOX_HEIGHT = 54;
	const BULLET_SPEED = 600;      // How fast player bullets travel
	const SHOOT_COOLDOWN = 0.4;    // Seconds between each player shot
	const BOSS_PROJECTILE_SPEED = 220;    // How fast Paul's blubber travels
	const BOSS_PROJECTILE_COOLDOWN = 4.5; // Seconds between each of Paul's shots

	let PhaserLib;
	let game;
	let activeScene = null;
	let levelComplete = $state(false);
	let bossDefeated = $state(false);
	let gameOver = false;
	let gameOverResetTimeout = null;
	let walkFrame = 0;
	let walkInterval = null;
	let backgroundAudio = null;
	let jumpAudio = null;
	let landAudio = null;
	let runningSoundAudio = null;
	let shootAudio = null;
	let lives = $state(3);
	let ammo = $state(0);
	let isShooting = false;
	let shootingLock = false;
	let shootingTimeout = null;
	const walkFrames = ['walking_pose1', 'standing_pose1', 'walking_pose2', 'standing_pose1'];

		// --- GUIDE MESSAGES ---
		// Text shown by Professor Daniel at the start of each level
	const levelGuides = {
		1: [
			`Professor Daniel: Welcome to Level 1. Watch your step - the ground is not always what it seems.`,
			`Professor Daniel: Avoid the zombies patrolling the street. Collect the weapons you find along the way.`,
			`Professor Daniel: Reach the end of the street to escape. Good luck - you will need it.`
		],
		2: [
			`Professor Daniel: Paulin is waiting at the end of Level 2. He is fast, strong, and will not go down easily.`,
			`Professor Daniel: He fires pink blubber at two heights. Jump over the low shots and crouch under the high ones.`,
			`Professor Daniel: Shoot Paulin 10 times to defeat him. Beat the boss to win the game.`
		]
	};

	let guideText = $state('');
	let guideMessageIndex = $state(0);
	let guidePortraitSrc = $state('/charachters/explainer/explainer_pose1.png');
	let guideVisible = $state(true);
	let guideCanDismiss = $state(false);
	let guideTypingTimeouts = [];
	let gameContainer;

	// --- LIFECYCLE ---
	// Runs when the component mounts: loads Phaser, sets up audio, starts the game
	onMount(async () => {
		startGuide();
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
		requestAnimationFrame(() => {
			if (gameContainer) gameContainer.focus();
		});
	});

	// Runs when the component is destroyed: cleans up audio, timers, and Phaser
	onDestroy(() => {
		clearGuideTyping();
		if (shootingTimeout) {
			clearTimeout(shootingTimeout);
			shootingTimeout = null;
		}
		shootingLock = false;

		if (gameOverResetTimeout) {
			clearTimeout(gameOverResetTimeout);
			gameOverResetTimeout = null;
		}

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

	function clearGuideTyping() {
		for (const timeoutId of guideTypingTimeouts) {
			clearTimeout(timeoutId);
		}
		guideTypingTimeouts = [];
	}

	// --- GUIDE SYSTEM ---
	// Starts the typing animation for the professor's intro messages
	function startGuide() {
		const messages = levelGuides[level];
		if (!messages || messages.length === 0) {
			guideVisible = false;
			return;
		}

		guideMessageIndex = 0;
		guidePortraitSrc = `/charachters/explainer/explainer_pose${1}.png`;
		guideVisible = true;
		guideCanDismiss = false;
		typeMessage(messages[0]);
	}

	// Types out a message character by character (typewriter effect)
	function typeMessage(message) {
		clearGuideTyping();
		guideText = '';
		guideCanDismiss = false;

		Array.from(message).forEach((character, index, characters) => {
			const timeoutId = setTimeout(() => {
				guideText += character;
				if (index === characters.length - 1) {
					guideCanDismiss = true;
				}
			}, index * 18);

			guideTypingTimeouts = [...guideTypingTimeouts, timeoutId];
		});
	}

	// Advances to the next guide message or hides the guide when done
	function dismissGuide() {
		if (!guideCanDismiss) return;

		const messages = levelGuides[level];
		const nextIndex = guideMessageIndex + 1;

		if (nextIndex < messages.length) {
			guideMessageIndex = nextIndex;
			guidePortraitSrc = `/charachters/explainer/explainer_pose${nextIndex + 1}.png`;
			typeMessage(messages[nextIndex]);
		} else {
			guideVisible = false;
		}
	}

	function focusGame() {
		if (gameContainer) gameContainer.focus();
	}

	function handleRetry() {
		if (!activeScene) return;
		resetLevel(activeScene);
	}

	function handleMenu() {
		goto('/');
	}

	function handleNextLevel() {
		const target = level === 1 ? '/loading?level=2' : '/';
		goto(target);
	}

	function handleBossDefeatedContinue() {
		if (!activeScene) return;
		bossDefeated = false;
		completeLevel(activeScene);
	}

	function stopRunningSound() {
		if (!runningSoundAudio) return;
		runningSoundAudio.pause();
		runningSoundAudio.currentTime = 0;
	}

	// Cycles through walk frame textures on an interval to animate the player
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

	// Switches the player between standing and crouching texture/state
	function setCrouchState(scene, shouldCrouch) {
		const state = scene.playerState;
		if (shouldCrouch === state.isCrouching) return;

		if (shouldCrouch) {
			const feetY = state.y + state.height / 2;
			state.isCrouching = true;
			state.height = PLAYER_CROUCH_HITBOX_HEIGHT;
			state.y = feetY - state.height / 2;
			stopWalkAnimation(scene, false);
			scene.player.setTexture('crouching_pose1');
		} else {
			const feetY = state.y + state.height / 2;
			const nextHeight = PLAYER_HITBOX_HEIGHT;
			const nextY = feetY - nextHeight / 2;
			const nextBounds = {
				left: state.x - state.width / 2,
				right: state.x + state.width / 2,
				top: nextY - nextHeight / 2,
				bottom: nextY + nextHeight / 2
			};

			for (const solid of scene.solids ?? []) {
				if (!intersects(nextBounds, getRectBounds(solid))) continue;
				return;
			}

			state.isCrouching = false;
			state.height = nextHeight;
			state.y = nextY;
			scene.player.setTexture('standing_pose1');
		}
	}

	// Returns the bounding box of any entity (used for collision detection)
	function getRectBounds(entity) {
		return {
			left: entity.x - entity.width / 2,
			right: entity.x + entity.width / 2,
			top: entity.y - entity.height / 2,
			bottom: entity.y + entity.height / 2
		};
	}

	// --- COLLECTABLE CREATION ---
	// Creates a gun pickup with glow, outline, floating tween, and pickup prompt
	function createCollectable(scene, collectableData) {
		const { x, y, width, height, type, color } = collectableData;
		let visual;
		let glow = null;
		let outline = null;
		let prompt = null;
		let floatTween = null;
		const baseY = y;

		if (type === 'gun') {
			glow = scene.add.circle(x, y, Math.max(width, height) * 0.75, 0xffcc66, 0.18);
			outline = scene.add.image(x, y, 'gun_item');
			outline.setDisplaySize(width * 1.1, height * 1.1);
			outline.setTint(0x0b1021);
			outline.setAlpha(0.7);

			visual = scene.add.image(x, y, 'gun_item');
			visual.setDisplaySize(width * 1.8, height * 1.8);

			prompt = scene.add
				.text(x, y - height * 2.0, 'Press E to pick up', {
					fontSize: '12px',
					color: '#f8d66d',
					fontFamily: 'Press Start 2P',
					backgroundColor: 'rgba(10, 12, 18, 0.75)',
					padding: { x: 6, y: 4 }
				})
				.setOrigin(0.5)
				.setAlpha(0);

			floatTween = scene.tweens.add({
				targets: [visual, outline, glow],
				y: baseY - 10,
				duration: 1400,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.inOut'
			});
		} else {
			visual = scene.add.rectangle(x, y, width, height, color);
		}

		return {
			x, y, baseY, width, height, type,
			visual, glow, outline, prompt, floatTween,
			collected: false
		};
	}

	// --- ENEMY CREATION ---
	// Creates a regular enemy or the boss (Paul) based on enemyData.type
	function createEnemy(scene, enemyData) {
		const isBoss = enemyData.type === 'boss';
		const textureKey = isBoss ? 'enemy_paul_standing' : 'enemy_standing';

		const enemy = scene.add.sprite(enemyData.x, enemyData.y, textureKey);
		enemy.setOrigin(0.5, 0.5);
		enemy.setDisplaySize(enemyData.width, enemyData.height);

		return {
			type: enemyData.type ?? 'enemy',
			name: enemyData.name ?? (isBoss ? 'Boss' : 'Enemy'),
			x: enemyData.x,
			y: enemyData.y,
			width: enemyData.width,
			height: enemyData.height,
			visual: enemy,
			speed: enemyData.speed ?? (isBoss ? 150 : 60),
			hitCooldown: 0,
			walkFrame: 0,
			walkTimer: 0,
			patrolLeft: enemyData.patrolLeft,
			patrolRight: enemyData.patrolRight,
			patrolDirection: 1,
			health: enemyData.health ?? 1,
			maxHealth: enemyData.health ?? 1,
			projectileCooldown: enemyData.projectileCooldown ?? BOSS_PROJECTILE_COOLDOWN,
			projectileTimer: 0,
			textureStanding: textureKey,
			textureMoving: isBoss ? 'enemy_paul_walking' : 'enemy_moving',
			textureMovingAlt: isBoss ? 'enemy_paul_standing' : 'enemy_moving1',
			isBoss
		};
	}

	// --- BOSS PROJECTILE ---
	// Creates a single blubber shot fired by Paul toward the player.
	// highShot = true fires at head height, false fires lower.
	// Adjust projectileY values to change shot heights.
	function createBossProjectile(scene, boss) {
		const highShot = Math.random() > 0.5;
		const direction = scene.playerState.x < boss.x ? -1 : 1;
		const width = 34;
		const height = highShot ? 26 : 20;
		const projectileY = boss.y + (highShot ? -60 : -17); // negative = higher, positive = lower
		const projectileX = boss.x + direction * 56;
		const visual = scene.add.ellipse(projectileX, projectileY, width, height, 0xff4fd8, 0.95);
		visual.setStrokeStyle(3, 0xffb5f2, 0.9);

		return {
			x: projectileX,
			y: projectileY,
			vx: direction * BOSS_PROJECTILE_SPEED,
			width,
			height,
			visual,
			mode: highShot ? 'high' : 'low'
		};
	}

	// Simple AABB collision check between two bounding boxes
	function intersects(a, b) {
		return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
	}

	// Shows/hides the "Press E to pick up" prompt based on player proximity
	function updateCollectablePrompts(scene) {
		if (!scene.collectables || !scene.playerState) return;

		const state = scene.playerState;
		for (const collectable of scene.collectables) {
			if (!collectable.prompt || collectable.collected) continue;

			const dx = state.x - collectable.x;
			const dy = state.y - collectable.y;
			const distance = Math.hypot(dx, dy);
			const shouldShow = distance < 140;

			if (collectable.prompt.visible !== shouldShow) {
				collectable.prompt.setAlpha(shouldShow ? 1 : 0);
			}

			collectable.prompt.setPosition(collectable.visual.x, collectable.visual.y - collectable.height * 2.0);
		}
	}

	// --- MAIN GAME SETUP ---
	// Initializes the Phaser game instance with preload, create, and update hooks
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
				// Preload: loads all images and assets before the game starts
				preload() {
					if (level === 1) {
						this.load.image('long_background', '/long_background.png');
					} else if (level === 2) {
						this.load.image('level2_background', '/level2.png');
					}
					this.load.image('gun_item', '/guns/gun.png');
					this.load.image('enemy_standing', '/charachters/enemy/pjeter/enemy_standing.png');
					this.load.image('enemy_moving', '/charachters/enemy/pjeter/enemy_moving.png');
					this.load.image('enemy_moving1', '/charachters/enemy/pjeter/enemy_moving1.png');
					this.load.image('enemy_paul_standing', '/charachters/enemy/paul/enemy_paul_standing.png');
					this.load.image('enemy_paul_walking', '/charachters/enemy/paul/enemy_paul_walking.png');
					this.load.image('standing_pose1', '/charachters/eni/standing_pose1.png');
					this.load.image('walking_pose1', '/charachters/eni/walking_pose1.png');
					this.load.image('walking_pose2', '/charachters/eni/walking_pose2.png');
					this.load.image('jumping_pose1', '/charachters/eni/jumping_pose1.png');
					this.load.image('crouching_pose1', '/charachters/eni/crouching_pose1.png');
					this.load.image('shooting_pose', '/charachters/eni/shooting_pose.png');
				},
				// Create: builds the level — background, floor, platforms, enemies, player, HUD
				create() {
					levelComplete = false;
					bossDefeated = false;
					gameOver = false;
					activeScene = this;
					lives = 3;
					ammo = 0;
					this.levelWorldWidth = LEVEL_WORLD_WIDTH;
					this.bullets = [];
					this.enemyProjectiles = [];
					this.lastShotTime = 0;

					if (level === 1) {
						this.add.image(LEVEL_WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'long_background');
					} else if (level === 2) {
						this.add
							.image(LEVEL_WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'level2_background')
							.setDisplaySize(LEVEL_WORLD_WIDTH, WORLD_HEIGHT);
					}

					this.solids = [];
					this.hazards = [];
					this.checkpointReached = false;
					this.gameOverText = null;
					this.bossText = null;

					// Floor Y position per level — increase number to lower the floor
					const floorY = level === 1 ? 600 : 590;
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
						this.enemies.push(createEnemy(this, enemyData));
					});

					// HUD elements — lives, ammo, boss health
					this.livesText = this.add
						.text(16, 16, '❤️ ❤️ ❤️', {
							fontSize: '20px',
							color: '#ff4444',
							fontFamily: 'Press Start 2P'
						})
						.setScrollFactor(0);
					this.ammoText = this.add
						.text(16, 48, '🔫 Ammo: 0', {
							fontSize: '14px',
							color: '#ffff00',
							fontFamily: 'Press Start 2P'
						})
						.setScrollFactor(0);

					this.bossText = this.add
						.text(16, 80, '', {
							fontSize: '14px',
							color: '#ff7de9',
							fontFamily: 'Press Start 2P'
						})
						.setScrollFactor(0);
					updateBossHud(this);

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
						this.collectables.push(createCollectable(this, collectableData));
					});

					const checkpointData = levelData.checkpoint;
					if (checkpointData) {
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
					} else {
						this.checkpoint = null;
					}

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
						).setAlpha(0)
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
					this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);

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
				// Update: runs every frame — handles input, physics, collisions, and rendering
				update(_, deltaMs) {
					if (!this.player || !this.cursors || !this.wasd || levelComplete || bossDefeated || gameOver) return;

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

					if (!shootingLock) {
						if (moveLeft) {
							state.vx = state.isCrouching ? 0 : -MOVE_SPEED;
							state.facingLeft = true;
						} else if (moveRight) {
							state.vx = state.isCrouching ? 0 : MOVE_SPEED;
							state.facingLeft = false;
						} else {
							state.vx = 0;
						}
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
					handleTriggers(this);
					handleShooting(this, dt);
					updateBullets(this, dt);
					updateEnemies(this, dt);
					updateEnemyProjectiles(this, dt);
					syncPlayerSprite(this);
					updatePlayerTexture(this, (moveLeft || moveRight) && !state.isCrouching);
					updateCollectablePrompts(this);
					updateBossHud(this);
				}
			}
		};

		game = new Phaser.Game(config);
	}

	function getPlayerBounds(scene) {
		return getRectBounds(scene.playerState);
	}

	// Moves the player horizontally and resolves collisions with solid tiles
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

	// Applies gravity, moves the player vertically, and resolves floor/ceiling collisions
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

	// Keeps the player inside the level boundaries; triggers respawn if they fall off
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

	// --- TRIGGERS ---
	// Checks hazards, collectables, checkpoint, and level finish zone every frame
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
				if (collectable.floatTween) collectable.floatTween.stop();
				if (collectable.glow) collectable.glow.destroy();
				if (collectable.outline) collectable.outline.destroy();
				if (collectable.prompt) collectable.prompt.destroy();
				collectable.visual.destroy();
				ammo += 5;
				if (scene.ammoText) {
					scene.ammoText.setText(`🔫 Ammo: ${ammo}`);
				}
			}
		}

		if (scene.checkpoint && intersects(playerBounds, getRectBounds(scene.checkpoint))) {
			scene.respawnX = scene.checkpoint.x;
			scene.respawnY = scene.checkpoint.y - PLAYER_HITBOX_HEIGHT / 2;
			scene.checkpointReached = true;
		}

		if (
			level !== 2 &&
			scene.finish &&
			intersects(playerBounds, getRectBounds(scene.finish)) &&
			scene.playerState.isCrouching
		) {
			completeLevel(scene);
		}
	}

	function getBoss(scene) {
		return scene.enemies?.find((enemy) => enemy.isBoss) ?? null;
	}

	// Updates the boss health display in the top-left HUD
	function updateBossHud(scene) {
		if (!scene?.bossText) return;

		const boss = getBoss(scene);
		if (!boss) {
			scene.bossText.setText(level === 2 && levelComplete ? 'Boss Defeated' : '');
			return;
		}

		scene.bossText.setText(`${boss.name}: ${Math.max(boss.health, 0)}/${boss.maxHealth}`);
	}

	// Marks the level as complete and freezes the player in place
	function completeLevel(scene) {
		levelComplete = true;
		scene.playerState.vx = 0;
		scene.playerState.vy = 0;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(`level-${level}-complete`, 'true');
		}
	}

	// --- DAMAGE & DEATH ---
	// Reduces lives by 1; triggers game over if lives hit 0, otherwise respawns
	function damagePlayer(scene) {
		lives -= 1;

		const heartsMap = { 3: '❤️ ❤️ ❤️', 2: '❤️ ❤️', 1: '❤️', 0: '' };
		if (scene.livesText) {
			scene.livesText.setText(heartsMap[Math.max(lives, 0)] ?? '');
		}

		if (lives <= 0) {
			gameOver = true;
			stopRunningSound();
			stopWalkAnimation(scene);
			scene.playerState.vx = 0;
			scene.playerState.vy = 0;
			showGameOver(scene);

			if (gameOverResetTimeout) {
				clearTimeout(gameOverResetTimeout);
			}

			gameOverResetTimeout = setTimeout(() => {
				gameOverResetTimeout = null;
				goto('/');
			}, 1800);

			return;
		}

		respawnPlayer(scene);
	}

	function showGameOver(scene) {
		if (scene.gameOverText) {
			scene.gameOverText.destroy();
		}

		scene.gameOverText = scene.add
			.text(VIEWPORT_WIDTH / 2, 140, 'GAME OVER', {
				fontSize: '48px',
				color: '#fff8dc',
				fontFamily: 'Press Start 2P, monospace',
				fontStyle: 'bold',
				stroke: '#000000',
				strokeThickness: 5,
				padding: { x: 12, y: 10 }
			})
			.setShadow(4, 4, '#000000', 0, true, true)
			.setOrigin(0.5)
			.setScrollFactor(0);
	}

	// --- LEVEL RESET ---
	// Resets all game state (lives, ammo, enemies, collectables) back to the start
	function resetLevel(scene) {
		const levelData = levelConfigs[level];

		gameOver = false;
		levelComplete = false;
		bossDefeated = false;
		lives = 3;
		ammo = 0;
		if (scene.ammoText) {
			scene.ammoText.setText('🔫 Ammo: 0');
		}

		if (scene.livesText) {
			scene.livesText.setText('❤️ ❤️ ❤️');
		}

		if (scene.gameOverText) {
			scene.gameOverText.destroy();
			scene.gameOverText = null;
		}

		scene.respawnX = levelData.respawn.x;
		scene.respawnY = levelData.respawn.y;
		scene.checkpointReached = false;
		scene.lastShotTime = 0;
		updateBossHud(scene);

		if (scene.collectables) {
			for (const collectable of scene.collectables) {
				if (collectable?.floatTween) collectable.floatTween.stop();
				if (collectable?.glow) collectable.glow.destroy();
				if (collectable?.outline) collectable.outline.destroy();
				if (collectable?.prompt) collectable.prompt.destroy();
				if (collectable?.visual) collectable.visual.destroy();
			}
		}

		scene.collectables = [];
		(levelData.collectables || []).forEach((collectableData) => {
			scene.collectables.push(createCollectable(scene, collectableData));
		});

		if (scene.enemyProjectiles) {
			for (const projectile of scene.enemyProjectiles) {
				projectile.visual.destroy();
			}
			scene.enemyProjectiles = [];
		}

		respawnPlayer(scene);
	}

	// --- ENEMY UPDATE ---
	// Moves enemies each frame (patrol or chase), animates them,
	// fires boss projectiles, and checks contact damage with the player
	function updateEnemies(scene, dt) {
		if (!scene.enemies) return;

		const state = scene.playerState;
		const levelWorldWidth = scene.levelWorldWidth ?? WORLD_WIDTH;

		for (const enemy of scene.enemies) {
			const previousX = enemy.x;

			if (enemy.patrolLeft !== undefined && enemy.patrolRight !== undefined) {
				// Patrol behavior: bounces between patrolLeft and patrolRight
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
				// Chase behavior: follows the player directly
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
			enemy.projectileTimer += dt;

			if (enemy.walkTimer >= 150) {
				enemy.walkTimer = 0;
				if (enemy.isBoss) {
					enemy.visual.setTexture(enemy.walkFrame % 2 === 0 ? enemy.textureMoving : enemy.textureStanding);
					enemy.walkFrame = (enemy.walkFrame + 1) % 2;
				} else {
					const enemyWalkFrames = [
						enemy.textureMoving,
						enemy.textureStanding,
						enemy.textureMovingAlt,
						enemy.textureStanding
					];
					enemy.walkFrame = (enemy.walkFrame + 1) % enemyWalkFrames.length;
					enemy.visual.setTexture(enemyWalkFrames[enemy.walkFrame]);
				}
			}

			enemy.visual.setPosition(enemy.x, enemy.y);

			// Boss fires a projectile when the cooldown timer expires
			if (enemy.isBoss && enemy.projectileTimer >= enemy.projectileCooldown) {
				enemy.projectileTimer = 0;
				scene.enemyProjectiles.push(createBossProjectile(scene, enemy));
			}

			if (enemy.hitCooldown > 0) {
				enemy.hitCooldown -= dt;
				continue;
			}

			const enemyBounds = getRectBounds(enemy);
			const playerBounds = getPlayerBounds(scene);

			if (intersects(playerBounds, enemyBounds)) {
				enemy.hitCooldown = 1.5;
				damagePlayer(scene);
				return;
				lives -= 1;
				enemy.hitCooldown = 1.5;

				const heartsMap = { 3: '❤️ ❤️ ❤️', 2: '❤️ ❤️', 1: '❤️', 0: '' };
				if (scene.livesText) {
					scene.livesText.setText(heartsMap[Math.max(lives, 0)] ?? '');
				}

				if (lives <= 0) {
					gameOver = true;
					stopRunningSound();
					stopWalkAnimation(scene);
					scene.playerState.vx = 0;
					scene.playerState.vy = 0;
					showGameOver(scene);

					if (gameOverResetTimeout) {
						clearTimeout(gameOverResetTimeout);
					}

					gameOverResetTimeout = setTimeout(() => {
						gameOverResetTimeout = null;
						if (!scene.player) return;
						resetLevel(scene);
					}, 1800);

					return;
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

	// --- PLAYER SHOOTING ---
	// Fires a bullet in the direction the player is facing when SPACE is pressed,
	// respecting the shoot cooldown and available ammo
	function handleShooting(scene, dt) {
		if (!scene.wasd) return;

		scene.lastShotTime += dt;

		if (scene.wasd.space.isDown && scene.lastShotTime >= SHOOT_COOLDOWN && ammo > 0) {
			const state = scene.playerState;
			const bulletX = state.x + (state.facingLeft ? -20 : 20);
			const bulletVx = state.facingLeft ? -BULLET_SPEED : BULLET_SPEED;

			scene.bullets.push({
				x: bulletX,
				y: state.y - 10, // Adjust this value to raise/lower bullet spawn height
				vx: bulletVx,
				width: 12,
				height: 6,
				visual: scene.add.rectangle(bulletX, state.y - 10, 12, 6, 0xffff00)
			});

			ammo -= 1;
			if (scene.ammoText) {
				scene.ammoText.setText(`🔫 Ammo: ${ammo}`);
			}
			isShooting = true;
			shootingLock = true;
			if (shootingTimeout) clearTimeout(shootingTimeout);
			shootingTimeout = setTimeout(() => {
				isShooting = false;
				shootingLock = false;
				shootingTimeout = null;
			}, 300);
			scene.lastShotTime = 0;

			if (shootAudio) {
				shootAudio.currentTime = 0;
				shootAudio.play();
			}
		}
	}

	// Moves bullets each frame and checks if they hit an enemy
	function updateBullets(scene, dt) {
		if (!scene.bullets) return;

		const levelWorldWidth = scene.levelWorldWidth ?? WORLD_WIDTH;

		for (let i = scene.bullets.length - 1; i >= 0; i--) {
			const bullet = scene.bullets[i];
			bullet.x += bullet.vx * dt;
			bullet.visual.setPosition(bullet.x, bullet.y);

			// Remove bullet if it travels outside the level
			if (bullet.x < 0 || bullet.x > levelWorldWidth) {
				bullet.visual.destroy();
				scene.bullets.splice(i, 1);
				continue;
			}

			const bulletBounds = getRectBounds(bullet);

			for (let j = scene.enemies.length - 1; j >= 0; j--) {
				const enemy = scene.enemies[j];
				const enemyBounds = getRectBounds(enemy);

				if (intersects(bulletBounds, enemyBounds)) {
					bullet.visual.destroy();
					scene.bullets.splice(i, 1);

					if (enemy.isBoss) {
						// Boss takes 1 damage per hit; dies at 0 health
						enemy.health -= 1;
						enemy.hitCooldown = 0.2;
						updateBossHud(scene);
						if (enemy.health <= 0) {
							enemy.visual.destroy();
							scene.enemies.splice(j, 1);
							updateBossHud(scene);
							if (level === 2) {
								bossDefeated = true;
							}
						}
					} else {
						enemy.visual.destroy();
						scene.enemies.splice(j, 1);
					}
					break;
				}
			}
		}
	}

	// Moves boss projectiles each frame and checks if they hit the player
	function updateEnemyProjectiles(scene, dt) {
		if (!scene.enemyProjectiles) return;

		const levelWorldWidth = scene.levelWorldWidth ?? WORLD_WIDTH;
		const playerBounds = getPlayerBounds(scene);

		for (let i = scene.enemyProjectiles.length - 1; i >= 0; i--) {
			const projectile = scene.enemyProjectiles[i];
			projectile.x += projectile.vx * dt;
			projectile.visual.setPosition(projectile.x, projectile.y);

			if (projectile.x < -80 || projectile.x > levelWorldWidth + 80) {
				projectile.visual.destroy();
				scene.enemyProjectiles.splice(i, 1);
				continue;
			}

			if (intersects(playerBounds, getRectBounds(projectile))) {
				projectile.visual.destroy();
				scene.enemyProjectiles.splice(i, 1);
				damagePlayer(scene);
				return;
			}
		}
	}

	// --- RESPAWN ---
	// Resets the player's position, velocity, and state; also resets enemies and clears bullets
	function respawnPlayer(scene) {
		shootingLock = false;
		isShooting = false;
		if (shootingTimeout) {
			clearTimeout(shootingTimeout);
			shootingTimeout = null;
		}
		scene.playerState.x = scene.respawnX;
		scene.playerState.y = scene.respawnY;
		scene.playerState.vx = 0;
		scene.playerState.vy = 0;
		scene.playerState.onGround = false;
		scene.playerState.isCrouching = false;
		scene.playerState.height = PLAYER_HITBOX_HEIGHT;
		stopWalkAnimation(scene);

		for (const bullet of scene.bullets) {
			bullet.visual.destroy();
		}
		scene.bullets = [];
		for (const projectile of scene.enemyProjectiles || []) {
			projectile.visual.destroy();
		}
		scene.enemyProjectiles = [];

		const levelData = levelConfigs[level];

		(levelData.enemies || []).forEach((enemyData, i) => {
			if (scene.enemies[i]) {
				const enemy = scene.enemies[i];
				enemy.x = enemyData.x;
				enemy.y = enemyData.y;
				enemy.hitCooldown = 0;
				enemy.patrolDirection = 1;
				enemy.walkFrame = 0;
				enemy.walkTimer = 0;
				enemy.projectileTimer = 0;
				enemy.health = enemyData.health ?? enemy.health;
				enemy.maxHealth = enemyData.health ?? enemy.maxHealth;
				enemy.visual.setTexture(enemy.textureStanding);
				enemy.visual.setPosition(enemyData.x, enemyData.y);
			} else {
				scene.enemies[i] = createEnemy(scene, enemyData);
			}
		});
		scene.enemies.length = (levelData.enemies || []).length;
		updateBossHud(scene);

		(levelData.collectables || []).forEach((collectableData, i) => {
			if (scene.collectables[i] && !scene.collectables[i].collected) {
				return;
			}

			if (scene.collectables[i]) {
				scene.collectables[i].visual.destroy();
			}

			if (!scene.collectables[i] && collectableData) {
				scene.collectables[i] = createCollectable(scene, collectableData);
			}
		});
	}

	// Syncs the Phaser sprite position and facing direction to the player state
	function syncPlayerSprite(scene) {
		scene.player.setPosition(scene.playerState.x, scene.playerState.y);
		scene.player.setFlipX(scene.playerState.facingLeft);
	}

	// Chooses the correct player texture based on current state (jumping, crouching, shooting, walking)
	function updatePlayerTexture(scene, isMoving) {
		const state = scene.playerState;

		if (isShooting && state.onGround && !state.isCrouching) {
			stopRunningSound();
			stopWalkAnimation(scene, false);
			scene.player.setTexture('shooting_pose');
			return;
		}

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

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="game-shell" onclick={focusGame}>
	<div class="canvas-wrapper">
		<div id={"game-container-" + level} class="game-container" bind:this={gameContainer} tabindex="0"></div>
		<div
			class:guide-hidden={!guideVisible}
			class="guide-overlay"
			role="button"
			tabindex={guideCanDismiss ? 0 : -1}
			aria-label="Dismiss professor guide"
			aria-disabled={!guideCanDismiss}
			onclick={dismissGuide}
			onkeydown={(event) => {
				if ((event.key === 'Enter' || event.key === ' ') && guideCanDismiss) {
					event.preventDefault();
					dismissGuide();
				}
			}}
		>
			<img src={guidePortraitSrc} alt="professor daniel" class="portrait-img" />
			<div class="guide-box">
				<p class="guide-name">Professor Daniel</p>
				<p class="guide-copy">{guideText}</p>
				{#if guideCanDismiss}
					<p class="guide-prompt">Click to continue</p>
				{/if}
			</div>
		</div>
		<div
			class:guide-hidden={!bossDefeated}
			class="guide-overlay"
			role="button"
			tabindex={bossDefeated ? 0 : -1}
			aria-label="Continue after boss defeat"
			aria-disabled={!bossDefeated}
			onclick={() => {
				bossDefeated = false;
				if (activeScene) completeLevel(activeScene);
			}}
			onkeydown={(event) => {
				if ((event.key === 'Enter' || event.key === ' ') && bossDefeated) {
					event.preventDefault();
					bossDefeated = false;
					if (activeScene) completeLevel(activeScene);
				}
			}}
		>
			<img src="/charachters/explainer/enemy_defeated.png" alt="Enemy defeated" class="portrait-img" />
			<div class="guide-box">
				<p class="guide-name">Professor Paul</p>
				<p class="guide-copy">You did it! Thank you for freeing me from this cursed school.</p>
				<p class="guide-prompt">Click to continue</p>
			</div>
		</div>
	</div>
	<div class:level-complete-visible={levelComplete} class="level-complete-overlay">
		<div class="level-complete-card">
			<p class="level-complete-eyebrow">Level Complete</p>
			<h2>{levelConfigs[level]?.label ?? `Level ${level}`}</h2>
			<p class="level-complete-copy">Great work. Choose what you want to do next.</p>
			<div class="level-complete-actions">
				{#if level === 1}
					<button class="level-button primary" type="button" onclick={handleNextLevel}>
						Next Level
					</button>
				{/if}
				<button class="level-button secondary" type="button" onclick={handleRetry}>
					Play Again
				</button>
				<button class="level-button ghost" type="button" onclick={handleMenu}>
					Menu
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.game-shell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.canvas-wrapper {
		position: relative;
		width: min(100%, 800px);
	}

	.game-container {
		width: 100%;
		min-height: 600px;
		overflow: hidden;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
	}

	:global(.game-container canvas) {
		display: block;
		width: 100%;
		height: auto;
	}

	.level-complete-overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(3, 6, 12, 0.78);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.25s ease;
		z-index: 4;
	}

	.level-complete-visible {
		opacity: 1;
		pointer-events: auto;
	}

	.level-complete-card {
		width: min(90%, 520px);
		padding: 28px 26px;
		border-radius: 8px;
		border: 4px solid #f8d66d;
		background: rgba(8, 12, 22, 0.96);
		box-shadow:
			0 0 0 4px rgba(18, 24, 45, 0.95),
			0 24px 48px rgba(0, 0, 0, 0.45);
		text-align: center;
	}

	.level-complete-eyebrow {
		margin: 0 0 10px;
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #f8d66d;
	}

	.level-complete-card h2 {
		margin: 0;
		font-size: clamp(1.4rem, 4vw, 2.3rem);
		color: #f8fafc;
		text-shadow: 2px 2px 0 #000;
	}

	.level-complete-copy {
		margin: 14px 0 0;
		font-size: 0.72rem;
		line-height: 1.7;
		color: #e5e7eb;
	}

	.level-complete-actions {
		margin-top: 22px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: center;
	}

	.level-button {
		border: 3px solid #0b1021;
		border-radius: 6px;
		padding: 12px 18px;
		font-family: 'Press Start 2P', monospace;
		font-size: 0.65rem;
		text-transform: uppercase;
		cursor: pointer;
		box-shadow:
			inset -3px -3px 0 rgba(0, 0, 0, 0.35),
			inset 3px 3px 0 rgba(255, 255, 255, 0.12);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.level-button:hover {
		transform: translateY(-1px);
		box-shadow:
			inset -3px -3px 0 rgba(0, 0, 0, 0.25),
			inset 3px 3px 0 rgba(255, 255, 255, 0.14);
	}

	.level-button.primary {
		background: #f8d66d;
		color: #101525;
	}

	.level-button.secondary {
		background: #22304f;
		color: #f8fafc;
	}

	.level-button.ghost {
		background: transparent;
		color: #f8d66d;
		border-color: #f8d66d;
	}

	.guide-overlay {
		position: absolute;
		bottom: 16px;
		left: 12px;
		right: 12px;
		z-index: 3;
		display: flex;
		align-items: flex-end;
		gap: 12px;
		opacity: 1;
		transition:
			opacity 0.28s ease,
			transform 0.28s ease;
	}

	.guide-hidden {
		opacity: 0;
		transform: translateY(20px);
		pointer-events: none;
	}

	.portrait-img {
		flex: 0 0 auto;
		width: 120px;
		height: 160px;
		object-fit: cover;
		object-position: top;
		display: block;
		background: none;
		border: none;
		box-shadow: none;
		border-radius: 0;
		align-self: flex-end;
	}

	.guide-box {
		flex: 1;
		padding: 16px 18px;
		border: 4px solid #f8d66d;
		border-radius: 6px;
		background: rgba(8, 12, 22, 0.94);
		box-shadow:
			0 0 0 4px rgba(18, 24, 45, 0.95),
			0 20px 36px rgba(0, 0, 0, 0.35);
	}

	.guide-name,
	.guide-copy,
	.guide-prompt {
		margin: 0;
	}

	.guide-name {
		margin-bottom: 10px;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #f8d66d;
	}

	.guide-copy {
		font-size: 0.68rem;
		line-height: 1.75;
		color: #f8fafc;
		min-height: 4.8em;
	}

	.guide-prompt {
		margin-top: 10px;
		font-size: 0.62rem;
		color: #ff9f1c;
		text-transform: uppercase;
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
		.guide-overlay {
			bottom: 12px;
			left: 8px;
			right: 8px;
		}

		.portrait-img {
			width: 96px;
			height: 132px;
		}

		.guide-box {
			min-height: 124px;
		}

		.game-container {
			min-height: auto;
		}
	}
</style>
