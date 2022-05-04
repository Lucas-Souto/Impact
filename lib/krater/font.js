import KG from './krater.js';
import KGImage from './image.js';

class Font extends KGImage
{
	widthMap = [];
	indices = [];
	firstChar = 32;
	alpha = 1;
	letterSpacing = 1;
	lineSpacing = 0;
	color = null;

	static ALIGN =
	{
		LEFT: 0,
		RIGHT: 1,
		CENTER: 2
	};
	
	onload(ev)
	{
		this._loadMetrics(this.data);
		super.onload(ev);

		this.height -= 2; // last 2 lines contain no visual data
	}

	widthForString(text)
	{
		// Multiline?
		if(text.indexOf('\n') !== -1)
		{
			const lines = text.split( '\n' );
			let width = 0;

			for(let i = 0; i < lines.length; i++) width = Math.max(width, this._widthForLine(lines[i]));

			return width;
		}
		else return this._widthForLine(text);
	}
	
	_widthForLine(text)
	{
		let width = 0;

		for(let i = 0; i < text.length; i++) width += this.widthMap[text.charCodeAt(i) - this.firstChar];

		if(text.length > 0) width += this.letterSpacing * (text.length - 1);

		return width;
	}

	heightForString(text)
	{
		return text.split('\n').length * (this.height + this.lineSpacing);
	}
	
	draw(text, x, y, align)
	{
		if(typeof(text) != 'string') text = text.toString();
		
		// Multiline?
		if(text.indexOf('\n') !== -1)
		{
			const lines = text.split( '\n' );
			const lineHeight = this.height + this.lineSpacing;

			for(let i = 0; i < lines.length; i++) this.draw(lines[i], x, y + i * lineHeight, align);
			
			return;
		}
		
		if(align == Font.ALIGN.RIGHT || align == Font.ALIGN.CENTER)
		{
			const width = this._widthForLine(text);
			x -= align == Font.ALIGN.CENTER ? width / 2 : width;
		}

		if(this.alpha !== 1) KG.system.context.globalAlpha = this.alpha;

		let context = KG.system.context;
		const normalContext = KG.system.context;

		if (this.color !== null)
		{
			const tempCanvas = document.createElement('canvas');
			context = tempCanvas.getContext("2d");
			tempCanvas.width = normalContext.canvas.width;
			tempCanvas.height = normalContext.canvas.height;
		}

		for(let i = 0; i < text.length; i++)
		{
			const c = text.charCodeAt(i);
			x += this._drawChar(c - this.firstChar, x, y, context);
		}

		if (this.color !== null)
		{
			const tempCanvas = document.createElement('canvas');
			const tempContext = tempCanvas.getContext("2d");
			tempCanvas.width = context.canvas.width;
			tempCanvas.height = context.canvas.height;
			tempContext.fillStyle = this.color;

			tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

			tempContext.globalCompositeOperation = "destination-in";

			tempContext.drawImage(context.canvas, KG.system.getDrawPos(0), KG.system.getDrawPos(0));

			normalContext.drawImage(tempContext.canvas, KG.system.getDrawPos(0), KG.system.getDrawPos(0));
		}

		if(this.alpha !== 1) KG.system.context.globalAlpha = 1;

		KGImage.drawCount += text.length;
	}
	
	_drawChar(c, targetX, targetY, context)
	{
		if(!this.loaded || c < 0 || c >= this.indices.length) return 0;
		
		const scale = KG.system.scale;
		const charX = this.indices[c] * scale;
		const charY = 0;
		const charWidth = this.widthMap[c] * scale;
		const charHeight = this.height * scale;
		
		context.drawImage(this.data, charX, charY, charWidth, charHeight, KG.system.getDrawPos(targetX), KG.system.getDrawPos(targetY), charWidth, charHeight);
		
		return this.widthMap[c] + this.letterSpacing;
	}
	
	_loadMetrics(image)
	{
		// Draw the bottommost line of this font image into an offscreen canvas
		// and analyze it pixel by pixel.
		// A run of non-transparent pixels represents a character and its width
		
		this.widthMap = [];
		this.indices = [];
		
		const px = KG.getImagePixels(image, 0, image.height-1, image.width, 1);
		let currentWidth = 0;
		let x;

		for(x = 0; x < image.width; x++)
		{
			let index = x * 4 + 3; // alpha component of this pixel

			if(px.data[index] > 127) currentWidth++;
			else if(px.data[index] < 128 && currentWidth)
			{
				this.widthMap.push(currentWidth);
				this.indices.push(x - currentWidth);

				currentWidth = 0;
			}
		}

		this.widthMap.push(currentWidth);
		this.indices.push(x - currentWidth);
	}
}

export default Font;