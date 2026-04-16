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
		worldWidth: 4403,
		label: 'Level 2',
		respawn: { x: 90, y: 420 },
		platforms: [
			{	 x: 1170, y: 487, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 1350, y: 427, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 1450, y: 400, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 1650, y: 400, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 1750, y: 400, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 1950, y: 400, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 2250, y: 400, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 2550, y: 400, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 2750, y: 400, width: 130, height: 24, color: 0x9c6644, },
			{	 x: 2950, y: 400, width: 130, height: 24, color: 0x9c6644, }
		],
		enemies: [
			{
				type: 'boss',
				name: 'Paulin',
				x: 3920,
				y: 470,
				width: 130,
				height: 165,
				health: 10,
				speed: 170,
				patrolLeft: 3520,
				patrolRight: 4220,
				projectileCooldown: 1.45
			}
		],
		hazards: [
			
		],
		collectables: [
			{ x: 950, y: 320, width: 30, height: 30, type: 'gun', color: 0xff6b00 },
			{ x: 2000, y: 370, width: 30, height: 30, type: 'gun', color: 0xff6b00 },
			{ x: 3400, y: 360, width: 30, height: 30, type: 'gun', color: 0xff6b00 }
		],
		checkpoint: { x: 2200, y: 250, width: 20, height: 20 },
		finish: { x: 4300, y: 152, width: 30, height: 50 }
	}
};
