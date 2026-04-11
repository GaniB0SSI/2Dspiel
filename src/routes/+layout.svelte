<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';

	let { children } = $props();
	let menuMusic = null;
	let musicStarted = false;

	const musicRoutes = ['/', '/loading', '/intro'];

	function shouldPlayMusic(pathname) {
		return musicRoutes.some((route) => pathname === route || pathname.startsWith('/loading'));
	}

	function startMusic() {
		if (!menuMusic || musicStarted) return;
		menuMusic.play().catch(() => {});
		musicStarted = true;
	}

	function stopMusic() {
		if (!menuMusic) return;
		menuMusic.pause();
		menuMusic.currentTime = 0;
		musicStarted = false;
	}

	$effect(() => {
		const pathname = page.url.pathname;

		if (shouldPlayMusic(pathname)) {
			if (menuMusic && menuMusic.paused && musicStarted) {
				menuMusic.play().catch(() => {});
			}
		} else {
			stopMusic();
		}
	});

	onMount(() => {
		menuMusic = new Audio('/sounds/intro.mp3');
		menuMusic.loop = true;
		menuMusic.volume = 0.5;

		const startOnInteraction = () => {
			startMusic();
			document.removeEventListener('click', startOnInteraction);
			document.removeEventListener('keydown', startOnInteraction);
		};

		document.addEventListener('click', startOnInteraction);
		document.addEventListener('keydown', startOnInteraction);
	});

	onDestroy(() => {
		stopMusic();
		menuMusic = null;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
