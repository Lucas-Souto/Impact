import IG from './krater.js';
import Timer from './timer.js';

class System
{
	static SCALE =
	{
		CRISP: function(canvas, context)
		{
			IG.setVendorAttribute(context, 'imageSmoothingEnabled', false);

			canvas.style.imageRendering = '-moz-crisp-edges';
			canvas.style.imageRendering = '-o-crisp-edges';
			canvas.style.imageRendering = '-webkit-optimize-contrast';
			canvas.style.imageRendering = 'crisp-edges';
			canvas.style.msInterpolationMode = 'nearest-neighbor'; // No effect on Canvas :/
		},
		SMOOTH: function(canvas, context)
		{
			IG.setVendorAttribute(context, 'imageSmoothingEnabled', true);

			canvas.style.imageRendering = '';
			canvas.style.msInterpolationMode = '';
		}
	};
	static scaleMode = System.SCALE.SMOOTH;

	DRAW =
	{
		AUTHENTIC: (p) => { return Math.round(p) * this.scale; },
		SMOOTH: (p) => { return Math.round(p * this.scale); },
		SUBPIXEL: (p) => { return p * this.scale; }
	};
	drawMode = this.DRAW.SMOOTH;

	fps = 30;
	width = 320;
	height = 240;
	realWidth = 320;
	realHeight = 240;
	scale = 1;
	
	tick = 0;
	animationId = 0;
	newGameClass = null;
	running = false;
	
	delegate = null;
	clock = null;
	canvas = null;
	context = null;
	
	constructor(canvasId, fps, width, height, scale)
	{
		this.fps = fps;
		
		this.clock = new Timer();
		this.canvas = IG.$(canvasId);
		this.resize(width, height, scale);
		this.context = this.canvas.getContext('2d');
		
		this.getDrawPos = this.drawMode;

		// Automatically switch to crisp scaling when using a scale
		// other than 1
		if(this.scale != 1) System.scaleMode = System.SCALE.CRISP;

		System.scaleMode(this.canvas, this.context);
	}
	
	resize(width, height, scale)
	{
		this.width = width;
		this.height = height;
		this.scale = scale || this.scale;
		
		this.realWidth = this.width * this.scale;
		this.realHeight = this.height * this.scale;
		this.canvas.width = this.realWidth;
		this.canvas.height = this.realHeight;
	}
	
	setGame(gameClass)
	{
		if(this.running) this.newGameClass = gameClass;
		else this.setGameNow(gameClass);
	}
	
	setGameNow(gameClass)
	{
		IG.game = new (gameClass)();

		IG.system.setDelegate(IG.game);
	}
	
	setDelegate(object)
	{
		if(typeof(object.run) === 'function')
		{
			this.delegate = object;

			this.startRunLoop();
		}
		else throw( 'System.setDelegate: No run() function in object' );
	}
	
	stopRunLoop()
	{
		IG.clearAnimation(this.animationId);

		this.running = false;
	}
	
	startRunLoop()
	{
		this.stopRunLoop();

		this.animationId = IG.setAnimation(this.run.bind(this));
		this.running = true;
	}
	
	clear(color)
	{
		this.context.fillStyle = color;
		this.context.fillRect( 0, 0, this.realWidth, this.realHeight );
	}
	
	run()
	{
		Timer.step();
		this.tick = this.clock.tick();
		
		this.delegate.run();
		IG.input.clearPressed();
		
		if(this.newGameClass)
		{
			this.setGameNow(this.newGameClass);

			this.newGameClass = null;
		}
	}
	
	getDrawPos = null; // Set through constructor
}

export default System;