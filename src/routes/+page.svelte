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
      scene: {
        create() {
          this.add.text(300, 250, "Hello Phaser in Svelte!");
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