import IG from './impact';

class Timer
{
	target = 0;
	base = 0;
	last = 0;
	pausedAt = 0;

	static _last = 0;
	static time = Number.MIN_VALUE;
	static timeScale = 1;
	static maxStep = 0.05;
	
	constructor(seconds)
	{
		this.base = Timer.time;
		this.last = Timer.time;
		
		this.target = seconds || 0;
	}
	
	set(seconds)
	{
		this.target = seconds || 0;
		this.base = Timer.time;
		this.pausedAt = 0;
	}
	
	reset()
	{
		this.base = Timer.time;
		this.pausedAt = 0;
	}
	
	tick()
	{
		var delta = Timer.time - this.last;
		this.last = Timer.time;

		return (this.pausedAt ? 0 : delta);
	}
	
	delta()
	{
		return (this.pausedAt || Timer.time) - this.base - this.target;
	}

	pause()
	{
		if(!this.pausedAt) this.pausedAt = Timer.time;
	}

	unpause()
	{
		if(this.pausedAt)
		{
			this.base += Timer.time - this.pausedAt;
			this.pausedAt = 0;
		}
	}

	static step = function()
	{
		const current = Date.now();
		const delta = (current - Timer._last) / 1000;

		Timer.time += Math.min(delta, Timer.maxStep) * Timer.timeScale;
		Timer._last = current;
	};
}

export default Timer;