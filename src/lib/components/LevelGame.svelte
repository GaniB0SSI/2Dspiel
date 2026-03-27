<script>
	import { onDestroy, onMount } from 'svelte';
	import { levelConfigs } from '$lib/game/levels';

	let { level = 1 } = $props();

	const WORLD_WIDTH = 800;
	const WORLD_HEIGHT = 600;
	const GRAVITY = 1500;
	const MOVE_SPEED = 220;
	const JUMP_SPEED = 560;
	const WALK_ANIMATION_SPEED = 150;
	const PLAYER_DISPLAY_WIDTH = 64;
	const PLAYER_DISPLAY_HEIGHT = 102;
	const PLAYER_HITBOX_WIDTH = 38;
	const PLAYER_HITBOX_HEIGHT = 90;

	let PhaserLib;
	let game;
	let levelComplete = false;
	let walkFrame = 0;
	let walkInterval = null;

	onMount(async () => {
		PhaserLib = await import('phaser');
		createGame();
	});

	onDestroy(() => {
		stopWalkAnimation();

		if (game) {
			game.destroy(true);
		}
	});

	function startWalkAnimation(scene) {
		if (!scene?.player) return;

		if (!walkInterval) {
			walkFrame = walkFrame === 0 ? 1 : 0;
			scene.player.setTexture(walkFrame === 0 ? 'standing_pose1' : 'walking_pose1');
		}

		if (walkInterval) return;

		walkInterval = setInterval(() => {
			if (!scene.player || levelComplete) return;

			walkFrame = walkFrame === 0 ? 1 : 0;
			scene.player.setTexture(walkFrame === 0 ? 'standing_pose1' : 'walking_pose1');
		}, WALK_ANIMATION_SPEED);
	}

	function stopWalkAnimation(scene) {
		if (walkInterval) {
			clearInterval(walkInterval);
			walkInterval = null;
		}

		walkFrame = 0;

		if (scene?.player) {
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

		if (!levelData) return;

		const config = {
			type: Phaser.AUTO,
			width: WORLD_WIDTH,
			height: WORLD_HEIGHT,
			parent: `game-container-${level}`,
			scene: {
				preload() {
					this.load.image('sky', '/sky.png');
					this.load.image('standing_pose1', '/charachters/standing_pose1.png');
					this.load.image('walking_pose1', '/charachters/walking_pose1.png');
					this.load.image('jumping_pose1', '/charachters/jumping_pose1.png');
				},
				create() {
					levelComplete = false;
					this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'sky');

					this.solids = [];
					this.hazards = [];
					this.checkpointReached = false;

					const floor = this.add.rectangle(400, 560, 800, 80, 0x4f7942);
					this.solids.push({ x: 400, y: 560, width: 800, height: 80, visual: floor });

					levelData.platforms.forEach((platformData) => {
						const platform = this.add.rectangle(
							platformData.x,
							platformData.y,
							platformData.width,
							platformData.height,
							platformData.color
						);

						this.solids.push({
							x: platformData.x,
							y: platformData.y,
							width: platformData.width,
							height: platformData.height,
							visual: platform
						});
					});

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

					this.player = player;
					this.playerState = {
						x: levelData.respawn.x,
						y: levelData.respawn.y,
						vx: 0,
						vy: 0,
						onGround: false,
						facingLeft: false,
						width: PLAYER_HITBOX_WIDTH,
						height: PLAYER_HITBOX_HEIGHT
					};

					this.cursors = this.input.keyboard.createCursorKeys();
					this.wasd = this.input.keyboard.addKeys({
						up: Phaser.Input.Keyboard.KeyCodes.W,
						left: Phaser.Input.Keyboard.KeyCodes.A,
						right: Phaser.Input.Keyboard.KeyCodes.D
					});
				},
				update(_, deltaMs) {
					if (!this.player || !this.cursors || !this.wasd || levelComplete) return;

					const dt = Math.min(deltaMs / 1000, 1 / 30);
					const state = this.playerState;
					const previousOnGround = state.onGround;
					const moveLeft = this.cursors.left.isDown || this.wasd.left.isDown;
					const moveRight = this.cursors.right.isDown || this.wasd.right.isDown;
					const jumpPressed = this.cursors.up.isDown || this.wasd.up.isDown;

					if (moveLeft) {
						state.vx = -MOVE_SPEED;
						state.facingLeft = true;
					} else if (moveRight) {
						state.vx = MOVE_SPEED;
						state.facingLeft = false;
					} else {
						state.vx = 0;
					}

					if (jumpPressed && previousOnGround) {
						state.vy = -JUMP_SPEED;
						state.onGround = false;
					}

					resolveHorizontalMovement(this, dt);
					resolveVerticalMovement(this, dt);
					handleWorldBounds(this);
					handleTriggers(this);
					syncPlayerSprite(this);
					updatePlayerTexture(this, moveLeft || moveRight);
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

	function resolveVerticalMovement(scene, dt) {
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
			} else if (state.vy < 0) {
				state.y = solidBounds.bottom + state.height / 2;
				state.vy = 0;
			}

			playerBounds = getPlayerBounds(scene);
		}
	}

	function handleWorldBounds(scene) {
		const state = scene.playerState;
		const halfWidth = state.width / 2;
		const halfHeight = state.height / 2;

		if (state.x - halfWidth < 0) {
			state.x = halfWidth;
			state.vx = 0;
		}

		if (state.x + halfWidth > WORLD_WIDTH) {
			state.x = WORLD_WIDTH - halfWidth;
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

	function respawnPlayer(scene) {
		scene.playerState.x = scene.respawnX;
		scene.playerState.y = scene.respawnY;
		scene.playerState.vx = 0;
		scene.playerState.vy = 0;
		scene.playerState.onGround = false;
		stopWalkAnimation(scene);
	}

	function syncPlayerSprite(scene) {
		scene.player.setPosition(scene.playerState.x, scene.playerState.y);
		scene.player.setFlipX(scene.playerState.facingLeft);
	}

	function updatePlayerTexture(scene, isMoving) {
		const state = scene.playerState;

		if (!state.onGround) {
			stopWalkAnimation(scene);
			scene.player.setTexture('jumping_pose1');
		} else if (isMoving) {
			startWalkAnimation(scene);
		} else {
			stopWalkAnimation(scene);
		}
	}
</script>

<div class="game-shell">
	<div id={"game-container-" + level} class="game-container"></div>
</div>

<style>
	.game-shell {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.game-container {
		width: min(100%, 800px);
		min-height: 600px;
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
	}

	:global(.game-container canvas) {
		display: block;
		width: 100%;
		height: auto;
	}

	@media (max-width: 720px) {
		.game-container {
			min-height: auto;
		}
	}
</style>
