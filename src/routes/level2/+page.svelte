<script>
	import LevelGame from '$lib/components/LevelGame.svelte';
</script>

<svelte:head>
	<title>Level 2</title>
</svelte:head>

<section class="screen game-screen">
	<div class="game-header">
		<div>
			<p class="eyebrow">Now Playing</p>
			<h1>Level 2</h1>
		</div>
		<a class="button secondary" href="/">Menu</a>
	</div>

	<LevelGame level={2} />
</section>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
		background: #111827;
		color: #f8fafc;
	}

	.screen {
		min-height: 100vh;
		padding: 24px;
		box-sizing: border-box;
		background:
			radial-gradient(circle at top, rgba(34, 197, 94, 0.2), transparent 30%),
			linear-gradient(180deg, #081c15 0%, #1b4332 100%);
	}

	.game-header {
		width: min(100%, 800px);
		margin: 0 auto 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
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
		font-size: clamp(1.8rem, 4vw, 2.5rem);
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
