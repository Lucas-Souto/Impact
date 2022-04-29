import IG from './krater.js';

class Input
{
	static KEY =
	{
		'MOUSE1': -1,
		'MOUSE2': -3,
		'MWHEEL_UP': -4,
		'MWHEEL_DOWN': -5,
		
		'BACKSPACE': 8,
		'TAB': 9,
		'ENTER': 13,
		'PAUSE': 19,
		'CAPS': 20,
		'ESC': 27,
		'SPACE': 32,
		'PAGE_UP': 33,
		'PAGE_DOWN': 34,
		'END': 35,
		'HOME': 36,
		'LEFT_ARROW': 37,
		'UP_ARROW': 38,
		'RIGHT_ARROW': 39,
		'DOWN_ARROW': 40,
		'INSERT': 45,
		'DELETE': 46,
		'_0': 48,
		'_1': 49,
		'_2': 50,
		'_3': 51,
		'_4': 52,
		'_5': 53,
		'_6': 54,
		'_7': 55,
		'_8': 56,
		'_9': 57,
		'A': 65,
		'B': 66,
		'C': 67,
		'D': 68,
		'E': 69,
		'F': 70,
		'G': 71,
		'H': 72,
		'I': 73,
		'J': 74,
		'K': 75,
		'L': 76,
		'M': 77,
		'N': 78,
		'O': 79,
		'P': 80,
		'Q': 81,
		'R': 82,
		'S': 83,
		'T': 84,
		'U': 85,
		'V': 86,
		'W': 87,
		'X': 88,
		'Y': 89,
		'Z': 90,
		'NUMPAD_0': 96,
		'NUMPAD_1': 97,
		'NUMPAD_2': 98,
		'NUMPAD_3': 99,
		'NUMPAD_4': 100,
		'NUMPAD_5': 101,
		'NUMPAD_6': 102,
		'NUMPAD_7': 103,
		'NUMPAD_8': 104,
		'NUMPAD_9': 105,
		'MULTIPLY': 106,
		'ADD': 107,
		'SUBSTRACT': 109,
		'DECIMAL': 110,
		'DIVIDE': 111,
		'F1': 112,
		'F2': 113,
		'F3': 114,
		'F4': 115,
		'F5': 116,
		'F6': 117,
		'F7': 118,
		'F8': 119,
		'F9': 120,
		'F10': 121,
		'F11': 122,
		'F12': 123,
		'SHIFT': 16,
		'CTRL': 17,
		'ALT': 18,
		'PLUS': 187,
		'COMMA': 188,
		'MINUS': 189,
		'PERIOD': 190
	};

	bindings = {};
	actions = {};
	presses = {};
	locks = {};
	delayedKeyup = {};
	
	isUsingMouse = false;
	isUsingKeyboard = false;
	isUsingAccelerometer = false;
	mouse = { x: 0, y: 0 };
	accel = { x: 0, y: 0, z: 0 };
	
	initMouse()
	{
		if(this.isUsingMouse) return;

		this.isUsingMouse = true;
		IG.system.canvas.addEventListener('wheel', this.mousewheel.bind(this), false);
		
		IG.system.canvas.addEventListener('contextmenu', this.contextmenu.bind(this), false);
		IG.system.canvas.addEventListener('mousedown', this.keydown.bind(this), false);
		IG.system.canvas.addEventListener('mouseup', this.keyup.bind(this), false);
		IG.system.canvas.addEventListener('mousemove', this.mousemove.bind(this), false);
		
		if(IG.ua.touchDevice)
		{
			// Standard
			IG.system.canvas.addEventListener('touchstart', this.keydown.bind(this), false);
			IG.system.canvas.addEventListener('touchend', this.keyup.bind(this), false);
			IG.system.canvas.addEventListener('touchcancel', this.keyup.bind(this), false);
			IG.system.canvas.addEventListener('touchmove', this.mousemove.bind(this), false);
			
			// MS
			IG.system.canvas.addEventListener('MSPointerDown', this.keydown.bind(this), false);
			IG.system.canvas.addEventListener('MSPointerUp', this.keyup.bind(this), false);
			IG.system.canvas.addEventListener('MSPointerMove', this.mousemove.bind(this), false);
			IG.system.canvas.style.msTouchAction = 'none';
		}
	}

	initKeyboard()
	{
		if(this.isUsingKeyboard) return;

		this.isUsingKeyboard = true;

		window.addEventListener('keydown', this.keydown.bind(this), false);
		window.addEventListener('keyup', this.keyup.bind(this), false);
	}
	
	initAccelerometer()
	{
		if(this.isUsingAccelerometer) return;

		this.isUsingAccelerometer = true;

		window.addEventListener('devicemotion', this.devicemotion.bind(this), false);
	}

	mousewheel(event)
	{
		const code = event.deltaY < 0 ? Input.KEY.MWHEEL_UP : Input.KEY.MWHEEL_DOWN;
		const action = this.bindings[code];

		if(action)
		{
			this.actions[action] = true;
			this.presses[action] = true;
			this.delayedKeyup[action] = true;

			event.stopPropagation();
			event.preventDefault();
		}
	}
	
	mousemove(event)
	{		
		const internalWidth = IG.system.canvas.offsetWidth || IG.system.realWidth;
		const scale = IG.system.scale * (internalWidth / IG.system.realWidth);
		
		let pos = { left: 0, top: 0 };

		if(IG.system.canvas.getBoundingClientRect) pos = IG.system.canvas.getBoundingClientRect();
		
		const ev = event.touches ? event.touches[0] : event;
		this.mouse.x = (ev.clientX - pos.left) / scale;
		this.mouse.y = (ev.clientY - pos.top) / scale;
	}
	
	contextmenu(event)
	{
		if(this.bindings[Input.KEY.MOUSE2])
		{
			event.stopPropagation();
			event.preventDefault();
		}
	}
	
	keydown(event)
	{
		const tag = event.target.tagName;

		if(tag === 'INPUT' || tag === 'TEXTAREA') return;
		
		const code = event.type == 'keydown' ? event.keyCode : (event.button == 2 ? Input.KEY.MOUSE2 : Input.KEY.MOUSE1);
		
		// Focus window element for mouse clicks. Prevents issues when
		// running the game in an iframe.
		if(code < 0 && !IG.ua.mobile) window.focus();
		
		if(event.type == 'touchstart' || event.type == 'mousedown') this.mousemove(event);
			
		const action = this.bindings[code];

		if(action)
		{
			this.actions[action] = true;

			if(!this.locks[action])
			{
				this.presses[action] = true;
				this.locks[action] = true;
			}

			event.preventDefault();
		}
	}
	
	keyup(event)
	{
		const tag = event.target.tagName;

		if(tag === 'INPUT' || tag === 'TEXTAREA') return;
		
		const code = event.type == 'keyup' ? event.keyCode : (event.button == 2 ? Input.KEY.MOUSE2 : Input.KEY.MOUSE1);
		
		const action = this.bindings[code];

		if(action)
		{
			this.delayedKeyup[action] = true;

			event.preventDefault();
		}
	}
	
	devicemotion(event)
	{
		this.accel = event.accelerationIncludingGravity;
	}
	
	bind(key, action)
	{
		if(key < 0) this.initMouse();
		else if(key > 0) this.initKeyboard();

		this.bindings[key] = action;
	}
	
	bindTouch(selector, action)
	{
		const element = IG.$(selector);
		const that = this;

		element.addEventListener('touchstart', (ev) => that.touchStart(ev, action), false);
		element.addEventListener('touchend', (ev) => that.touchEnd(ev, action), false);
		element.addEventListener('MSPointerDown', (ev) => that.touchStart(ev, action), false);
		element.addEventListener('MSPointerUp', (ev) => that.touchEnd(ev, action), false);
	}
	
	unbind(key)
	{
		const action = this.bindings[key];
		this.delayedKeyup[action] = true;
		this.bindings[key] = null;
	}
	
	unbindAll()
	{
		this.bindings = {};
		this.actions = {};
		this.presses = {};
		this.locks = {};
		this.delayedKeyup = {};
	}
	
	state(action)
	{
		return this.actions[action];
	}
	
	pressed(action)
	{
		return this.presses[action];
	}
	
	released(action)
	{
		return !!this.delayedKeyup[action];
	}
		
	clearPressed()
	{
		for(let action in this.delayedKeyup)
		{
			this.actions[action] = false;
			this.locks[action] = false;
		}

		this.delayedKeyup = {};
		this.presses = {};
	}
	
	touchStart(event, action)
	{
		this.actions[action] = true;
		this.presses[action] = true;
		
		event.stopPropagation();
		event.preventDefault();

		return false;
	}
	
	touchEnd(event, action)
	{
		this.delayedKeyup[action] = true;

		event.stopPropagation();
		event.preventDefault();

		return false;
	}
}

export default Input;