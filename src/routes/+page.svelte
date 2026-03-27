
<script>
  import { onMount, onDestroy } from "svelte";

  let game;
  let cursors;

  onMount(async () => {
    const Phaser = await import("phaser");

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: "game-container",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 800 },
          debug: false
        }
      },
      scene: {
        preload() {
          this.load.image('sky', '/sky.png');
        },
        create() {
          this.add.image(400, 300, 'sky');

          const floor = this.add.rectangle(400, 560, 800, 80, 0x4f7942);
          this.physics.add.existing(floor, true);

          const obstacle1 = this.add.rectangle(260, 470, 120, 20, 0x8e5a2a);
          const obstacle2 = this.add.rectangle(430, 390, 120, 20, 0x8e5a2a);
          const obstacle3 = this.add.rectangle(600, 310, 120, 20, 0x8e5a2a);
          const hazard = this.add.rectangle(430, 540, 80, 20, 0xd62828);

          this.physics.add.existing(obstacle1, true);
          this.physics.add.existing(obstacle2, true);
          this.physics.add.existing(obstacle3, true);
          this.physics.add.existing(hazard, true);

          // Add upper platform
          const upperPlatform = this.add.rectangle(600, 350, 200, 20, 0x8B4513);
          this.physics.add.existing(upperPlatform, true);

          // Add checkpoint on the upper platform
          const checkpoint = this.add.rectangle(650, 320, 20, 20, 0xFFFF00);
          this.physics.add.existing(checkpoint, true);
          this.checkpoint = checkpoint;

          // Initialize respawn point
          this.respawnX = 120;
          this.respawnY = 420;

          const player = this.add.rectangle(120, 420, 40, 60, 0x1f3c88);
          this.physics.add.existing(player);

          player.body.setCollideWorldBounds(true);
          this.physics.add.collider(player, floor);
          this.physics.add.collider(player, obstacle1);
          this.physics.add.collider(player, obstacle2);
          this.physics.add.collider(player, obstacle3);
          this.physics.add.overlap(player, hazard, () => {
            player.body.stop();
            player.setPosition(this.respawnX, this.respawnY);
          });
          this.physics.add.collider(player, upperPlatform);

          // Overlap for checkpoint
          this.physics.add.overlap(player, checkpoint, () => {
            this.respawnX = checkpoint.x;
            this.respawnY = checkpoint.y - 20; // Above the checkpoint
          }, null, this);

          this.player = player;
          cursors = this.input.keyboard.createCursorKeys();
        },
        update() {
          if (!this.player || !cursors) return;

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
          if (this.player.body.y > 600) {
            this.player.body.x = this.respawnX;
            this.player.body.y = this.respawnY;
            this.player.body.setVelocity(0, 0);
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

