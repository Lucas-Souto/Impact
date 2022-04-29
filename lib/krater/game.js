import KG from './krater.js';
import Entity from './entity.js';
import CollisionMap from './collision-map.js';
import BackgroundMap from './background-map.js';

class Game
{
	
	clearColor = '#000000';
	gravity = 0;
	screen = { x: 0, y: 0 };
	_rscreen = { x: 0, y: 0 };
	
	entities = [];
	
	namedEntities = {};
	collisionMap = CollisionMap.staticNoCollision;
	backgroundMaps = [];
	backgroundAnims = {};
	
	autoSort = false;
	sortBy = null;
	
	cellSize = 64;
	
	_deferredKill = [];
	_levelToLoad = null;
	_doSortEntities = false;

	static SORT =
	{
		Z_INDEX: function(a, b){ return a.zIndex - b.zIndex; },
		POS_X: function(a, b){ return (a.pos.x + a.size.x) - (b.pos.x + b.size.x); },
		POS_Y: function(a, b){ return (a.pos.y + a.size.y) - (b.pos.y + b.size.y); }
	};

	constructor()
	{
		this.sortBy = this.sortBy || Game.SORT.Z_INDEX;
		KG.game = this;
	}
	
	static staticInstantiate()
	{
		this.sortBy = this.sortBy || Game.SORT.Z_INDEX;
		KG.game = this;

		return null;
	}
	
	loadLevel(data)
	{
		this.screen = { x: 0, y: 0 };

		// Entities
		this.entities = [];
		this.namedEntities = {};

		for(let i = 0; i < data.entities.length; i++)
		{
			const ent = data.entities[i];

			this.spawnEntity(ent.type, ent.x, ent.y, ent.settings);
		}

		this.sortEntities();
		
		// Map Layer
		this.collisionMap = CollisionMap.staticNoCollision;
		this.backgroundMaps = [];

		for(let i = 0; i < data.layer.length; i++)
		{
			const ld = data.layer[i];

			if(ld.name == 'collision') this.collisionMap = new CollisionMap(ld.tilesize, ld.data);
			else
			{
				const newMap = new BackgroundMap(ld.tilesize, ld.data, ld.tilesetName);
				newMap.anims = this.backgroundAnims[ld.tilesetName] || {};
				newMap.repeat = ld.repeat;
				newMap.distance = ld.distance;
				newMap.foreground = !!ld.foreground;
				newMap.preRender = !!ld.preRender;
				newMap.name = ld.name;

				this.backgroundMaps.push( newMap );
			}
		}
		
		// Call post-init ready function on all entities
		for(let i = 0; i < this.entities.length; i++) this.entities[i].ready();
	}
	
	loadLevelDeferred(data)
	{
		this._levelToLoad = data;
	}
	
	getMapByName(name)
	{
		if(name == 'collision') return this.collisionMap;
		
		for(let i = 0; i < this.backgroundMaps.length; i++)
		{
			if(this.backgroundMaps[i].name == name) return this.backgroundMaps[i];
		}
		
		return null;
	}
	
	getEntityByName(name)
	{
		return this.namedEntities[name];
	}
	
	getEntitiesByType(type)
	{
		const entityClass = typeof(type) === 'string' ? KG.global[type] : type;
			
		let a = [];

		for(let i = 0; i < this.entities.length; i++)
		{
			const ent = this.entities[i];

			if(ent instanceof entityClass && !ent._killed) a.push(ent);
		}

		return a;
	}
	
	spawnEntity(type, x, y, settings)
	{
		const entityClass = typeof(type) === 'string' ? KG.global[type] : type;
		
		if(!entityClass) throw("Can't spawn entity of type " + type);

		const ent = new (entityClass)(x, y, settings || {});

		this.entities.push(ent);

		if(ent.name) this.namedEntities[ent.name] = ent;

		return ent;
	}
	
	sortEntities()
	{
		this.entities.sort(this.sortBy);
	}
	
	sortEntitiesDeferred()
	{
		this._doSortEntities = true;
	}
	
	removeEntity(ent)
	{
		// Remove this entity from the named entities
		if(ent.name) delete this.namedEntities[ent.name];
		
		// We can not remove the entity from the entities[] array in the midst
		// of an update cycle, so remember all killed entities and remove
		// them later.
		// Also make sure this entity doesn't collide anymore and won't get
		// updated or checked
		ent._killed = true;
		ent.type = Entity.TYPE.NONE;
		ent.checkAgainst = Entity.TYPE.NONE;
		ent.collides = Entity.COLLIDES.NEVER;

		this._deferredKill.push(ent);
	}
	
	run()
	{
		this.update();
		this.draw();
	}
	
	update()
	{
		// load new level?
		if(this._levelToLoad)
		{
			this.loadLevel(this._levelToLoad);

			this._levelToLoad = null;
		}
		
		// update entities
		this.updateEntities();
		this.checkEntities();
		
		// remove all killed entities
		for(let i = 0; i < this._deferredKill.length; i++)
		{
			this._deferredKill[i].erase();
			this.entities.erase(this._deferredKill[i]);
		}

		this._deferredKill = [];
		
		// sort entities?
		if(this._doSortEntities || this.autoSort)
		{
			this.sortEntities();

			this._doSortEntities = false;
		}
		
		// update background animations
		for(let tileset in this.backgroundAnims)
		{
			const anims = this.backgroundAnims[tileset];

			for(let a in anims) anims[a].update();
		}
	}
	
	updateEntities()
	{
		for(let i = 0; i < this.entities.length; i++)
		{
			const ent = this.entities[i];

			if(!ent._killed) ent.update();
		}
	}
	
	draw()
	{
		if(this.clearColor) KG.system.clear(this.clearColor);
		
		// This is a bit of a circle jerk. Entities reference game._rscreen 
		// instead of game.screen when drawing themselfs in order to be 
		// "synchronized" to the rounded(?) screen position
		this._rscreen.x = KG.system.getDrawPos(this.screen.x) / KG.system.scale;
		this._rscreen.y = KG.system.getDrawPos(this.screen.y) / KG.system.scale;
		
		let mapIndex;

		for(mapIndex = 0; mapIndex < this.backgroundMaps.length; mapIndex++)
		{
			const map = this.backgroundMaps[mapIndex];

			if(map.foreground) break; // All foreground layers are drawn after the entities

			map.setScreenPos(this.screen.x, this.screen.y);
			map.draw();
		}
		
		this.drawEntities();
		
		for(mapIndex; mapIndex < this.backgroundMaps.length; mapIndex++)
		{
			const map = this.backgroundMaps[mapIndex];
			
			map.setScreenPos(this.screen.x, this.screen.y);
			map.draw();
		}
	}
	
	drawEntities()
	{
		for(let i = 0; i < this.entities.length; i++) this.entities[i].draw();
	}
	
	checkEntities()
	{
		// Insert all entities into a spatial hash and check them against any
		// other entity that already resides in the same cell. Entities that are
		// bigger than a single cell, are inserted into each one they intersect
		// with.
		
		// A list of entities, which the current one was already checked with,
		// is maintained for each entity.
		
		let hash = {};

		for(let e = 0; e < this.entities.length; e++)
		{
			const entity = this.entities[e];
			
			// Skip entities that don't check, don't get checked and don't collide
			if(entity.type == Entity.TYPE.NONE && entity.checkAgainst == Entity.TYPE.NONE && entity.collides == Entity.COLLIDES.NEVER) continue;
			
			let checked = {};
			const xmin = Math.floor(entity.pos.x / this.cellSize),
				ymin = Math.floor(entity.pos.y / this.cellSize),
				xmax = Math.floor((entity.pos.x + entity.size.x) / this.cellSize) + 1,
				ymax = Math.floor((entity.pos.y + entity.size.y) / this.cellSize) + 1;
			
			for(let x = xmin; x < xmax; x++)
			{
				for(let y = ymin; y < ymax; y++)
				{
					// Current cell is empty - create it and insert!
					if(!hash[x])
					{
						hash[x] = {};
						hash[x][y] = [entity];
					}
					else if(!hash[x][y]) hash[x][y] = [entity];
					else // Check against each entity in this cell, then insert
					{
						let cell = hash[x][y];

						for(let c = 0; c < cell.length; c++)
						{
							// Intersects and wasn't already checkd?
							if(entity.touches(cell[c]) && !checked[cell[c].id])
							{
								checked[cell[c].id] = true;

								Entity.checkPair(entity, cell[c]);
							}
						}

						cell.push(entity);
					}
				} // end for y size
			} // end for x size
		} // end for entities
	}
}

export default Game;