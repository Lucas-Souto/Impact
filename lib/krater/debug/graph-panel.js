import KG from '../krater.js';
import DebugPanel from './panel.js';

const oldOnGameSet = KG.system.onGameSet;
KG.system.onGameSet = () =>
{
	oldOnGameSet.bind(KG.system)();

	const game = KG.game;
	const oldDraw = game.draw,
		oldUpdate = game.update,
		oldCheckEntities = game.checkEntities;

	game.draw = () =>
	{
		KG.graph.beginClock('draw');
		oldDraw.bind(game)();
		KG.graph.endClock('draw');
	};

	game.update = () =>
	{
		KG.graph.beginClock('update');
		oldUpdate.bind(game)();
		KG.graph.endClock('update');
	};

	game.checkEntities = () =>
	{
		KG.graph.beginClock('checks');
		oldCheckEntities.bind(game)();
		KG.graph.endClock('checks');
	};
}

class DebugGraphPanel extends DebugPanel
{
	clocks = {};
	marks = [];
	textY = 0;
	height = 128;
	ms = 64;
	timeBeforeRun = 0;
	
	constructor(name, label)
	{
		super(name, label);
		
		this.mark16ms = (this.height - (this.height / this.ms) * 16).round();
		this.mark33ms = (this.height - (this.height / this.ms) * 33).round();
		this.msHeight = this.height / this.ms;
		
		this.graph = KG.$new('canvas');
		this.graph.width = window.innerWidth;
		this.graph.height = this.height;

		this.container.appendChild(this.graph);

		this.ctx = this.graph.getContext('2d');
		this.ctx.fillStyle = '#444';

		this.ctx.fillRect(0, this.mark16ms, this.graph.width, 1);
		this.ctx.fillRect(0, this.mark33ms, this.graph.width, 1);
		
		this.addGraphMark('16ms', this.mark16ms);
		this.addGraphMark('33ms', this.mark33ms);
		
		this.addClock('draw', 'Draw', '#13baff');
		this.addClock('update', 'Entity Update', '#bb0fff');
		this.addClock('checks', 'Entity Checks & Collisions', '#a2e908');
		this.addClock('lag', 'System Lag', '#f26900');
		
		KG.mark = this.mark.bind(this);
		KG.graph = this;
	}
	
	addGraphMark(name, height)
	{
		const span = KG.$new('span');
		span.className = 'ig_debug_graph_mark';
		span.textContent = name;
		span.style.top = height.round() + 'px';

		this.container.appendChild(span);
	}
	
	addClock(name, description, color)
	{		
		const mark = KG.$new('span');
		mark.className = 'ig_debug_legend_color';
		mark.style.backgroundColor = color;
		
		const number = KG.$new('span');
		number.className = 'ig_debug_legend_number';

		number.appendChild(document.createTextNode('0'));
		
		const legend = KG.$new('span');
		legend.className = 'ig_debug_legend';

		legend.appendChild(mark);
		legend.appendChild(document.createTextNode(description +' ('));
		legend.appendChild(number);
		legend.appendChild(document.createTextNode('ms)'));
		
		this.container.appendChild(legend);
		
		this.clocks[name] =
		{
			description: description,
			color: color,
			current: 0,
			start: Date.now(),
			avg: 0,
			html: number
		};
	}
	
	beginClock(name, offset)
	{
		this.clocks[name].start = Date.now() + (offset || 0);
	}
	
	endClock(name)
	{
		const c = this.clocks[name];
		c.current = Math.round(Date.now() - c.start);
		c.avg = c.avg * 0.8 + c.current * 0.2;
	}
	
	mark(msg, color)
	{
		if(this.active) this.marks.push({ msg:msg, color:(color||'#fff') });
	}
	
	beforeRun()
	{
		this.endClock('lag');
		
		this.timeBeforeRun = Date.now();
	}
	
	afterRun()
	{
		const frameTime = Date.now() - this.timeBeforeRun;
		const nextFrameDue = (1000 / KG.system.fps) - frameTime;

		this.beginClock('lag', Math.max(nextFrameDue, 0));
		
		let x = this.graph.width-1;
		let y = this.height;
		
		this.ctx.drawImage(this.graph, -1, 0);
		
		this.ctx.fillStyle = '#000';

		this.ctx.fillRect(x, 0, 1, this.height);
		
		this.ctx.fillStyle = '#444';

		this.ctx.fillRect(x, this.mark16ms, 1, 1);
		
		this.ctx.fillStyle = '#444';

		this.ctx.fillRect(x, this.mark33ms, 1, 1);
		
		for(let ci in this.clocks)
		{
			const c = this.clocks[ci];
			c.html.textContent = c.avg.toFixed(2);
			
			if(c.color && c.current > 0)
			{
				this.ctx.fillStyle = c.color;
				const h = c.current * this.msHeight;
				y -= h;

				this.ctx.fillRect(x, y, 1, h);

				c.current = 0;
			}
		}
		
		this.ctx.textAlign = 'right';
		this.ctx.textBaseline = 'top';
		this.ctx.globalAlpha = 0.5;
		
		for(let i = 0; i < this.marks.length; i++)
		{
			const m = this.marks[i];
			this.ctx.fillStyle = m.color;

			this.ctx.fillRect(x, 0, 1, this.height);

			if(m.msg)
			{
				this.ctx.fillText(m.msg, x - 1, this.textY);

				this.textY = (this.textY + 8) % 32;
			}
		}

		this.ctx.globalAlpha = 1;
		this.marks = [];
	}
}

KG.debug.addPanel(
{
	type: DebugGraphPanel,
	name: 'graph',
	label: 'Performance'
});

export default DebugGraphPanel;