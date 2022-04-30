import KG from '../krater.js';
import DebugPanel from './panel.js';

const oldOnGameSet = KG.system.onGameSet;
KG.system.onGameSet = () =>
{
	oldOnGameSet.bind(KG.system)();

	const oldLoadLevel = KG.game.loadLevel;
	KG.game.loadLevel = (data) =>
	{
		oldLoadLevel.bind(KG.game)(data);
		KG.debug.panels.maps.load(this);
	}
}
class DebugMapsPanel extends DebugPanel
{
	maps = [];
	mapScreens = [];
	
	constructor(name, label)
	{
		super(name, label);
		this.load();
	}
	
	load(game)
	{
		this.options = [];
		this.panels = [];
		
		if(!game || !game.backgroundMaps.length)
		{
			this.container.innerHTML = '<em>No Maps Loaded</em>';

			return;	
		}
		
		this.maps = game.backgroundMaps;
		this.mapScreens = [];
		this.container.innerHTML = '';
		
		for(let m = 0; m < this.maps.length; m++)
		{
			const map = this.maps[m];
			const subPanel = new DebugPanel(m, 'Layer ' + m);
			const head = KG.$new('strong');

			head.textContent = m + ': ' + map.tiles.path;

			subPanel.container.appendChild(head);
			subPanel.addOption(new DebugOption('Enabled', map, 'enabled'));
			subPanel.addOption(new DebugOption('Pre Rendered', map, 'preRender'));
			subPanel.addOption(new DebugOption('Show Chunks', map, 'debugChunks'));
			
			this.generateMiniMap(subPanel, map, m);
			this.addPanel(subPanel);
		}
	}
	
	generateMiniMap(panel, map, id)
	{
		const s = KG.system.scale; // we'll need this a lot
		
		// resize the tileset, so that one tile is 's' pixels wide and high
		const ts = KG.$new('canvas');
		const tsctx = ts.getContext('2d');
		
		const w = map.tiles.width * s;
		const h = map.tiles.height * s;
		const ws = w / map.tilesize;
		const hs = h / map.tilesize;
		ts.width = ws;
		ts.height = hs;

		tsctx.drawImage(map.tiles.data, 0, 0, w, h, 0, 0, ws, hs);
		
		// create the minimap canvas
		const mapCanvas = KG.$new('canvas');
		mapCanvas.width = map.width * s;
		mapCanvas.height = map.height * s;
		const ctx = mapCanvas.getContext('2d');
		
		if(KG.game.clearColor)
		{
			ctx.fillStyle = KG.game.clearColor; 

			ctx.fillRect(0, 0, w, h);
		}
		
		// draw the map
		let tile = 0;

		for(let x = 0; x < map.width; x++)
		{
			for(let y = 0; y < map.height; y++)
			{
				if((tile = map.data[y][x])) ctx.drawImage(ts, Math.floor(((tile - 1) * s) % ws), Math.floor((tile - 1) * s / ws) * s, s, s, x * s, y * s, s, s);
			}
		}
		
		const mapContainer = KG.$new('div');
		mapContainer.className = 'ig_debug_map_container';
		mapContainer.style.width = map.width * s + 'px';
		mapContainer.style.height = map.height * s + 'px';
		
		const mapScreen = KG.$new('div');
		mapScreen.className = 'ig_debug_map_screen';
		mapScreen.style.width = ((KG.system.width / map.tilesize) * s - 2) + 'px';
		mapScreen.style.height = ((KG.system.height / map.tilesize) * s - 2) + 'px';
		this.mapScreens[id] = mapScreen;
		
		mapContainer.appendChild(mapCanvas);
		mapContainer.appendChild(mapScreen);
		panel.container.appendChild(mapContainer);
	}
	
	afterRun()
	{
		// Update the screen position DIV for each mini-map
		const s = KG.system.scale;

		for(let m = 0; m < this.maps.length; m++)
		{
			const map = this.maps[m];
			const screen = this.mapScreens[m];
			
			// Quick sanity check
			if(!map || !screen) continue;
			
			let x = map.scroll.x / map.tilesize;
			let y = map.scroll.y / map.tilesize;
			
			if(map.repeat)
			{
				x %= map.width;
				y %= map.height;
			}
			
			screen.style.left = (x * s) + 'px';
			screen.style.top = (y * s) + 'px';
		}
	}
}

KG.debug.addPanel(
{
	type: DebugMapsPanel,
	name: 'maps',
	label: 'Background Maps'
});

export default DebugMapsPanel;