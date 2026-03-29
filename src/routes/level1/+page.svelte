<script>
	import LevelGame from '$lib/components/LevelGame.svelte';

	function playClick() {
		const audio = new Audio('/click.mp3');
		audio.volume = 0.6;
		audio.play();
	}
</script>

<svelte:head>
	<title>Level 1</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<section class="screen game-screen">
	<div class="game-stage">
		<div class="game-header">
			<div>
				<p class="eyebrow">Now Playing</p>
				<h1>Level 1</h1>
			</div>
			<a class="button secondary" href="/" onclick={playClick}>Menu</a>
		</div>

		<LevelGame level={1} />
	</div>
</section>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Press Start 2P', 'Courier New', monospace;
		background: #111827;
		color: #f8fafc;
	}

	.screen {
		position: relative;
		overflow: hidden;
		min-height: 100vh;
		padding: 24px;
		box-sizing: border-box;
		background: #000000;
	}

	.game-stage {
		z-index: 1;
		width: min(100%, 980px);
		margin: 0 auto;
	}

	.game-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}

	.eyebrow {
		margin: 0 0 10px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-size: 0.78rem;
		color: #fbbf24;
	}

	h1 {
		margin: 0;
		font-size: clamp(2rem, 4vw, 3.4rem);
		color: #f8fafc;
		text-shadow:
			0 3px 0 rgba(0, 0, 0, 0.45),
			0 10px 24px rgba(0, 0, 0, 0.35);
	}

	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		padding: 14px 24px;
		font-size: 1rem;
		font-weight: 700;
		text-decoration: none;
		transition:
			transform 0.2s ease,
			opacity 0.2s ease,
			box-shadow 0.2s ease;
	}

	.button:hover {
		transform: translateY(-2px);
	}

	.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #f8fafc;
		border: 1px solid rgba(255, 255, 255, 0.16);
	}

	@media (max-width: 720px) {
		.game-header {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
