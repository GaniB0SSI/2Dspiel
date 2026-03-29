<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';

	const stages = [
		'Escape The Dungeon',
		'You have been trapped in this cursed school...',
		'Ancient spirits block every room...',
		'You must reach the rooftop to escape...',
		'Only the brave will find the way out...'
	];

	const MAX_STAGES = stages.length - 1;
	const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

	let stage = $state(0);
	let displayedText = $state('');
	let showPrompt = $state(false);
	let introImageSrc = $state('/intro_explainer.png');
	let animationToken = 0;
	let timeoutIds = [];
	let introMusic = null;
	let fadeInterval = null;
	let musicStarted = false;

	function clearTimers() {
		for (const timeoutId of timeoutIds) {
			clearTimeout(timeoutId);
		}

		timeoutIds = [];
	}

	function queueTimeout(callback, delay) {
		const timeoutId = setTimeout(callback, delay);
		timeoutIds = [...timeoutIds, timeoutId];
	}

	function randomGlyph() {
		return glyphs[Math.floor(Math.random() * glyphs.length)];
	}

	function playClick() {
		const audio = new Audio('/sounds/click.mp3');
		audio.volume = 0.6;
		audio.play();
	}

	function fadeOutMusic(callback) {
		if (!introMusic) {
			callback();
			return;
		}

		if (fadeInterval) {
			clearInterval(fadeInterval);
		}

		fadeInterval = setInterval(() => {
			if (!introMusic) {
				clearInterval(fadeInterval);
				fadeInterval = null;
				callback();
				return;
			}

			if (introMusic.volume > 0.05) {
				introMusic.volume -= 0.05;
			} else {
				clearInterval(fadeInterval);
				fadeInterval = null;
				introMusic.pause();
				introMusic.currentTime = 0;
				callback();
			}
		}, 80);
	}

	function animateStage(index) {
		animationToken += 1;
		const currentToken = animationToken;
		const targetText = stages[index];
		const characters = Array.from(targetText);

		clearTimers();
		displayedText = '';
		showPrompt = false;

		for (let i = 0; i < characters.length; i += 1) {
			const character = characters[i];
			const revealAt = i * 95;

			if (character === ' ') {
				queueTimeout(() => {
					if (animationToken !== currentToken) return;
					displayedText = `${displayedText} `;
				}, revealAt);
				continue;
			}

			for (let glitchStep = 0; glitchStep < 3; glitchStep += 1) {
				queueTimeout(
					() => {
						if (animationToken !== currentToken) return;
						displayedText = `${characters.slice(0, i).join('')}${randomGlyph()}`;
					},
					revealAt + glitchStep * 28
				);
			}

			queueTimeout(() => {
				if (animationToken !== currentToken) return;
				displayedText = characters.slice(0, i + 1).join('');
			}, revealAt + 92);
		}

		queueTimeout(
			() => {
				if (animationToken !== currentToken) return;
				displayedText = targetText;
				showPrompt = true;
			},
			characters.length * 95 + 160
		);
	}

	function handleClick() {
		playClick();

		if (!musicStarted && introMusic) {
			introMusic.play().catch(() => {});
			musicStarted = true;
		}

		if (stage < MAX_STAGES) {
			stage += 1;
			return;
		}

		if (browser) {
			sessionStorage.setItem('introSeen', 'true');
		}

		fadeOutMusic(() => goto('/'));
	}

	function handleKeydown(event) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	}

	function handleImageError() {
		if (introImageSrc !== '/loading_page.png') {
			introImageSrc = '/loading_page.png';
		}
	}

	$effect(() => {
		animateStage(stage);
	});

	onMount(() => {
		introMusic = new Audio('/sounds/intro.mp3');
		introMusic.loop = true;
		introMusic.volume = 0.5;
	});

	onDestroy(() => {
		clearTimers();

		if (fadeInterval) {
			clearInterval(fadeInterval);
			fadeInterval = null;
		}

		if (introMusic) {
			introMusic.pause();
			introMusic.currentTime = 0;
			introMusic = null;
		}

		musicStarted = false;
	});
</script>

<svelte:head>
	<title>Intro</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<section
	class="intro-screen"
	role="button"
	tabindex="0"
	aria-label="Continue intro"
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	<div class="noise"></div>
	<div class="vignette"></div>

	<div class="content" data-title={stage === 0}>
		{#if stage === 0}
			<p class="eyebrow">Chapter Zero</p>
			<div class="title-layout">
				<div class="title-text">
					<h1 class:title={stage === 0}>{displayedText}</h1>

					{#if showPrompt}
						<p class="prompt">Click to continue</p>
					{/if}
				</div>

				<img class="explainer" src={introImageSrc} alt="Game explainer" onerror={handleImageError} />
			</div>
		{:else}
			<h1 class:title={stage === 0}>{displayedText}</h1>

			{#if showPrompt}
				<p class="prompt">Click to continue</p>
			{/if}
		{/if}
	</div>
</section>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Press Start 2P', 'Courier New', monospace;
		background: #06070a;
		color: #ffffff;
	}

	.intro-screen {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 32px 20px;
		box-sizing: border-box;
		background:
			radial-gradient(circle at top, rgba(77, 8, 8, 0.2), transparent 36%),
			radial-gradient(circle at bottom, rgba(46, 102, 57, 0.16), transparent 42%), #06070a;
		cursor: pointer;
	}

	.intro-screen:focus-visible {
		outline: 3px solid rgba(200, 245, 212, 0.6);
		outline-offset: -8px;
	}

	.noise,
	.vignette {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.noise {
		opacity: 0.22;
		background:
			repeating-linear-gradient(
				0deg,
				rgba(255, 255, 255, 0.08) 0,
				rgba(255, 255, 255, 0.08) 1px,
				transparent 1px,
				transparent 4px
			),
			repeating-linear-gradient(
				90deg,
				rgba(255, 255, 255, 0.03) 0,
				rgba(255, 255, 255, 0.03) 1px,
				transparent 1px,
				transparent 3px
			);
		animation: screen-jitter 180ms steps(2) infinite;
	}

	.vignette {
		background: radial-gradient(circle, transparent 38%, rgba(0, 0, 0, 0.78) 100%);
	}

	.content {
		position: relative;
		z-index: 1;
		width: min(100%, 980px);
		display: grid;
		justify-items: center;
		gap: 28px;
		text-align: center;
	}

	.title-layout {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 48px;
		width: 100%;
	}

	.title-text {
		display: grid;
		justify-items: center;
		gap: 28px;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #87f7a8;
		text-shadow:
			0 0 8px rgba(135, 247, 168, 0.7),
			0 0 18px rgba(135, 247, 168, 0.45);
		animation: flicker 2.3s infinite;
	}

	h1 {
		margin: 0;
		max-width: 18ch;
		font-size: clamp(1.2rem, 3.6vw, 2.8rem);
		line-height: 1.7;
		letter-spacing: 0.08em;
		color: #f5f7fa;
		text-shadow:
			0 0 10px #ff0000,
			0 0 22px rgba(255, 0, 0, 0.7),
			0 0 36px rgba(126, 255, 157, 0.35);
		animation:
			flicker 1.8s infinite,
			glow-pulse 2.6s ease-in-out infinite;
	}

	h1.title {
		font-size: clamp(1.5rem, 5vw, 4rem);
		max-width: 14ch;
		line-height: 1.45;
		text-transform: uppercase;
	}

	.explainer {
		width: 220px;
		height: auto;
		object-fit: contain;
		background: none;
		border: none;
		box-shadow: none;
		filter: saturate(0.8) brightness(0.72);
	}

	.prompt {
		margin: 0;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #d7e2dc;
		text-shadow:
			0 0 10px rgba(255, 0, 0, 0.45),
			0 0 18px rgba(126, 255, 157, 0.22);
		animation: prompt-blink 1.8s ease-in-out infinite;
	}

	@keyframes glow-pulse {
		0%,
		100% {
			text-shadow:
				0 0 10px #ff0000,
				0 0 22px rgba(255, 0, 0, 0.7),
				0 0 36px rgba(126, 255, 157, 0.35);
		}

		50% {
			text-shadow:
				0 0 10px #93ffab,
				0 0 24px rgba(147, 255, 171, 0.8),
				0 0 40px rgba(255, 0, 0, 0.4);
		}
	}

	@keyframes flicker {
		0%,
		18%,
		22%,
		56%,
		100% {
			opacity: 1;
		}

		20%,
		24%,
		54% {
			opacity: 0.55;
		}

		21%,
		55% {
			opacity: 0.22;
		}
	}

	@keyframes prompt-blink {
		0%,
		100% {
			opacity: 0.25;
		}

		50% {
			opacity: 1;
		}
	}

	@keyframes screen-jitter {
		0% {
			transform: translate(0, 0);
		}

		50% {
			transform: translate(0.5px, -0.5px);
		}

		100% {
			transform: translate(-0.5px, 0.5px);
		}
	}

	@media (max-width: 720px) {
		.content {
			gap: 22px;
		}

		.title-layout {
			flex-direction: column;
		}

		.eyebrow,
		.prompt {
			font-size: 0.58rem;
		}

		.explainer {
			width: 160px;
		}
	}
</style>
