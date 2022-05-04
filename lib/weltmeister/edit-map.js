import KG from '../krater/krater.js';
import KGImage from '../krater/image.js';
import BackgroundMap from '../krater/background-map.js';
import WM from './wm.js';
import TileSelect from './tile-select.js';

class EditMap extends BackgroundMap
{
	name = '';
	visible = true;
	active = true;
	linkWithCollision = false;
	
	div = null;
	brush = [[0]];
	oldData = null;
	hotkey = -1;
	ignoreLastClick = false;
	tileSelect = null;
	
	isSelecting = false;
	selectionBegin = null;
	
	constructor(name, tilesize, tileset, foreground)
	{
		super(tilesize, [[0]], tileset || '');
		
		this.name = name;

		this.foreground = foreground;
		this.div = $('<div/>',
		{
			'class': 'layer layerActive', 
			'id': ('layer_' + name),
			'mouseup': this.click.bind(this)
		});

		this.setName(name);

		if(this.foreground) $('#layers').prepend(this.div);
		else $('#layerEntities').after(this.div);
		
		this.tileSelect = new TileSelect(this);
	}
	
	getSaveData()
	{
		return {
			name: this.name,
			width: this.width,
			height: this.height,
			linkWithCollision: this.linkWithCollision,
			visible: this.visible,
			tilesetName: this.tilesetName,
			repeat: this.repeat,
			preRender: this.preRender,
			distance: this.distance,
			tilesize: this.tilesize,
			foreground: this.foreground,
			data: this.data
		};
	}
	
	resize(newWidth, newHeight)
	{
		let newData = new Array(newHeight);

		for(let y = 0; y < newHeight; y++)
		{
			newData[y] = new Array(newWidth);

			for(let x = 0; x < newWidth; x++) newData[y][x] = (x < this.width && y < this.height) ? this.data[y][x] : 0;
		}
		this.data = newData;
		this.width = newWidth;
		this.height = newHeight;
		
		this.resetDiv();
	}
	
	beginEditing()
	{
		this.oldData = KG.copy(this.data);
	}
	
	getOldTile(x, y)
	{
		const tx = Math.floor(x / this.tilesize);
		const ty = Math.floor(y / this.tilesize);

		if((tx >= 0 && tx < this.width) && (ty >= 0 && ty < this.height)) return this.oldData[ty][tx];
		else return 0;
	}
	
	setTileset(tileset)
	{
		if(this.name == 'collision') this.setCollisionTileset();
		else super.setTileset(tileset);
	}
	
	setCollisionTileset()
	{
		const path = WM.config.collisionTiles.path;
		const scale = this.tilesize / WM.config.collisionTiles.tilesize;
		this.tiles = new AutoResizedImage(path, scale);
	}
	
	// -------------------------------------------------------------------------
	// UI
	
	setHotkey(hotkey)
	{
		this.hotkey = hotkey;

		this.setName(this.name);
	}
	
	setName(name)
	{
		this.name = name.replace(/[^0-9a-zA-Z]/g, '_');

		this.resetDiv();
	}
	
	resetDiv()
	{
		const visClass = this.visible ? ' checkedVis' : '';

		this.div.html(
			'<span class="visible' + visClass + '" title="Toggle Visibility (Shift+' + this.hotkey + ')"></span>' +
			'<span class="name">' + this.name + '</span>' +
			'<span class="size"> (' + this.width + 'x' + this.height + ')</span>'
		);
		this.div.attr('title', 'Select Layer ('+this.hotkey+')');
		this.div.children('.visible').bind('mousedown', this.toggleVisibilityClick.bind(this));
	}
	
	setActive(active)
	{
		this.active = active;

		if(active) this.div.addClass('layerActive');
		else this.div.removeClass('layerActive');
	}
	
	toggleVisibility()
	{
		this.visible = !this.visible;

		this.resetDiv();

		if(this.visible) this.div.children('.visible').addClass('checkedVis');
		else this.div.children('.visible').removeClass('checkedVis');

		KG.game.draw();
	}
	
	toggleVisibilityClick(event)
	{
		if(!this.active) this.ignoreLastClick = true;

		this.toggleVisibility()
	}
	
	click()
	{
		if(this.ignoreLastClick)
		{
			this.ignoreLastClick = false;

			return;
		}

		KG.editor.setActiveLayer(this.name);
	}
	
	destroy()
	{
		this.div.remove();
	}
	
	// -------------------------------------------------------------------------
	// Selecting
	
	beginSelecting(x, y)
	{
		this.isSelecting = true;
		this.selectionBegin = { x:x, y:y };
	}
		
	endSelecting(x, y)
	{
		const r = this.getSelectionRect(x, y);
		
		let brush = [];

		for(let ty = r.y; ty < r.y + r.h; ty++)
		{
			let row = [];

			for(let tx = r.x; tx < r.x + r.w; tx++)
			{
				if( tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) row.push(0);
				else row.push(this.data[ty][tx]);
			}

			brush.push(row);
		}

		this.isSelecting = false;
		this.selectionBegin = null;

		return brush;
	}
	
	getSelectionRect(x, y)
	{
		const sx = this.selectionBegin ? this.selectionBegin.x : x,
			sy = this.selectionBegin ? this.selectionBegin.y : y;
			
		const txb = Math.floor((sx + this.scroll.x) / this.tilesize),
			tyb = Math.floor((sy + this.scroll.y) / this.tilesize),
			txe = Math.floor((x + this.scroll.x) / this.tilesize),
			tye = Math.floor((y + this.scroll.y) / this.tilesize);
		
		return {
			x: Math.min(txb, txe),
			y: Math.min(tyb, tye),
			w: Math.abs(txb - txe) + 1,
			h: Math.abs(tyb - tye) + 1
		}
	}

	// -------------------------------------------------------------------------
	// Drawing
	
	draw()
	{
		// For performance reasons, repeated background maps are not drawn
		// when zoomed out
		if(this.visible && !(WM.config.view.zoom < 1 && this.repeat)) this.drawTiled();
		
		// Grid
		if(this.active && WM.config.view.grid)
		{
			let x = -KG.system.getDrawPos(this.scroll.x % this.tilesize) - 0.5;
			let y = -KG.system.getDrawPos(this.scroll.y % this.tilesize) - 0.5;
			const step = this.tilesize * KG.system.scale;
			
			KG.system.context.beginPath();

			for(x; x < KG.system.realWidth; x += step)
			{
				KG.system.context.moveTo(x, 0);
				KG.system.context.lineTo(x, KG.system.realHeight);
			}

			for(y; y < KG.system.realHeight; y += step)
			{
				KG.system.context.moveTo(0, y);
				KG.system.context.lineTo(KG.system.realWidth, y);
			}

			KG.system.context.strokeStyle = WM.config.colors.secondary;
			KG.system.context.stroke();
			KG.system.context.closePath();
			
			// Not calling beginPath() again has some weird performance issues
			// in Firefox 5. closePath has no effect. So to make it happy:
			KG.system.context.beginPath(); 
		}
		
		// Bounds
		if(this.active)
		{
			KG.system.context.lineWidth = 1;
			KG.system.context.strokeStyle = WM.config.colors.primary;
			KG.system.context.strokeRect( 
				-KG.system.getDrawPos(this.scroll.x) - 0.5, 
				-KG.system.getDrawPos(this.scroll.y) - 0.5, 
				this.width * this.tilesize * KG.system.scale + 1, 
				this.height * this.tilesize * KG.system.scale + 1
			);			
		}
	}
	
	getCursorOffset()
	{
		const w = this.brush[0].length;
		const h = this.brush.length;
		
		//return {x:0, y:0};
		return {
			x: (w / 2-0.5).toInt() * this.tilesize,
			y: (h / 2-0.5).toInt() * this.tilesize
		}
	}
	
	drawCursor(x, y)
	{
		if(this.isSelecting)
		{
			const r = this.getSelectionRect(x, y);
		
			KG.system.context.lineWidth = 1;
			KG.system.context.strokeStyle = WM.config.colors.selection;
			KG.system.context.strokeRect( 
				(r.x * this.tilesize - this.scroll.x) * KG.system.scale - .5, 
				(r.y * this.tilesize - this.scroll.y) * KG.system.scale - .5, 
				r.w * this.tilesize * KG.system.scale + 1, 
				r.h * this.tilesize * KG.system.scale + 1
			);
		}
		else
		{
			const w = this.brush[0].length;
			const h = this.brush.length;
			
			const co = this.getCursorOffset();
			
			const cx = Math.floor((x+this.scroll.x) / this.tilesize) * this.tilesize - this.scroll.x - co.x;
			const cy = Math.floor((y+this.scroll.y) / this.tilesize) * this.tilesize - this.scroll.y - co.y;
			
			KG.system.context.lineWidth = 1;
			KG.system.context.strokeStyle = WM.config.colors.primary;
			KG.system.context.strokeRect(KG.system.getDrawPos(cx) - 0.5, KG.system.getDrawPos(cy) - .5, 
				w * this.tilesize * KG.system.scale + 1, h * this.tilesize * KG.system.scale + 1);
			
			KG.system.context.globalAlpha = .5;

			for(let ty = 0; ty < h; ty++)
			{
				for(let tx = 0; tx < w; tx++)
				{
					const t = this.brush[ty][tx];

					if(t)
					{
						const px = cx + tx * this.tilesize;
						const py = cy + ty * this.tilesize;

						this.tiles.drawTile(px, py, t - 1, this.tilesize);
					}
				}
			}

			KG.system.context.globalAlpha = 1;
		}
	}
}

class AutoResizedImage extends KGImage
{
	internalScale = 1;
	
	staticInstantiate()
	{
		return null; // Never cache!
	}
	
	constructor(path, internalScale)
	{
		super(path);

		this.internalScale = internalScale;
	}
	
	onload(event)
	{
		this.width = Math.ceil(this.data.width * this.internalScale);
		this.height = Math.ceil(this.data.height * this.internalScale);
		
		if(this.internalScale != 1)
		{
			const scaled = KG.$new('canvas');
			scaled.width = this.width;
			scaled.height = this.height;
			const scaledCtx = scaled.getContext('2d');
			
			scaledCtx.drawImage(this.data, 0, 0, this.data.width, this.data.height, 0, 0, this.width , this.height);

			this.data = scaled;
		}
		
		this.loaded = true;

		if(KG.system.scale != 1) this.resize(KG.system.scale); 
		
		if(this.loadCallback) this.loadCallback(this.path, true);
	}
}

export { EditMap, AutoResizedImage };

export default EditMap;