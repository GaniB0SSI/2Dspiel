<script>
	import { page } from '$app/state';

	const level = page.url.searchParams.get('level');
	const targetPath = level === '1' ? '/level1' : level === '2' ? '/level2' : null;
	const levelLabel = level === '1' ? 'Level 1' : level === '2' ? 'Level 2' : null;
</script>

<svelte:head>
	<title>Loading</title>
</svelte:head>

<section class="screen loading-screen">
	<div class="panel overlay">
		{#if targetPath}
			<p class="eyebrow">Loading Page</p>
			<h1>{levelLabel}</h1>
			<p class="description">Press Play to open the selected level.</p>
			<div class="actions">
				<a class="button primary" href={targetPath}>Play</a>
				<a class="button secondary" href="/">Back</a>
			</div>
		{:else}
			<p class="eyebrow">Loading Page</p>
			<h1>Level Not Found</h1>
			<p class="description">Choose Level 1 or Level 2 from the home page.</p>
			<div class="actions">
				<a class="button secondary" href="/">Back To Menu</a>
			</div>
		{/if}
	</div>
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
		display: grid;
		place-items: center;
		padding: 24px;
		box-sizing: border-box;
	}

	.loading-screen {
		background:
			linear-gradient(rgba(9, 14, 25, 0.45), rgba(9, 14, 25, 0.68)),
			url('/loading_page.png') center / cover no-repeat;
	}

	.panel {
		width: min(100%, 540px);
		padding: 32px;
		border-radius: 28px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(5, 10, 18, 0.72);
		backdrop-filter: blur(8px);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
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
	}

	.description {
		margin: 14px 0 0;
		font-size: 1rem;
		line-height: 1.6;
		color: rgba(248, 250, 252, 0.86);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		margin-top: 28px;
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

	.primary {
		background: linear-gradient(135deg, #fbbf24, #fb8500);
		color: #111827;
		box-shadow: 0 16px 30px rgba(251, 133, 0, 0.28);
	}

	.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #f8fafc;
		border: 1px solid rgba(255, 255, 255, 0.16);
	}

	@media (max-width: 720px) {
		.panel {
			padding: 24px;
		}
	}
</style>
