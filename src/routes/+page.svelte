<script>
	import { onMount, onDestroy } from 'svelte';

	let game;
	let cursors;
	let levelComplete = false;

	onMount(async () => {
		const Phaser = await import('phaser');

		const config = {
			type: Phaser.AUTO,
			width: 800,
			height: 600,
			parent: 'game-container',
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
					this.load.image('standing_pose2', '/standing_pose2.png');
					this.load.image('walking_pose1', '/walking_pose1.png');
					this.load.image('jumping_pose1', '/jumping_pose1.png');
				},
				create() {
					levelComplete = false;
					this.add.image(400, 300, 'sky');

					const floor = this.add.rectangle(400, 560, 800, 80, 0x4f7942);
					this.physics.add.existing(floor, true);

					const obstacle1 = this.add.rectangle(250, 485, 120, 20, 0x8e5a2a);
					const obstacle2 = this.add.rectangle(390, 405, 120, 20, 0x8e5a2a);
					const upperPlatform = this.add.rectangle(700, 340, 180, 20, 0x8b4513);
					const obstacle3 = this.add.rectangle(380, 270, 120, 20, 0x8e5a2a);
					const obstacle4 = this.add.rectangle(330, 195, 120, 20, 0x8e5a2a);
					const obstacle5 = this.add.rectangle(200, 120, 120, 20, 0x8e5a2a);
					const hazard = this.add.rectangle(535, 320, 55, 18, 0xd62828);

					this.physics.add.existing(obstacle1, true);
					this.physics.add.existing(obstacle2, true);
					this.physics.add.existing(upperPlatform, true);
					this.physics.add.existing(obstacle3, true);
					this.physics.add.existing(obstacle4, true);
					this.physics.add.existing(obstacle5, true);
					this.physics.add.existing(hazard, true);

					// Keep the checkpoint on the upper platform, but leave jump space to pass through.
					const checkpoint = this.add.rectangle(655, 312, 20, 20, 0xffff00);
					this.physics.add.existing(checkpoint, true);
					this.checkpoint = checkpoint;

					const finish = this.add.rectangle(200, 72, 30, 50, 0x2a9d8f);
					this.physics.add.existing(finish, true);

					// Initialize respawn point
					this.respawnX = 120;
					this.respawnY = 420;

					const player = this.physics.add.sprite(120, 420, 'standing_pose2');
					player.setOrigin(0.5, 0.5);
					player.setDisplaySize(40, 60);
					player.body.setSize(40, 60);

					player.body.setCollideWorldBounds(true);
					this.physics.add.collider(player, floor);
					this.physics.add.collider(player, obstacle1);
					this.physics.add.collider(player, obstacle2);
					this.physics.add.collider(player, obstacle3);
					this.physics.add.collider(player, obstacle4);
					this.physics.add.collider(player, obstacle5);
					this.physics.add.overlap(player, hazard, () => {
						if (levelComplete) return;
						player.body.stop();
						player.setPosition(this.respawnX, this.respawnY);
					});
					this.physics.add.collider(player, upperPlatform);

					// Overlap for checkpoint
					this.physics.add.overlap(
						player,
						checkpoint,
						() => {
							this.respawnX = checkpoint.x;
							this.respawnY = checkpoint.y - 20; // Above the checkpoint
						},
						null,
						this
					);

					this.physics.add.overlap(player, finish, () => {
						if (levelComplete) return;
						levelComplete = true;
						player.body.stop();
						this.add.text(240, 60, 'Level Complete!', {
							fontSize: '32px',
							color: '#1b4332'
						});
					});

					this.player = player;
					cursors = this.input.keyboard.createCursorKeys();
				},
				update() {
					if (!this.player || !cursors) return;
					if (levelComplete) return;

					if (cursors.left.isDown) {
						this.player.body.setVelocityX(-200);
					} else if (cursors.right.isDown) {
						this.player.body.setVelocityX(200);
					} else {
						this.player.body.setVelocityX(0);
					}

					if (cursors.up.isDown && this.player.body.blocked.down) {
						this.player.body.setVelocityY(-450);
					}

					// Respawn if fallen off
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
						this.player.setTexture('standing_pose2');
					}
				}
			}
		};

		game = new Phaser.Game(config);
	});

	onDestroy(() => {
		if (game) {
			game.destroy(true);
		}
	});
</script>

<div id="game-container"></div>
