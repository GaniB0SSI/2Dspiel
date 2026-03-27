<script>
	import { page } from '$app/state';

	const level = page.url.searchParams.get('level');
	const targetPath = level === '1' ? '/level1' : level === '2' ? '/level2' : null;
	const levelLabel = level === '1' ? 'Level 1' : level === '2' ? 'Level 2' : null;
</script>

<svelte:head>
	<title>Loading</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<section class="screen loading-screen">
	<div class="backdrop"></div>
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
		font-family: 'Press Start 2P', 'Courier New', monospace;
		background: #06070a;
		color: #f8fafc;
	}

	.screen {
		position: relative;
		overflow: hidden;
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
		box-sizing: border-box;
	}

	.loading-screen {
		background:
			linear-gradient(rgba(6, 7, 10, 0.5), rgba(6, 7, 10, 0.72)),
			url('/loading_page.png') center / cover no-repeat;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(rgba(8, 10, 18, 0.18), rgba(8, 10, 18, 0.72)),
			repeating-linear-gradient(
				0deg,
				rgba(255, 255, 255, 0.02) 0,
				rgba(255, 255, 255, 0.02) 2px,
				transparent 2px,
				transparent 6px
			);
		pointer-events: none;
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(100%, 540px);
		padding: 36px 32px;
		border-radius: 6px;
		border: 4px solid #f8d66d;
		background: rgba(11, 16, 33, 0.9);
		box-shadow:
			0 0 0 4px rgba(18, 24, 45, 0.95),
			0 18px 0 rgba(0, 0, 0, 0.45),
			0 30px 60px rgba(0, 0, 0, 0.5);
	}

	.eyebrow {
		margin: 0 0 10px;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-size: 0.7rem;
		color: #f8d66d;
		text-shadow: 2px 2px 0 #000;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.8rem, 4vw, 3rem);
		line-height: 1.25;
		color: #fff8dc;
		text-shadow:
			4px 4px 0 #000,
			0 0 18px rgba(248, 214, 109, 0.25);
	}

	.description {
		margin: 14px 0 0;
		font-size: 0.78rem;
		line-height: 1.9;
		color: #f4f7fb;
		text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.7);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		margin-top: 30px;
	}

	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 180px;
		border-radius: 4px;
		padding: 16px 20px;
		font-size: 0.82rem;
		font-weight: 700;
		text-decoration: none;
		text-transform: uppercase;
		border: 4px solid #0b1021;
		box-shadow:
			inset -4px -4px 0 rgba(0, 0, 0, 0.35),
			inset 4px 4px 0 rgba(255, 255, 255, 0.12),
			0 6px 0 rgba(0, 0, 0, 0.35);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease,
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.button:hover {
		transform: translateY(-2px);
		box-shadow:
			inset -4px -4px 0 rgba(0, 0, 0, 0.25),
			inset 4px 4px 0 rgba(255, 255, 255, 0.14),
			0 0 18px rgba(248, 214, 109, 0.35);
	}

	.primary {
		background: #f8d66d;
		color: #101525;
	}

	.secondary {
		background: #22304f;
		color: #f8fafc;
	}

	.primary:hover {
		background: #101525;
		color: #f8d66d;
		border-color: #f8d66d;
	}

	.secondary:hover {
		background: #f8d66d;
		color: #101525;
		border-color: #101525;
	}

	@media (max-width: 720px) {
		.panel {
			padding: 28px 22px;
		}

		.button {
			width: 100%;
			min-width: 0;
			font-size: 0.74rem;
		}
	}
</style>
