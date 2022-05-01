import WM from './wm.js';
import KG from '../krater/krater.js';

class TileSelect
{
	pos = { x:0, y:0 };
	
	layer = null;
	selectionBegin = null;
	
	constructor(layer)
	{
		this.layer = layer;
	}
	
	getCurrentTile()
	{
		const b = this.layer.brush;

		if(b.length == 1 && b[0].length == 1) return b[0][0] - 1;
		else return -1;
	}
	
	setPosition(x, y)
	{
		this.selectionBegin = null;
		const tile = this.getCurrentTile();
		this.pos.x = Math.floor(x / this.layer.tilesize) * this.layer.tilesize - Math.floor(tile * this.layer.tilesize) % this.layer.tiles.width;
		this.pos.y = Math.floor(y / this.layer.tilesize) * this.layer.tilesize - Math.floor(tile * this.layer.tilesize / this.layer.tiles.width) * this.layer.tilesize - (tile == -1 ? this.layer.tilesize : 0);
			
		this.pos.x = this.pos.x.limit(0, KG.system.width - this.layer.tiles.width - (KG.system.width % this.layer.tilesize));
		this.pos.y = this.pos.y.limit(0, KG.system.height - this.layer.tiles.height - (KG.system.height % this.layer.tilesize));
	}
	
	beginSelecting(x, y)
	{
		this.selectionBegin = { x:x, y:y };
	}
	
	endSelecting(x, y)
	{
		const r = this.getSelectionRect(x, y);
		
		const mw = Math.floor(this.layer.tiles.width / this.layer.tilesize);
		const mh = Math.floor(this.layer.tiles.height / this.layer.tilesize);
		
		let brush = [];

		for(let ty = r.y; ty < r.y + r.h; ty++)
		{
			let row = [];

			for(let tx = r.x; tx < r.x + r.w; tx++)
			{
				if(tx < 0 || ty < 0 || tx >= mw || ty >= mh) row.push(0);
				else row.push(ty * Math.floor(this.layer.tiles.width / this.layer.tilesize) + tx + 1);
			}

			brush.push(row);
		}

		this.selectionBegin = null;

		return brush;
	}
	
	getSelectionRect(x, y)
	{
		const sx = this.selectionBegin ? this.selectionBegin.x : x,
			sy = this.selectionBegin ? this.selectionBegin.y : y;
			
		const txb = Math.floor((sx - this.pos.x) / this.layer.tilesize),
			tyb = Math.floor((sy - this.pos.y) / this.layer.tilesize),
			txe = Math.floor((x - this.pos.x) / this.layer.tilesize),
			tye = Math.floor((y - this.pos.y) / this.layer.tilesize);
		
		return {
			x: Math.min(txb, txe),
			y: Math.min(tyb, tye),
			w: Math.abs(txb - txe) + 1,
			h: Math.abs(tyb - tye) + 1
		}
	}
	
	draw()
	{
		KG.system.clear("rgba(0,0,0,0.8)"); 

		if(!this.layer.tiles.loaded) return;
		
		// Tileset
		KG.system.context.lineWidth = 1;
		KG.system.context.strokeStyle = WM.config.colors.secondary;
		KG.system.context.fillStyle = WM.config.colors.clear;
		KG.system.context.fillRect(this.pos.x * KG.system.scale, this.pos.y * KG.system.scale, this.layer.tiles.width * KG.system.scale, this.layer.tiles.height * KG.system.scale);
		KG.system.context.strokeRect(this.pos.x * KG.system.scale - .5, this.pos.y * KG.system.scale - .5, this.layer.tiles.width * KG.system.scale + 1, this.layer.tiles.height * KG.system.scale + 1);
		
		this.layer.tiles.draw(this.pos.x, this.pos.y);
		
		// Selected Tile
		const tile = this.getCurrentTile();
		const tx = Math.floor(tile * this.layer.tilesize) % this.layer.tiles.width + this.pos.x;
		const ty = Math.floor(tile * this.layer.tilesize / this.layer.tiles.width) * this.layer.tilesize + this.pos.y + (tile == -1 ? this.layer.tilesize : 0);
		
		KG.system.context.lineWidth = 1;
		KG.system.context.strokeStyle = WM.config.colors.highlight;
		KG.system.context.strokeRect(tx * KG.system.scale - .5, ty * KG.system.scale - .5, this.layer.tilesize * KG.system.scale + 1, this.layer.tilesize * KG.system.scale + 1);
	}
	
	drawCursor(x, y)
	{  
		const r = this.getSelectionRect(x, y);
		
		KG.system.context.lineWidth = 1;
		KG.system.context.strokeStyle = WM.config.colors.selection;

		KG.system.context.strokeRect((r.x * this.layer.tilesize + this.pos.x) * KG.system.scale - .5, (r.y * this.layer.tilesize + this.pos.y) * KG.system.scale - .5, 
			r.w * this.layer.tilesize * KG.system.scale + 1, r.h * this.layer.tilesize * KG.system.scale + 1);
	}
}

export default TileSelect;