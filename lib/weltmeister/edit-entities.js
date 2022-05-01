import KG from '../krater/krater.js';
import Game from '../krater/game.js';
import WM from './wm.js'
import * as Entities from '../game/entities/index.js';

class EditEntities
{
	visible = true;
	active = true;
	
	div = null;
	hotkey = -1;
	ignoreLastClick = false;
	name = 'entities';
	
	entities = [];
	namedEntities = {};
	selectedEntity = null;
	entityClasses = {};
	menu = null;
	selector = { size:{ x:2, y:2}, pos:{ x:0, y:0 }, offset:{ x:0, y:0 } };
	wasSelectedOnScaleBorder = false;
	gridSize = WM.config.entityGrid;
	entityDefinitions = null;
	
	constructor(div)
	{
		this.div = div;

		div.bind('mouseup', this.click.bind(this));
		this.div.children('.visible').bind('mousedown', this.toggleVisibilityClick.bind(this));
		
		this.menu = $('#entityMenu');

		this.importEntityClass();

		this.entityDefinitions = $('#entityDefinitions');
		
		$('#entityKey').bind('keydown', function(ev)
		{ 
			if(ev.which == 13)
			{ 
				$('#entityValue').focus();

				return false;
			}

			return true;
		});
		$('#entityValue').bind('keydown', this.setEntitySetting.bind(this));
	}
	
	clear()
	{
		this.entities = [];
		this.selectEntity(null);
	}
	
	sort()
	{
		this.entities.sort(Game.SORT.Z_INDEX);
	}
	
	// -------------------------------------------------------------------------
	// Loading, Saving
	
	importEntityClass()
	{
		for(let EntityClass in Entities)
		{
			if(EntityClass)
			{
				// Ignore entities that have the _wmIgnore flag
				if(!EntityClass._wmIgnore)
				{
					const className = EntityClass.toString();
					const a = $('<div/>',
					{
						'id': EntityClass,
						'href': '#',
						'html': className.replace('Entity', ''),
						'mouseup': this.newEntityClick.bind(this)
					});
					
					this.menu.append(a);
					this.entityClasses[className] = EntityClass;
				}
			}
		}
	}
	
	getEntityByName(name)
	{
		return this.namedEntities[name];
	}
	
	getSaveData()
	{
		let ents = [];

		for(let i = 0; i < this.entities.length; i++)
		{
			const ent = this.entities[i];
			const type = ent._wmClassName;
			const data = { type:type, x:ent.pos.x, y:ent.pos.y };
			
			let hasSettings = false;

			if (ent._wmSettings && ent._wmSettings.length > 0) hasSettings = true;

			if(hasSettings) data.settings = ent._wmSettings;
			
			ents.push(data);
		}

		return ents;
	}
	
	// -------------------------------------------------------------------------
	// Selecting
	
	selectEntityAt(x, y)
	{
		this.selector.pos = { x: x, y: y };
		
		// Find all possible selections
		let possibleSelections = [];

		for(let i = 0; i < this.entities.length; i++)
		{
			if(this.entities[i].touches(this.selector)) possibleSelections.push(this.entities[i]);
		}
		
		// Nothing found? Early out.
		if(!possibleSelections.length)
		{
			this.selectEntity(null);

			return false;
		}
		
		// Find the 'next' selection
		const selectedIndex = possibleSelections.indexOf(this.selectedEntity);
		const nextSelection = (selectedIndex + 1) % possibleSelections.length;
		const ent = possibleSelections[nextSelection];
		
		// Select it!
		this.selector.offset =
		{
			x: (x - ent.pos.x + ent.offset.x),
			y: (y - ent.pos.y + ent.offset.y)
		};

		this.selectEntity(ent);

		this.wasSelectedOnScaleBorder = this.isOnScaleBorder(ent, this.selector);

		return ent;
	}
	
	selectEntity(entity)
	{
		if(entity && entity != this.selectedEntity)
		{
			this.selectedEntity = entity;

			$('#entitySettings').fadeOut(100, (function()
			{
				this.loadEntitySettings();
				$('#entitySettings').fadeIn(100);
			}).bind(this));
		} 
		else if(!entity)
		{
			$('#entitySettings').fadeOut(100);
			$('#entityKey').blur();
			$('#entityValue').blur();
		}
		
		this.selectedEntity = entity;

		$('#entityKey').val('');
		$('#entityValue').val('');
	}
	
	// -------------------------------------------------------------------------
	// Creating, Deleting, Moving
	
	deleteSelectedEntity()
	{
		if(!this.selectedEntity) return false;
		
		KG.game.undo.commitEntityDelete(this.selectedEntity);
		
		this.removeEntity(this.selectedEntity);
		this.selectEntity(null);

		return true;
	}
	
	removeEntity(ent)
	{
		if(ent.name) delete this.namedEntities[ent.name];

		this.entities.erase(ent);
	}
	
	cloneSelectedEntity()
	{
		if(!this.selectedEntity) return false;
		
		const className = this.selectedEntity._wmClassName;
		const settings = KG.copy(this.selectedEntity._wmSettings);

		if(settings.name) settings.name = settings.name + '_clone';

		const x = this.selectedEntity.pos.x + this.gridSize;
		const y = this.selectedEntity.pos.y;
		const newEntity = this.spawnEntity(className, x, y, settings);
		newEntity._wmSettings = settings;

		this.selectEntity(newEntity);
		
		KG.game.undo.commitEntityCreate(newEntity);
		
		return true;
	}
	
	dragOnSelectedEntity(x, y)
	{
		if(!this.selectedEntity) return false;
		
		// scale or move?
		if(this.selectedEntity._wmScalable && this.wasSelectedOnScaleBorder) this.scaleSelectedEntity(x, y);
		else this.moveSelectedEntity(x, y);
		
		KG.game.undo.pushEntityEdit(this.selectedEntity);

		return true;
	}
	
	moveSelectedEntity(x, y)
	{
		x = Math.round((x - this.selector.offset.x ) / this.gridSize) * this.gridSize + this.selectedEntity.offset.x;
		y = Math.round((y - this.selector.offset.y ) / this.gridSize) * this.gridSize + this.selectedEntity.offset.y;
		
		// new position?
		if(this.selectedEntity.pos.x != x || this.selectedEntity.pos.y != y)
		{
			$('#entityDefinitionPosX').text(x);
			$('#entityDefinitionPosY').text(y);
			
			this.selectedEntity.pos.x = x;
			this.selectedEntity.pos.y = y;
		}
	}
	
	scaleSelectedEntity(x, y)
	{
		let scale = this.wasSelectedOnScaleBorder;
		
		if(!this.selectedEntity._wmSettings.size) this.selectedEntity._wmSettings.size = {};
		
		if(scale == 'n')
		{
			let h = this.selectedEntity.pos.y - Math.round(y / this.gridSize) * this.gridSize;

			if(this.selectedEntity.size.y + h <= this.gridSize) h = (this.selectedEntity.size.y - this.gridSize) * -1;

			this.selectedEntity.size.y += h;
			this.selectedEntity.pos.y -= h;
		}
		else if(scale == 's')
		{
			let h = Math.round(y / this.gridSize) * this.gridSize - this.selectedEntity.pos.y;
			this.selectedEntity.size.y = Math.max(this.gridSize, h);
		}
		else if(scale == 'e')
		{
			w = Math.round(x / this.gridSize) * this.gridSize - this.selectedEntity.pos.x;
			this.selectedEntity.size.x = Math.max(this.gridSize, w);
		}
		else if(scale == 'w')
		{
			w = this.selectedEntity.pos.x - Math.round( x / this.gridSize ) * this.gridSize;

			if(this.selectedEntity.size.x + w <= this.gridSize) w = (this.selectedEntity.size.x - this.gridSize) * -1;

			this.selectedEntity.size.x += w;
			this.selectedEntity.pos.x -= w;
		}

		this.selectedEntity._wmSettings.size.x = this.selectedEntity.size.x;
		this.selectedEntity._wmSettings.size.y = this.selectedEntity.size.y;
		
		this.loadEntitySettings();
	}
	
	newEntityClick(ev)
	{
		this.hideMenu();

		const newEntity = this.spawnEntity(ev.target.id, 0, 0, {});

		this.selectEntity(newEntity);
		this.moveSelectedEntity(this.selector.pos.x, this.selector.pos.y);
		KG.editor.setModified();
		
		KG.game.undo.commitEntityCreate(newEntity);
	}
	
	spawnEntity(className, x, y, settings)
	{
		settings = settings || {};
		
		const entityClass = Entities[className];
		
		if(entityClass)
		{
			const newEntity = new (entityClass)(x, y, settings);
			newEntity._wmInEditor = true;
			newEntity._wmClassName = className;
			newEntity._wmSettings = {};
			
			for(let s in settings) newEntity._wmSettings[s] = settings[s];
			
			newEntity.merge(newEntity._wmSettings);
			
			this.entities.push(newEntity);

			if(settings.name) this.namedEntities[settings.name] = newEntity;

			this.sort();

			return newEntity;
		}

		return null;
	}
	
	isOnScaleBorder(entity, selector)
	{	
		const border = 2;
		const w = selector.pos.x - entity.pos.x;
		const h = selector.pos.y - entity.pos.y;
		
		if(w < border) return 'w';

		if(w > entity.size.x - border) return 'e';
		
		if(h < border) return 'n';

		if(h > entity.size.y - border) return 's';
		
		return false;
	}
	
	// -------------------------------------------------------------------------
	// Settings
	
	loadEntitySettings()
	{
		
		if(!this.selectedEntity) return;

		let html = `<div class="entityDefinition">
						<p class="key">x</p><span>:</span><p id="entityDefinitionPosX" class="value">${this.selectedEntity.pos.x}</p>
					</div>
					<div class="entityDefinition">
						<p class="key">y</p><span>:</span><p id="entityDefinitionPosY" class="value">${this.selectedEntity.pos.y}</p>
					</div>`;
		html += this.loadEntitySettingsRecursive(this.selectedEntity._wmSettings);

		this.entityDefinitions.html(html);
		
		const className = this.selectedEntity._wmClassName.replace(/^Entity/, '');

		$('#entityClass').text(className);
		$('.entityDefinition').bind('mouseup', this.selectEntitySetting);
	}
	
	loadEntitySettingsRecursive(settings, path)
	{
		path = path || "";
		let html = "";

		for(let key in settings )
		{
			const value = settings[key];

			if(typeof(value) == 'object') html += this.loadEntitySettingsRecursive(value, path + key + ".");
			else
			{
				html += `<div class="entityDefinition">
							<p class="key">${path+key}</p><span>:</span><p class="value">${value}</p>
						</div>`;
			}
		}
		
		return html;
	}
	
	setEntitySetting(ev)
	{
		if(ev.which != 13) return true;

		const key = $('#entityKey').val();
		let value = $('#entityValue').val();
		const floatVal = parseFloat(value);

		if(value == floatVal) value = floatVal;
		
		if(key == 'name')
		{
			if(this.selectedEntity.name) delete this.namedEntities[this.selectedEntity.name];

			this.namedEntities[value] = this.selectedEntity;
		}
		
		if(key == 'x') this.selectedEntity.pos.x = Math.round(value);
		else if(key == 'y') this.selectedEntity.pos.y = Math.round(value);
		else
		{
			this.writeSettingAtPath(this.selectedEntity._wmSettings, key, value);

			this.selectedEntity.merge(this.selectedEntity._wmSettings);
		}
		
		this.sort();
		
		KG.game.setModified();
		KG.game.draw();
		
		$('#entityKey').val('');
		$('#entityValue').val('');
		$('#entityValue').blur();
		this.loadEntitySettings();
		
		$('#entityKey').focus();

		return false;
	}
	
	writeSettingAtPath(root, path, value)
	{
		path = path.split('.');
		let cur = root;

		for(let i = 0; i < path.length; i++)
		{
			const n = path[i];

			if(i < path.length - 1 && typeof(cur[n]) != 'object') cur[n] = {};
			
			if(i == path.length - 1) cur[n] = value;

			cur = cur[n];		
		}
		
		this.trimObject(root);
	}
	
	trimObject(obj)
	{
		let isEmpty = true;

		for(let i in obj )
		{
			if((obj[i] === "") || (typeof(obj[i]) == 'object' && this.trimObject(obj[i]))) delete obj[i];
			
			if(typeof(obj[i]) != 'undefined') isEmpty = false;
		}
		
		return isEmpty;
	}
	
	selectEntitySetting(ev)
	{
		$('#entityKey').val($(this).children('.key').text());
		$('#entityValue').val($(this).children('.value').text());
		$('#entityValue').select();
	}
	
	// -------------------------------------------------------------------------
	// UI
	
	setHotkey(hotkey)
	{
		this.hotkey = hotkey;

		this.div.attr('title', `Select Layer ('${this.hotkey}')`);
	}
	
	showMenu(x, y)
	{
		this.selector.pos =
		{ 
			x: Math.round((x + KG.editor.screen.x) / this.gridSize) * this.gridSize, 
			y: Math.round((y + KG.editor.screen.y) / this.gridSize) * this.gridSize
		};

		this.menu.css({ top: (y * KG.system.scale + 2), left: (x * KG.system.scale + 2) });
		this.menu.show();
	}
	
	hideMenu()
	{
		KG.editor.mode = KG.editor.MODE.DEFAULT;

		this.menu.hide();
	}
	
	setActive(active)
	{
		this.active = active;

		if(active) this.div.addClass('layerActive');
		else this.div.removeClass('layerActive');
	}
	
	toggleVisibility()
	{
		this.visible ^= 1;

		if(this.visible) this.div.children('.visible').addClass('checkedVis');
		else this.div.children('.visible').removeClass('checkedVis');

		KG.game.draw();
	}
	
	toggleVisibilityClick(ev)
	{
		if(!this.active) this.ignoreLastClick = true;

		this.toggleVisibility()
	}
	
	click()
	{
		if(this.ignoreLastClick)
		{
			this.ignoreLastClick = false;

			return;
		}

		KG.editor.setActiveLayer( 'entities' );
	}
	
	mousemove(x, y)
	{
		this.selector.pos = { x: x, y: y };
		
		if(this.selectedEntity)
		{
			if(this.selectedEntity._wmScalable && this.selectedEntity.touches(this.selector))
			{
				const scale = this.isOnScaleBorder(this.selectedEntity, this.selector);

				if(scale == 'n' || scale == 's')
				{
					$('body').css('cursor', 'ns-resize');

					return;
				}
				else if(scale == 'e' || scale == 'w')
				{
					$('body').css('cursor', 'ew-resize');

					return;
				}
			}
		}
		
		$('body').css('cursor', 'default');
	}
	
	// -------------------------------------------------------------------------
	// Drawing
	
	draw()
	{
		if(this.visible)
		{
			for(let i = 0; i < this.entities.length; i++) this.drawEntity(this.entities[i]);
		}
	}
	
	drawEntity(ent)
	{
		// entity itself
		ent.draw();
		
		// box
		if(ent._wmDrawBox)
		{
			KG.system.context.fillStyle = ent._wmBoxColor || 'rgba(128, 128, 128, 0.9)';
			KG.system.context.fillRect(KG.system.getDrawPos(ent.pos.x - KG.game.screen.x), KG.system.getDrawPos(ent.pos.y - KG.game.screen.y), 
				ent.size.x * KG.system.scale, ent.size.y * KG.system.scale);
		}
		
		if(WM.config.labels.draw)
		{
			// description
			const className = ent._wmClassName.replace(/^Entity/, '');
			const description = className + (ent.name ? ': ' + ent.name : '');
			
			// text-shadow
			KG.system.context.fillStyle = 'rgba(0,0,0,0.4)';
			KG.system.context.fillText(description, KG.system.getDrawPos(ent.pos.x - KG.game.screen.x), KG.system.getDrawPos(ent.pos.y - KG.game.screen.y + 0.5));
			
			// text
			KG.system.context.fillStyle = WM.config.colors.primary;
			KG.system.context.fillText(description, KG.system.getDrawPos(ent.pos.x - KG.game.screen.x), KG.system.getDrawPos(ent.pos.y - KG.game.screen.y));
		}
		
		// line to targets
		if(typeof(ent.target) == 'object')
		{
			for(let t in ent.target) this.drawLineToTarget(ent, ent.target[t]);
		}
	}
	
	drawLineToTarget(ent, target)
	{
		target = KG.game.getEntityByName(target);

		if(!target) return;
		
		KG.system.context.strokeStyle = '#fff';
		KG.system.context.lineWidth = 1;
		
		KG.system.context.beginPath();
		KG.system.context.moveTo(KG.system.getDrawPos(ent.pos.x + ent.size.x/2 - KG.game.screen.x), KG.system.getDrawPos(ent.pos.y + ent.size.y/2 - KG.game.screen.y));
		KG.system.context.lineTo(KG.system.getDrawPos(target.pos.x + target.size.x/2 - KG.game.screen.x), KG.system.getDrawPos(target.pos.y + target.size.y/2 - KG.game.screen.y));
		KG.system.context.stroke();
		KG.system.context.closePath();
	}
	
	drawCursor(x, y)
	{
		if(this.selectedEntity)
		{
			KG.system.context.lineWidth = 1;
			KG.system.context.strokeStyle = WM.config.colors.highlight;
			KG.system.context.strokeRect( 
				KG.system.getDrawPos(this.selectedEntity.pos.x - KG.editor.screen.x) - .5, 
				KG.system.getDrawPos(this.selectedEntity.pos.y - KG.editor.screen.y) - .5, 
				this.selectedEntity.size.x * KG.system.scale + 1, this.selectedEntity.size.y * KG.system.scale + 1
			);
		}
	}
}

export default EditEntities;