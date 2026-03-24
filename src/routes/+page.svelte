
<script>
  import { onMount, onDestroy } from "svelte";

  let game;

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
        create() {
          this.cameras.main.setBackgroundColor("#cfe8ff");

          const floor = this.add.rectangle(400, 560, 800, 80, 0x4f7942);
          this.physics.add.existing(floor, true);

          const player = this.add.rectangle(120, 420, 40, 60, 0x1f3c88);
          this.physics.add.existing(player);

          player.body.setCollideWorldBounds(true);
          this.physics.add.collider(player, floor);
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

