export const levelConfigs = {
	1: {
		worldWidth: 1900,
		label: 'Level 1',
		respawn: { x: 120, y: 420 },
		platforms: [{ x: 1790, y: 487, width: 130, height: 24, color: 0x9c6644, invisible: true },
			{ x: 180, y: 485, width: 140, height: 20, color: 0x9c6644 }
		],
		enemies: [
			{ x: 600, y: 530, width: 50, height: 75, patrolLeft: 450, patrolRight: 750 },
			{ x: 1200, y: 530, width: 50, height: 75, patrolLeft: 1050, patrolRight: 1350 },
			{ x: 1500, y: 530, width: 50, height: 75, patrolLeft: 1400, patrolRight: 1650 }
		],
		hazards: [],
		collectables: [
			{ x: 800, y: 440, width: 30, height: 30, type: 'gun', color: 0xff6b00 }
		],
		checkpoint: null,
		finish: { x: 1800, y: 446, width: 70, height: 50, invisible: true }
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
		collectables: [
			{ x: 520, y: 320, width: 30, height: 30, type: 'gun', color: 0xff6b00 },
			{ x: 680, y: 250, width: 30, height: 30, type: 'gun', color: 0xff6b00 }
		],
		checkpoint: { x: 690, y: 262, width: 20, height: 20 },
		finish: { x: 165, y: 42, width: 30, height: 50 }
	}
};
