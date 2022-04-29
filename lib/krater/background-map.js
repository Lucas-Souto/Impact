import IG from './krater.js';
import Map from './map.js';
import IGImage from './image.js';
import System from './system.js';

class BackgroundMap extends Map
{	
	tiles = null;
	scroll = { x: 0, y: 0 };
	distance = 1;
	repeat = false;
	tilesetName = '';
	foreground = false;
	enabled = true;
	
	preRender = false;
	preRenderedChunks = null;
	chunkSize = 512;
	debugChunks = false;
	
	anims = {};
	
	constructor(tilesize, data, tileset)
	{
		super(tilesize, data);
		this.setTileset(tileset);
	}
	
	setTileset(tileset)
	{
		this.tilesetName = tileset instanceof IGImage ? tileset.path : tileset;
		this.tiles = new IGImage(this.tilesetName);
		this.preRenderedChunks = null;
	}
	
	setScreenPos(x, y)
	{
		this.scroll.x = x / this.distance;
		this.scroll.y = y / this.distance;
	}
	
	preRenderMapToChunks()
	{
		const totalWidth = this.width * this.tilesize * IG.system.scale,
			totalHeight = this.height * this.tilesize * IG.system.scale;
		
		// If this layer is smaller than the chunkSize, adjust the chunkSize
		// accordingly, so we don't have as much overdraw
		this.chunkSize = Math.min(Math.max(totalWidth, totalHeight), this.chunkSize);
			
		const chunkCols = Math.ceil(totalWidth / this.chunkSize),
			chunkRows = Math.ceil(totalHeight / this.chunkSize);
		
		this.preRenderedChunks = [];

		for(let y = 0; y < chunkRows; y++)
		{
			this.preRenderedChunks[y] = [];
			
			for(let x = 0; x < chunkCols; x++)
			{
				const chunkWidth = (x == chunkCols - 1) ? totalWidth - x * this.chunkSize : this.chunkSize;
				const chunkHeight = (y == chunkRows - 1) ? totalHeight - y * this.chunkSize : this.chunkSize;
					
				this.preRenderedChunks[y][x] = this.preRenderChunk(x, y, chunkWidth, chunkHeight);
			}
		}
	}
	
	preRenderChunk(cx, cy, w, h)
	{
		const tw = w / this.tilesize / IG.system.scale + 1,
			th = h / this.tilesize / IG.system.scale + 1;
		
		const nx = (cx * this.chunkSize / IG.system.scale) % this.tilesize,
			ny = (cy * this.chunkSize / IG.system.scale) % this.tilesize;
		
		const tx = Math.floor(cx * this.chunkSize / this.tilesize / IG.system.scale),
			ty = Math.floor(cy * this.chunkSize / this.tilesize / IG.system.scale);
		
		
		const chunk = IG.$new('canvas');
		chunk.width = w;
		chunk.height = h;
		chunk.retinaResolutionEnabled = false; // Opt out for Ejecta
		
		const chunkContext = chunk.getContext('2d');
		System.scaleMode(chunk, chunkContext);
		
		const screenContext = IG.system.context;
		IG.system.context = chunkContext;
		
		for(let x = 0; x < tw; x++)
		{
			for(let y = 0; y < th; y++)
			{
				if(x + tx < this.width && y + ty < this.height)
				{
					const tile = this.data[y + ty][x + tx];

					if(tile) this.tiles.drawTile(x * this.tilesize - nx, y * this.tilesize - ny, tile - 1, this.tilesize);
				}
			}
		}

		IG.system.context = screenContext;
		
		// Workaround for Chrome 49 bug - handling many offscreen canvases
		// seems to slow down the browser significantly. So we convert the
		// canvas to an image.
		const image = new Image();
		image.src = chunk.toDataURL();
		image.width = chunk.width;
		image.height = chunk.height;

		return image;
	}
	
	draw()
	{
		if(!this.tiles.loaded || !this.enabled) return;
		
		if(this.preRender) this.drawPreRendered();
		else this.drawTiled();
	}	
	
	drawPreRendered()
	{
		if(!this.preRenderedChunks) this.preRenderMapToChunks();
		
		let dx = IG.system.getDrawPos(this.scroll.x),
			dy = IG.system.getDrawPos(this.scroll.y);
		
		if(this.repeat)
		{
			const w = this.width * this.tilesize * IG.system.scale;
			dx = (dx % w + w) % w;

			const h = this.height * this.tilesize * IG.system.scale;
			dy = (dy % h + h) % h;
		}
		
		let minChunkX = Math.max(Math.floor(dx / this.chunkSize), 0),
			minChunkY = Math.max(Math.floor(dy / this.chunkSize), 0),
			maxChunkX = Math.ceil((dx + IG.system.realWidth) / this.chunkSize),
			maxChunkY = Math.ceil((dy + IG.system.realHeight) / this.chunkSize),
			maxRealChunkX = this.preRenderedChunks[0].length,
			maxRealChunkY = this.preRenderedChunks.length;
		
		if(!this.repeat)
		{
			maxChunkX = Math.min(maxChunkX, maxRealChunkX);
			maxChunkY = Math.min(maxChunkY, maxRealChunkY);
		}
		
		let nudgeY = 0;

		for(let cy = minChunkY; cy < maxChunkY; cy++)
		{
			let nudgeX = 0;

			for(let cx = minChunkX; cx < maxChunkX; cx++)
			{
				const chunk = this.preRenderedChunks[cy % maxRealChunkY][cx % maxRealChunkX];
				
				const x = -dx + cx * this.chunkSize - nudgeX;
				const y = -dy + cy * this.chunkSize - nudgeY;

				IG.system.context.drawImage(chunk, x, y);

				IGImage.drawCount++;
				
				if(this.debugChunks)
				{
					IG.system.context.strokeStyle = '#f0f';

					IG.system.context.strokeRect(x, y, this.chunkSize, this.chunkSize);
				}
				
				// If we repeat in X and this chunk's width wasn't the full chunk size
				// and the screen is not already filled, we need to draw another chunk
				// AND nudge it to be flush with the last chunk
				if(this.repeat && chunk.width < this.chunkSize && x + chunk.width < IG.system.realWidth)
				{
					nudgeX += this.chunkSize - chunk.width;

					// Only re-calculate maxChunkX during initial row to avoid
					// unnecessary off-screen draws on subsequent rows.
					if(cy == minChunkY) maxChunkX++;
				}
			}
			
			// Same as above, but for Y
			if(this.repeat && chunk.height < this.chunkSize && y + chunk.height < IG.system.realHeight)
			{
				nudgeY += this.chunkSize - chunk.height;
				maxChunkY++;
			}
		}
	}
	
	drawTiled()
	{	
		let tile = 0,
			anim = null,
			tileOffsetX = (this.scroll.x / this.tilesize).toInt(),
			tileOffsetY = (this.scroll.y / this.tilesize).toInt(),
			pxOffsetX = this.scroll.x % this.tilesize,
			pxOffsetY = this.scroll.y % this.tilesize,
			pxMinX = -pxOffsetX - this.tilesize,
			pxMinY = -pxOffsetY - this.tilesize,
			pxMaxX = IG.system.width + this.tilesize - pxOffsetX,
			pxMaxY = IG.system.height + this.tilesize - pxOffsetY;
		
		// FIXME: could be sped up for non-repeated maps: restrict the for loops
		// to the map size instead of to the screen size and skip the 'repeat'
		// checks inside the loop.
		
		for(let mapY = -1, pxY = pxMinY; pxY < pxMaxY; mapY++, pxY += this.tilesize)
		{
			let tileY = mapY + tileOffsetY;
				
			// Repeat Y?
			if(tileY >= this.height || tileY < 0)
			{
				if(!this.repeat) continue;

				tileY = (tileY % this.height + this.height) % this.height;
			}
			
			for(let mapX = -1, pxX = pxMinX; pxX < pxMaxX; mapX++, pxX += this.tilesize)
			{
				let tileX = mapX + tileOffsetX;
				
				// Repeat X?
				if(tileX >= this.width || tileX < 0)
				{
					if(!this.repeat) continue;

					tileX = (tileX % this.width + this.width) % this.width;
				}
				
				// Draw!
				if((tile = this.data[tileY][tileX]))
				{
					if((anim = this.anims[tile-1])) anim.draw(pxX, pxY);
					else this.tiles.drawTile( pxX, pxY, tile-1, this.tilesize );
				}
			} // end for x
		} // end for y
	}
}

export default BackgroundMap;