import KG from './krater.js';

class KGImage
{
	data = null;
	width = 0;
	height = 0;
	loaded = false;
	failed = false;
	loadCallback = null;
	path = '';

	static drawCount = 0;
	static cache = {};
	static reloadCache = () =>
	{
		for(let path in KGImage.cache) KGImage.cache[path].reload();
	};
	
	staticInstantiate(path)
	{
		return KGImage.cache[path] || null;
	}
	
	constructor(path)
	{
		this.path = path;

		this.load();
	}
	
	load(loadCallback)
	{
		if(this.loaded)
		{
			if(loadCallback) loadCallback(this.path, true);
			
			return;
		}
		else if(!this.loaded && KG.ready)
		{
			this.loadCallback = loadCallback || null;
			
			this.data = new Image();
			this.data.onload = this.onload.bind(this);
			this.data.onerror = this.onerror.bind(this);
			this.data.src = KG.prefix + this.path + KG.nocache;
		}
		else KG.addResource(this);
		
		KGImage.cache[this.path] = this;
	}
	
	reload()
	{ 
		this.loaded = false;
		this.data = new Image();
		this.data.onload = this.onload.bind(this);
		this.data.src = this.path + '?' + Date.now();
	}
	
	onload(event)
	{
		this.width = this.data.width;
		this.height = this.data.height;
		this.loaded = true;
		
		if(KG.system.scale != 1) this.resize(KG.system.scale);
		
		if(this.loadCallback) this.loadCallback(this.path, true);
	}
	
	onerror(event)
	{
		this.failed = true;
		
		if(this.loadCallback) this.loadCallback(this.path, false);
	}
	
	resize(scale)
	{
		// Nearest-Neighbor scaling
		
		// The original image is drawn into an offscreen canvas of the same size
		// and copied into another offscreen canvas with the new size. 
		// The scaled offscreen canvas becomes the image (data) of this object.
		
		const origPixels = KG.getImagePixels(this.data, 0, 0, this.width, this.height);
		
		const widthScaled = this.width * scale;
		const heightScaled = this.height * scale;

		const scaled = KG.$new('canvas');
		scaled.width = widthScaled;
		scaled.height = heightScaled;
		const scaledCtx = scaled.getContext('2d');
		const scaledPixels = scaledCtx.getImageData(0, 0, widthScaled, heightScaled);
			
		for(let y = 0; y < heightScaled; y++)
		{
			for(let x = 0; x < widthScaled; x++)
			{
				const index = (Math.floor(y / scale) * this.width + Math.floor(x / scale)) * 4;
				const indexScaled = (y * widthScaled + x) * 4;
				scaledPixels.data[indexScaled] = origPixels.data[index];
				scaledPixels.data[indexScaled + 1] = origPixels.data[index + 1];
				scaledPixels.data[indexScaled + 2] = origPixels.data[index + 2];
				scaledPixels.data[indexScaled + 3] = origPixels.data[index + 3];
			}
		}

		scaledCtx.putImageData(scaledPixels, 0, 0);

		this.data = scaled;
	}
	
	draw(targetX, targetY, sourceX, sourceY, width, height)
	{
		if(!this.loaded) return;
		
		const scale = KG.system.scale;
		sourceX = sourceX ? sourceX * scale : 0;
		sourceY = sourceY ? sourceY * scale : 0;
		width = (width ? width : this.width) * scale;
		height = (height ? height : this.height) * scale;
		
		KG.system.context.drawImage(this.data, sourceX, sourceY, width, height, KG.system.getDrawPos(targetX), KG.system.getDrawPos(targetY), width, height);
		
		KGImage.drawCount++;
	}
	
	drawTile(targetX, targetY, tile, tileWidth, tileHeight, flipX, flipY)
	{
		tileHeight = tileHeight ? tileHeight : tileWidth;
		
		if(!this.loaded || tileWidth > this.width || tileHeight > this.height) return;
		
		const scale = KG.system.scale;
		const tileWidthScaled = Math.floor(tileWidth * scale);
		const tileHeightScaled = Math.floor(tileHeight * scale);
		
		const scaleX = flipX ? -1 : 1;
		const scaleY = flipY ? -1 : 1;
		
		if(flipX || flipY)
		{
			KG.system.context.save();
			KG.system.context.scale(scaleX, scaleY);
		}

		KG.system.context.drawImage( 
			this.data, 
			(Math.floor(tile * tileWidth) % this.width) * scale,
			(Math.floor(tile * tileWidth / this.width) * tileHeight) * scale,
			tileWidthScaled,
			tileHeightScaled,
			KG.system.getDrawPos(targetX) * scaleX - (flipX ? tileWidthScaled : 0), 
			KG.system.getDrawPos(targetY) * scaleY - (flipY ? tileHeightScaled : 0),
			tileWidthScaled,
			tileHeightScaled
		);

		if(flipX || flipY) KG.system.context.restore();
		
		KGImage.drawCount++;
	}
}

export default KGImage;