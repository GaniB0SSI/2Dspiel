export const levelConfigs = {
	1: {
		label: 'Level 1',
		respawn: { x: 120, y: 420 },
		platforms: [
			{ x: 250, y: 485, width: 120, height: 20, color: 0x8e5a2a },
			{ x: 390, y: 405, width: 120, height: 20, color: 0x8e5a2a },
			{ x: 600, y: 340, width: 180, height: 20, color: 0x8b4513 },
			{ x: 380, y: 270, width: 120, height: 20, color: 0x8e5a2a },
			{ x: 330, y: 195, width: 120, height: 20, color: 0x8e5a2a },
			{ x: 200, y: 120, width: 120, height: 20, color: 0x8e5a2a }
		],
		hazards: [{ x: 535, y: 420, width: 55, height: 18 }],
		checkpoint: { x: 655, y: 312, width: 20, height: 20 },
		finish: { x: 200, y: 72, width: 30, height: 50 }
	},
	2: {
		label: 'Level 2',
		respawn: { x: 90, y: 420 },
		platforms: [
			{ x: 180, y: 485, width: 140, height: 20, color: 0x9c6644 },
			{ x: 355, y: 430, width: 100, height: 20, color: 0x9c6644 },
			{ x: 520, y: 360, width: 120, height: 20, color: 0x9c6644 },
			{ x: 680, y: 290, width: 120, height: 20, color: 0x9c6644 },
			{ x: 500, y: 205, width: 100, height: 20, color: 0x7f5569 },
			{ x: 340, y: 145, width: 120, height: 20, color: 0x7f5539 },
			{ x: 165, y: 140, width: 110, height: 20, color: 0x7f5539 }
		],
		hazards: [
			{ x: 280, y: 520, width: 60, height: 18 },
			{ x: 440, y: 430, width: 60, height: 18 }
		],
		checkpoint: { x: 690, y: 262, width: 20, height: 20 },
		finish: { x: 165, y: 42, width: 30, height: 50 }
	}
};
