<script>
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
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
	const SHOOT_COOLDOWN = 0.4;

	let PhaserLib;
	let game;
	let activeScene = null;
	let levelComplete = $state(false);
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
	let shootingTimeout = null;
	const walkFrames = ['walking_pose1', 'standing_pose1', 'walking_pose2', 'standing_pose1'];
	const levelGuides = {
		1: [
			`Professor Leka: Welcome to Level 1. Watch your step - the ground is not always what it seems.`,
			`Professor Leka: Avoid the zombies patrolling the street. Collect the weapons you find along the way.`,
			`Professor Leka: Reach the end of the street to escape. Good luck - you will need it.`
		],
		2: [
			`Professor Leka: Level 2 is more vertical. Time your jumps carefully.`,
			`Professor Leka: Stay away from the hazards and use the platforms to climb higher.`,
			`Professor Leka: If you lose all three lives the level restarts. Reach the top to escape.`
		]
	};

	let guideText = $state('');
	let guideMessageIndex = $state(0);
	let guidePortraitSrc = $state('/charachters/explainer/explainer_pose1.png');
	let guideVisible = $state(true);
	let guideCanDismiss = $state(false);
	let guideTypingTimeouts = [];
	let gameContainer;

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

	onDestroy(() => {
		clearGuideTyping();
		if (shootingTimeout) {
			clearTimeout(shootingTimeout);
			shootingTimeout = null;
		}

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
			x,
			y,
			baseY,
			width,
			height,
			type,
			visual,
			glow,
			outline,
			prompt,
			floatTween,
			collected: false
		};
	}

	function intersects(a, b) {
		return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
	}

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
					this.load.image('gun_item', '/guns/gun.png');
					this.load.image('enemy_standing', '/charachters/enemy/pjeter/enemy_standing.png');
					this.load.image('enemy_moving', '/charachters/enemy/pjeter/enemy_moving.png');
					this.load.image('enemy_moving1', '/charachters/enemy/pjeter/enemy_moving1.png');
					this.load.image('standing_pose1', '/charachters/eni/standing_pose1.png');
					this.load.image('walking_pose1', '/charachters/eni/walking_pose1.png');
					this.load.image('walking_pose2', '/charachters/eni/walking_pose2.png');
					this.load.image('jumping_pose1', '/charachters/eni/jumping_pose1.png');
					this.load.image('crouching_pose1', '/charachters/eni/crouching_pose1.png');
					this.load.image('shooting_pose', '/charachters/eni/shooting_pose.png');
				},
				create() {
					levelComplete = false;
					gameOver = false;
					activeScene = this;
					lives = 3;
					ammo = 0;
					this.levelWorldWidth = LEVEL_WORLD_WIDTH;
					this.bullets = [];
					this.lastShotTime = 0;

					if (level === 1) {
						this.add.image(LEVEL_WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'long_background');
					} else {
						this.add.image(LEVEL_WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'sky');
					}

					this.solids = [];
					this.hazards = [];
					this.checkpointReached = false;
					this.gameOverText = null;

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
					this.ammoText = this.add
						.text(16, 48, '🔫 Ammo: 0', {
							fontSize: '14px',
							color: '#ffff00',
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
				update(_, deltaMs) {
					if (!this.player || !this.cursors || !this.wasd || levelComplete || gameOver) return;

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
					updateCollectablePrompts(this);
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

		if (scene.finish && intersects(playerBounds, getRectBounds(scene.finish)) && scene.playerState.isCrouching) {
			levelComplete = true;
			scene.playerState.vx = 0;
			scene.playerState.vy = 0;
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(`level-${level}-complete`, 'true');
			}
		}
	}

	function showGameOver(scene) {
		if (scene.gameOverText) {
			scene.gameOverText.destroy();
		}

		scene.gameOverText = scene.add
			.text(VIEWPORT_WIDTH / 2, 140, 'GAME OVER', {
				fontSize: '36px',
				color: '#ef4444',
				fontFamily: 'Press Start 2P',
				stroke: '#000000',
				strokeThickness: 6
			})
			.setOrigin(0.5)
			.setScrollFactor(0);
	}

	function resetLevel(scene) {
		const levelData = levelConfigs[level];

		gameOver = false;
		levelComplete = false;
		lives = 3;
		ammo = 0;
		if (scene.ammoText) {
			scene.ammoText.setText('🔫 Ammo: 0');
		}

		if (scene.livesText) {
			scene.livesText.setText('â¤ï¸ â¤ï¸ â¤ï¸');
		}

		if (scene.gameOverText) {
			scene.gameOverText.destroy();
			scene.gameOverText = null;
		}

		scene.respawnX = levelData.respawn.x;
		scene.respawnY = levelData.respawn.y;
		scene.checkpointReached = false;
		scene.lastShotTime = 0;

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

		respawnPlayer(scene);
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
				continue;
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

	function handleShooting(scene, dt) {
		if (!scene.wasd) return;

		scene.lastShotTime += dt;

		if (scene.wasd.space.isDown && scene.lastShotTime >= SHOOT_COOLDOWN && ammo > 0) {
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

			ammo -= 1;
			if (scene.ammoText) {
				scene.ammoText.setText(`🔫 Ammo: ${ammo}`);
			}
			isShooting = true;
			if (shootingTimeout) clearTimeout(shootingTimeout);
			shootingTimeout = setTimeout(() => {
				isShooting = false;
				shootingTimeout = null;
			}, 300);
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
				scene.collectables[i] = createCollectable(scene, collectableData);
			}
		});
	}

	function syncPlayerSprite(scene) {
		scene.player.setPosition(scene.playerState.x, scene.playerState.y);
		scene.player.setFlipX(scene.playerState.facingLeft);
	}

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
			<img src={guidePortraitSrc} alt="Professor Leka" class="portrait-img" />
			<div class="guide-box">
				<p class="guide-name">Professor Leka</p>
				<p class="guide-copy">{guideText}</p>
				{#if guideCanDismiss}
					<p class="guide-prompt">Click to continue</p>
				{/if}
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


