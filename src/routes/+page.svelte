
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

          const obstacle1 = this.add.rectangle(320, 500, 40, 40, 0xc0392b);
          const obstacle2 = this.add.rectangle(520, 470, 40, 100, 0xc0392b);
          const obstacle3 = this.add.rectangle(680, 515, 80, 30, 0xc0392b);

          this.physics.add.existing(obstacle1, true);
          this.physics.add.existing(obstacle2, true);
          this.physics.add.existing(obstacle3, true);

          const player = this.add.rectangle(120, 420, 40, 60, 0x1f3c88);
          this.physics.add.existing(player);

          player.body.setCollideWorldBounds(true);
          this.physics.add.collider(player, floor);
          this.physics.add.collider(player, obstacle1);
          this.physics.add.collider(player, obstacle2);
          this.physics.add.collider(player, obstacle3);

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

