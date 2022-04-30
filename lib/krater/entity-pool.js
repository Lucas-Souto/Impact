class EntityPool
{
	static pools = {};
	
	static enableFor(Class)
	{
		const EnabledClass = Base => class extends Base
		{
			staticInstantiate(x, y, settings)
			{
				return EntityPool.getFromPool(typeof this, x, y, settings);
			}
			
			erase()
			{
				EntityPool.putInPool(this);
			}
		};
		const MixedClass = Base => class extends Base {};

		return MixedClass(EnabledClass(Class));
	}
	
	static getFromPool(className, x, y, settings)
	{
		const pool = EntityPool.pools[className];

		if(!pool || !pool.length) return null;
		
		const instance = pool.pop();

		instance.reset(x, y, settings);

		return instance;
	}
	
	static putInPool(instance)
	{
		if(!EntityPool.pools[typeof instance]) EntityPool.pools[typeof instance] = [instance];
		else EntityPool.pools[typeof instance].push(instance);
	}
	
	static drainPool(className)
	{
		delete EntityPool.pools[className];
	}
	
	//Chamar no Game.loadLevel
	static drainAllPools()
	{
		EntityPool.pools = {};
	}
}

export default EntityPool;