import KG from '../krater.js';
import KGImage from '../image.js';
import { DebugOption } from './panel.js';

const system = KG.system;
const oldRun = system.run;
const oldSetGameNow = system.setGameNow;
system.run = () =>
{
	KG.debug.beforeRun();
	oldRun.bind(system)();
	KG.debug.afterRun();
};

system.setGameNow = (gameClass) =>
{
	oldSetGameNow.bind(system)(gameClass);
	KG.debug.ready();
};

class Debug
{
	options = {};
	panels = {};
	numbers = {};
	container = null;
	panelMenu = null;
	numberContainer = null;
	activePanel = null;
	
	debugTime = 0;
	debugTickAvg = 0.016;
	debugRealTime = Date.now();
	
	constructor()
	{
		// Inject the Stylesheet
		const style = KG.$new('link');
		style.rel = 'stylesheet';
		style.type = 'text/css';
		style.href = KG.prefix + 'lib/krater/debug/debug.css';

		KG.$('body')[0].appendChild(style);

		// Create the Debug Container
		this.container = KG.$new('div');
		this.container.className ='ig_debug';

		KG.$('body')[0].appendChild(this.container);
		
		// Create and add the Menu Container
		this.panelMenu = KG.$new('div');
		this.panelMenu.innerHTML = '<div class="ig_debug_head">Krater.Debug:</div>';
		this.panelMenu.className ='ig_debug_panel_menu';
		
		this.container.appendChild(this.panelMenu);
		
		// Create and add the Stats Container
		this.numberContainer = KG.$new('div');
		this.numberContainer.className ='ig_debug_stats';

		this.panelMenu.appendChild(this.numberContainer);
		
		// Set KG.log(), KG.assert() and KG.show()
		if(window.console && window.console.log && window.console.assert)
		{
			// Can't use .bind() on native functions in IE9 :/
			KG.log = console.log.bind ? console.log.bind(console) : console.log;
			KG.assert = console.assert.bind ? console.assert.bind(console) : console.assert;
		}

		KG.show = this.showNumber.bind(this);
	}
	
	addNumber(name)
	{
		const number = KG.$new('span');		

		this.numberContainer.appendChild(number);
		this.numberContainer.appendChild(document.createTextNode(name));
		
		this.numbers[name] = number;
	}
	
	showNumber(name, number)
	{
		if(!this.numbers[name]) this.addNumber(name);

		this.numbers[name].textContent = number;
	}
	
	addPanel(panelDef)
	{
		// Create the panel and options
		const panel = new (panelDef.type)(panelDef.name, panelDef.label);
		
		if(panelDef.options)
		{
			for(let i = 0; i < panelDef.options.length; i++)
			{
				const opt = panelDef.options[i];

				panel.addOption(new DebugOption(opt.name, opt.object, opt.property));
			}
		}
		
		this.panels[panel.name] = panel;
		panel.container.style.display = 'none';
		this.container.appendChild(panel.container);
		
		// Create the menu item
		const menuItem = KG.$new('div');
		menuItem.className = 'ig_debug_menu_item';
		menuItem.textContent = panel.label;
		menuItem.addEventListener(
			'click',
			(function(ev){ this.togglePanel(panel); }).bind(this),
			false
		);
		panel.menuItem = menuItem;
		
		// Insert menu item in alphabetical order into the menu
		let inserted = false;

		for(let i = 1; i < this.panelMenu.childNodes.length; i++)
		{
			const cn = this.panelMenu.childNodes[i];

			if(cn.textContent > panel.label)
			{
				this.panelMenu.insertBefore(menuItem, cn);

				inserted = true;

				break;
			}
		}

		if(!inserted) this.panelMenu.appendChild(menuItem);// Not inserted? Append at the end!
	}
	
	showPanel(name)
	{
		this.togglePanel(this.panels[name]);
	}
	
	togglePanel(panel)
	{
		if(panel != this.activePanel && this.activePanel)
		{
			this.activePanel.toggle(false);

			this.activePanel.menuItem.className = 'ig_debug_menu_item';
			this.activePanel = null;
		}
		
		const dsp = panel.container.style.display;
		const active = (dsp != 'block');

		panel.toggle(active);

		panel.menuItem.className = 'ig_debug_menu_item' + (active ? ' active' : '');
		
		if(active) this.activePanel = panel;
	}
	
	ready()
	{
		for(let p in this.panels) this.panels[p].ready();
	}
	
	beforeRun()
	{
		const timeBeforeRun = Date.now();
		this.debugTickAvg = this.debugTickAvg * 0.8 + (timeBeforeRun - this.debugRealTime) * 0.2;
		this.debugRealTime = timeBeforeRun;
		
		if(this.activePanel) this.activePanel.beforeRun();
	}
	
	afterRun()
	{
		const frameTime = Date.now() - this.debugRealTime;
		const nextFrameDue = (1000 / KG.system.fps) - frameTime;
		
		this.debugTime = this.debugTime * 0.8 + frameTime * 0.2;
		
		if(this.activePanel) this.activePanel.afterRun();
		
		this.showNumber('ms',  this.debugTime.toFixed(2));
		this.showNumber('fps',  Math.round(1000/this.debugTickAvg));
		this.showNumber('draws', KGImage.drawCount);

		if(KG.game && KG.game.entities) this.showNumber('entities', KG.game.entities.length);
		
		KGImage.drawCount = 0;
	}
}

// Create the debug instance!
KG.debug = new Debug();