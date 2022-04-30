import KG from './krater.js';

class Loader
{
	resources = [];
	
	gameClass = null;
	status = 0;
	done = false;
	
	_unloaded = [];
	_drawStatus = 0;
	_intervalId = 0;
	_loadCallbackBound = null;
	
	constructor(gameClass, resources)
	{
		this.gameClass = gameClass;
		this.resources = resources;
		this._loadCallbackBound = this._loadCallback.bind(this);
		
		for(let i = 0; i < this.resources.length; i++) this._unloaded.push(this.resources[i].path);
	}
	
	load()
	{
		KG.system.clear('#000');
		
		if(!this.resources.length)
		{
			this.end();

			return;
		}

		for(let i = 0; i < this.resources.length; i++) this.loadResource(this.resources[i]);
		
		this._intervalId = setInterval(this.draw.bind(this), 16);
	}
	
	loadResource(res)
	{
		res.load(this._loadCallbackBound);
	}
	
	end()
	{
		if(this.done) return;
		
		this.done = true;

		clearInterval(this._intervalId);
		KG.system.setGame(this.gameClass);
	}
	
	draw()
	{
		this._drawStatus += (this.status - this._drawStatus) / 5;
		const s = KG.system.scale;
		const w = (KG.system.width * 0.6).floor();
		const h = (KG.system.height * 0.1).floor();
		const x = (KG.system.width * 0.5 - w / 2).floor();
		const y = (KG.system.height * 0.5 - h / 2).floor();
		
		KG.system.context.fillStyle = '#000';
		
		KG.system.context.fillRect(0, 0, KG.system.width, KG.system.height);
		
		KG.system.context.fillStyle = '#fff';

		KG.system.context.fillRect(x * s, y * s, w * s, h * s);
		
		KG.system.context.fillStyle = '#000';

		KG.system.context.fillRect(x * s + s, y * s + s, w * s - s - s, h * s - s - s);
		
		KG.system.context.fillStyle = '#fff';

		KG.system.context.fillRect(x * s, y * s, w * s * this._drawStatus, h * s);
	}
	
	_loadCallback(path, status)
	{
		if(status) this._unloaded.erase(path);
		else throw('Failed to load resource: ' + path);
		
		this.status = 1 - (this._unloaded.length / this.resources.length);

		if(this._unloaded.length == 0) setTimeout(this.end.bind(this), 250);// all done?
	}
}

export default Loader;