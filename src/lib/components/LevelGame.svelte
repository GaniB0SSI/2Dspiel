<script>
	import { onDestroy, onMount } from 'svelte';
	import { levelConfigs } from '$lib/game/levels';

	let { level = 1 } = $props();

	let PhaserLib;
	let game;
	let levelComplete = false;

	onMount(async () => {
		PhaserLib = await import('phaser');
		createGame();
	});

	onDestroy(() => {
		if (game) {
			game.destroy(true);
		}
	});

	function createGame() {
		const Phaser = PhaserLib.default;
		const levelData = levelConfigs[level];

		if (!levelData) return;

		const config = {
			type: Phaser.AUTO,
			width: 800,
			height: 600,
			parent: `game-container-${level}`,
			physics: {
				default: 'arcade',
				arcade: {
					gravity: { y: 800 },
					debug: false
				}
			},
			scene: {
				preload() {
					this.load.image('sky', '/sky.png');
					this.load.image('standing_pose1', '/charachters/standing_pose1.png');
					this.load.image('walking_pose1', '/charachters/walking_pose1.png');
					this.load.image('jumping_pose1', '/charachters/jumping_pose1.png');
				},
				create() {
					levelComplete = false;
					this.add.image(400, 300, 'sky');

					const floor = this.add.rectangle(400, 560, 800, 80, 0x4f7942);
					this.physics.add.existing(floor, true);

					this.respawnX = levelData.respawn.x;
					this.respawnY = levelData.respawn.y;

					const player = this.physics.add.sprite(levelData.respawn.x, levelData.respawn.y, 'standing_pose1');
					player.setOrigin(0.5, 0.5);
					player.setDisplaySize(56, 84);
					player.body.setSize(56, 84);
					player.body.setCollideWorldBounds(true);

					this.physics.add.collider(player, floor);

					levelData.platforms.forEach((platformData) => {
						const platform = this.add.rectangle(
							platformData.x,
							platformData.y,
							platformData.width,
							platformData.height,
							platformData.color
						);
						this.physics.add.existing(platform, true);
						this.physics.add.collider(player, platform);
					});

					levelData.hazards.forEach((hazardData) => {
						const hazard = this.add.rectangle(
							hazardData.x,
							hazardData.y,
							hazardData.width,
							hazardData.height,
							0xd62828
						);
						this.physics.add.existing(hazard, true);
						this.physics.add.overlap(player, hazard, () => {
							if (levelComplete) return;
							player.body.stop();
							player.setPosition(this.respawnX, this.respawnY);
						});
					});

					const checkpoint = this.add.rectangle(
						levelData.checkpoint.x,
						levelData.checkpoint.y,
						levelData.checkpoint.width,
						levelData.checkpoint.height,
						0xffff00
					);
					this.physics.add.existing(checkpoint, true);

					this.physics.add.overlap(
						player,
						checkpoint,
						() => {
							this.respawnX = checkpoint.x;
							this.respawnY = checkpoint.y - 20;
						},
						null,
						this
					);

					const finish = this.add.rectangle(
						levelData.finish.x,
						levelData.finish.y,
						levelData.finish.width,
						levelData.finish.height,
						0x2a9d8f
					);
					this.physics.add.existing(finish, true);

					this.physics.add.overlap(player, finish, () => {
						if (levelComplete) return;
						levelComplete = true;
						player.body.stop();
						this.add.text(265, 60, `${levelData.label} Complete!`, {
							fontSize: '32px',
							color: '#1b4332'
						});
					});

					this.player = player;
					this.cursors = this.input.keyboard.createCursorKeys();
				},
				update() {
					if (!this.player || !this.cursors || levelComplete) return;

					if (this.cursors.left.isDown) {
						this.player.body.setVelocityX(-200);
					} else if (this.cursors.right.isDown) {
						this.player.body.setVelocityX(200);
					} else {
						this.player.body.setVelocityX(0);
					}

					if (this.cursors.up.isDown && this.player.body.blocked.down) {
						this.player.body.setVelocityY(-450);
					}

					if (this.player.y > 600) {
						this.player.setPosition(this.respawnX, this.respawnY);
						this.player.body.setVelocity(0, 0);
					}

					const onGround = this.player.body.blocked.down;

					if (!onGround) {
						this.player.setTexture('jumping_pose1');
					} else if (this.player.body.velocity.x !== 0) {
						this.player.setTexture('walking_pose1');
					} else {
						this.player.setTexture('standing_pose1');
					}
				}
			}
		};

		game = new Phaser.Game(config);
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
