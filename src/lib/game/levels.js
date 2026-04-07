export const levelConfigs = {
	1: {
		worldWidth: 1900,
		label: 'Level 1',
		respawn: { x: 120, y: 420 },
		platforms: [{ x: 1790, y: 487, width: 130, height: 24, color: 0x9c6644, invisible: true },
			{ x: 180, y: 485, width: 140, height: 20, color: 0x9c6644 }
		],
		enemies: [{ x: 600, y: 525, width: 50, height: 80 }],
		hazards: [],
		checkpoint: { x: 950, y: 250, width: 20, height: 20 },
		finish: { x: 1850, y: 152, width: 30, height: 50 }
	},
	2: {
		worldWidth: 800,
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
