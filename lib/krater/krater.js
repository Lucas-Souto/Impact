import Input from './input.js';
import System from './system.js';
import {SoundManager, Music} from './sound.js';
import Loader from './loader.js';

// ------------------------------------Base------------------------------------
// Impact Game Engine 1.24
// http://impactjs.com/
// ----------------------------------------------------------------------------
// Krater Game Engine 0.1
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Native Object extensions

Number.prototype.map = function(istart, istop, ostart, ostop)
{
	return ostart + (ostop - ostart) * ((this - istart) / (istop - istart));
};

Number.prototype.limit = function(min, max)
{
	return Math.min(max, Math.max(min, this));
};

Number.prototype.round = function(precision)
{
	precision = Math.pow(10, precision || 0);

	return Math.round(this * precision) / precision;
};

Number.prototype.floor = function()
{
	return Math.floor(this);
};

Number.prototype.ceil = function()
{
	return Math.ceil(this);
};

Number.prototype.toInt = function()
{
	return (this | 0);
};

Number.prototype.toRad = function()
{
	return (this / 180) * Math.PI;
};

Number.prototype.toDeg = function()
{
	return (this * 180) / Math.PI;
};

Object.defineProperty(Array.prototype, 'erase', {value: function(item)
{
	for(let i = this.length; i--;)
	{
		if(this[i] === item) this.splice(i, 1);
	}

	return this;
}});

Object.defineProperty(Array.prototype, 'random', {value: function(item)
{
	return this[Math.floor(Math.random() * this.length)];
}});

Function.prototype.bind = Function.prototype.bind || function (oThis)
{
	if(typeof this !== "function") throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");

	const aArgs = Array.prototype.slice.call(arguments, 1),
		fToBind = this,
		fNOP = function () {},
		fBound = function ()
		{
			return fToBind.apply((this instanceof fNOP && oThis ? this : oThis), aArgs.concat(Array.prototype.slice.call(arguments)));
		};

	fNOP.prototype = this.prototype;
	fBound.prototype = new fNOP();

	return fBound;
};

// -----------------------------------------------------------------------------
// ig Namespace

class IG
{
	static game = null;
	static debug = null;
	static version = '1.24';
	static global = window;
	static modules = {};
	static resources = [];
	static ready = false;
	static baked = false;
	static nocache = '';
	static ua = {};
	static prefix = (window.ImpactPrefix || '');
	static lib = 'lib/';
	
	static _current = null;
	static _loadQueue = [];
	static _waitForOnload = 0;

	// -----------------------------------------------------------------------------
	// The main() function creates the system, input, sound and game objects,
	// creates a preloader and starts the run loop

	static system;
	static input;
	static soundManager;
	static music;
	static ready;

	static main(canvasId, gameClass, fps, width, height, scale, loaderClass)
	{
		IG.system = new System(canvasId, fps, width, height, scale || 1);
		IG.input = new Input();
		IG.soundManager = new SoundManager();
		IG.music = new Music();
		IG.ready = true;
		
		const loader = new (loaderClass || Loader)(gameClass, IG.resources);

		loader.load();
	}
	
	static $(selector)
	{
		return selector.charAt(0) == '#' ? document.getElementById(selector.substr(1)) : document.getElementsByTagName(selector);
	}
	
	static $new(name)
	{
		return document.createElement(name);
	}
	
	static copy(object)
	{
		if(!object || typeof(object) != 'object' || object instanceof HTMLElement) return object;
		else if(object instanceof Array)
		{
			let c = [];

			for(let i = 0, l = object.length; i < l; i++) c[i] = IG.copy(object[i]);

			return c;
		}
		else
		{
			let c = {};

			for(let i in object) c[i] = IG.copy(object[i]);

			return c;
		}
	}
	
	static merge(original, extended)
	{
		for(let key in extended)
		{
			const ext = extended[key];

			if(typeof(ext) != 'object' || ext instanceof HTMLElement || ext === null) original[key] = ext;
			else
			{
				if(!original[key] || typeof(original[key]) != 'object') original[key] = (ext instanceof Array) ? [] : {};

				IG.merge( original[key], ext );
			}
		}

		return original;
	}
	
	static ksort(obj)
	{
		if( !obj || typeof(obj) != 'object' ) return [];
		
		let keys = [], values = [];

		for(let i in obj) keys.push(i);
		
		keys.sort();

		for(let i = 0; i < keys.length; i++) values.push(obj[keys[i]]);
		
		return values;
	}

	// Ah, yes. I love vendor prefixes. So much fun!
	static setVendorAttribute(el, attr, val)
	{
		const uc = attr.charAt(0).toUpperCase() + attr.substr(1);
		el[attr] = el['ms' + uc] = el['moz' + uc] = el['webkit' + uc] = el['o' + uc] = val;
	}

	static getVendorAttribute(el, attr)
	{
		const uc = attr.charAt(0).toUpperCase() + attr.substr(1);

		return el[attr] || el['ms' + uc] || el['moz' + uc] || el['webkit' + uc] || el['o' + uc];
	}

	static normalizeVendorAttribute(el, attr)
	{
		const prefixedVal = IG.getVendorAttribute(el, attr);

		if(!el[attr] && prefixedVal) el[attr] = prefixedVal;
	}

	// This function normalizes getImageData to extract the real, actual
	// pixels from an image. The naive method recently failed on retina
	// devices with a backgingStoreRatio != 1
	static getImagePixels(image, x, y, width, height)
	{
		const canvas = IG.$new('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		const ctx = canvas.getContext('2d');
		
		// Try to draw pixels as accurately as possible
		System.SCALE.CRISP(canvas, ctx);

		const ratio = IG.getVendorAttribute(ctx, 'backingStorePixelRatio') || 1;

		IG.normalizeVendorAttribute(ctx, 'getImageDataHD');

		const realWidth = image.width / ratio, realHeight = image.height / ratio;

		canvas.width = Math.ceil( realWidth );
		canvas.height = Math.ceil( realHeight );

		ctx.drawImage( image, 0, 0, realWidth, realHeight );
		
		return ratio === 1 ? ctx.getImageData( x, y, width, height ) : ctx.getImageDataHD(x, y, width, height);
	}
	
	static addResource(resource)
	{
		IG.resources.push(resource);
	}
	
	static setNocache(set)
	{
		IG.nocache = set ? '?' + Date.now() : '';
	}
	
	// Stubs for ig.Debug
	static log = function() {};
	static assert = function(condition, msg) {};
	static show = function(name, number) {};
	static mark = function(msg, color) {};
	
	static boot()
	{
		if(document.location.href.match(/\?nocache/)) IG.setNocache(true);
		
		// Probe user agent string
		IG.ua.pixelRatio = window.devicePixelRatio || 1;
		IG.ua.viewport =
		{
			width: window.innerWidth,
			height: window.innerHeight
		};
		IG.ua.screen =
		{
			width: window.screen.availWidth * ig.ua.pixelRatio,
			height: window.screen.availHeight * ig.ua.pixelRatio
		};
		
		IG.ua.iPhone = /iPhone|iPod/i.test(navigator.userAgent);
		IG.ua.iPhone4 = (IG.ua.iPhone && IG.ua.pixelRatio == 2);
		IG.ua.iPad = /iPad/i.test(navigator.userAgent);
		IG.ua.android = /android/i.test(navigator.userAgent);
		IG.ua.winPhone = /Windows Phone/i.test(navigator.userAgent);
		IG.ua.iOS = IG.ua.iPhone || IG.ua.iPad;
		IG.ua.mobile = IG.ua.iOS || IG.ua.android || IG.ua.winPhone || /mobile/i.test(navigator.userAgent);
		IG.ua.touchDevice = (('ontouchstart' in window) || (window.navigator.msMaxTouchPoints));
	}
}

// -----------------------------------------------------------------------------
// Provide ig.setAnimation and ig.clearAnimation as a compatible way to use
// requestAnimationFrame if available or setInterval otherwise

// Use requestAnimationFrame if available
IG.normalizeVendorAttribute(window, 'requestAnimationFrame');

if(window.requestAnimationFrame)
{
	let next = 1, anims = {};

	IG.setAnimation = function(callback)
	{
		const current = next++;
		anims[current] = true;

		const animate = function()
		{
			if(!anims[current]) return; // deleted?

			window.requestAnimationFrame(animate);
			callback();
		};

		window.requestAnimationFrame(animate);

		return current;
	};

	IG.clearAnimation = (id) => delete anims[id];
}
else // [set/clear]Interval fallback
{
	IG.setAnimation = function(callback)
	{
		return window.setInterval(callback, 1000 / 60);
	};
	IG.clearAnimation = (id) => window.clearInterval(id);
}

// Merge the ImpactMixin - if present - into the 'ig' namespace. This gives other
// code the chance to modify 'ig' before it's doing any work.
if(window.ImpactMixin) IG.merge(IG, window.ImpactMixin);

export default IG;