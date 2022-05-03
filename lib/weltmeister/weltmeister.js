import WM from './wm.js';
import KG from '../krater/krater.js';
import Input from '../krater/input.js';
import KGImage from '../krater/image.js';
import EditMap from './edit-map.js';
import EditEntities from './edit-entities.js';
import SelectFileDropdown from './select-file-dropdown.js';
import {ModalDialog, ModalDialogPathSelect} from './modal-dialogs.js';
import Undo from './undo.js';

class Weltmeister
{	
	mode = null;
	MODE =
	{
		DRAW: 1,
		TILESELECT: 2,
		ENTITYSELECT: 4
	};

	levelData = {};
	layers = [];
	entities = null;
	activeLayer = null;
	collisionLayer = null;
	selectedEntity = null;
	
	screen = { x: 0, y: 0 };
	_rscreen = { x: 0, y: 0 };
	mouseLast = { x: -1, y: -1 };
	waitForModeChange = false;
	
	tilesetSelectDialog = null;
	levelSavePathDialog = null;
	labelsStep = 32;
	
	collisionSolid = 1;
	
	loadDialog = null;
	saveDialog = null;
	loseChangesDialog = null;
	deleteLayerDialog = null;
	fileName = 'untitled.js';
	filePath = WM.config.project.levelPath + 'untitled.js';
	modified = false;
	needsDraw = true;
	
	undo = null;
	
	constructor()
	{
		KG.game = KG.editor = this;
		
		KG.system.context.textBaseline = 'top';
		KG.system.context.font = WM.config.labels.font;
		this.labelsStep = WM.config.labels.step;
		
		// Dialogs
		this.loadDialog = new ModalDialogPathSelect('Load Level', 'Load', 'scripts');
		this.loadDialog.onOk = this.load.bind(this);

		this.loadDialog.setPath(WM.config.project.levelPath);
		$('#levelLoad').bind('click', this.showLoadDialog.bind(this));
		$('#levelNew').bind('click', this.showNewDialog.bind(this));
		
		this.saveDialog = new ModalDialogPathSelect('Save Level', 'Save', 'scripts');
		this.saveDialog.onOk = this.save.bind(this);

		this.saveDialog.setPath(WM.config.project.levelPath);
		$('#levelSaveAs').bind('click', this.saveDialog.open.bind(this.saveDialog));
		$('#levelSave').bind('click', this.saveQuick.bind(this));
		
		this.loseChangesDialog = new ModalDialog('Lose all changes?');
		
		this.deleteLayerDialog = new ModalDialog('Delete Layer? NO UNDO!');
		this.deleteLayerDialog.onOk = this.removeLayer.bind(this);
		
		this.mode = this.MODE.DEFAULT;
		
		this.tilesetSelectDialog = new SelectFileDropdown('#layerTileset', WM.config.api.browse, 'images');
		this.entities = new EditEntities($('#layerEntities'));
		
		$('#layers').sortable({ update: this.reorderLayers.bind(this) });
		$('#layers').disableSelection();
		this.resetModified();
		
		// Events/Input
		if(WM.config.touchScroll)
		{
			// Setup wheel event
			KG.system.canvas.addEventListener('wheel', this.touchScroll.bind(this), false);

			// Unset MWHEEL_* binds
			delete wm.config.binds['MWHEEL_UP'];
			delete wm.config.binds['MWHEEL_DOWN'];
		}

		for(let key in WM.config.binds) KG.input.bind(Input.KEY[key], WM.config.binds[key]);

		KG.input.keydownCallback = this.keydown.bind(this);
		KG.input.keyupCallback = this.keyup.bind(this);
		KG.input.mousemoveCallback = this.mousemove.bind(this);
		
		$(window).resize(this.resize.bind(this));
		$(window).bind('keydown', this.uikeydown.bind(this));
		$(window).bind('beforeunload', this.confirmClose.bind(this));
	
		$('#buttonAddLayer').bind('click', this.addLayer.bind(this));
		$('#buttonRemoveLayer').bind('click', this.deleteLayerDialog.open.bind(this.deleteLayerDialog));
		$('#buttonSaveLayerSettings').bind('click', this.saveLayerSettings.bind(this));
		$('#reloadImages').bind('click', KGImage.reloadCache);
		$('#layerIsCollision').bind('change', this.toggleCollisionLayer.bind(this));
		
		// Always unfocus current input field when clicking the canvas
		$('#canvas').mousedown(() => $('input:focus').blur());
		
		this.undo = new Undo(WM.config.undoLevels);
		
		if(WM.config.loadLastLevel)
		{
			const path = $.cookie('wmLastLevel');

			if(path) this.load(null, path);
		}
		
		KG.setAnimation(this.drawIfNeeded.bind(this));
	}
	
	uikeydown(event)
	{
		if(event.target.type == 'text') return;
		
		const key = String.fromCharCode(event.which);

		if(key.match(/^\d$/))
		{
			const index = parseInt(key);
			const name = $('#layers div.layer:nth-child(' + index + ') span.name').text();
			
			const layer = name == 'entities' ? this.entities : this.getLayerWithName(name);
				
			if(layer)
			{
				if(event.shiftKey) layer.toggleVisibility();
				else this.setActiveLayer(layer.name);
			}
		}
	}
	
	showLoadDialog()
	{
		if(this.modified)
		{
			this.loseChangesDialog.onOk = this.loadDialog.open.bind(this.loadDialog);

			this.loseChangesDialog.open();
		}
		else this.loadDialog.open();
	}
	
	showNewDialog()
	{
		if(this.modified)
		{
			this.loseChangesDialog.onOk = this.loadNew.bind(this);

			this.loseChangesDialog.open();
		}
		else this.loadNew();
	}
	
	setModified()
	{
		if(!this.modified)
		{
			this.modified = true;

			this.setWindowTitle();
		}
	}
	
	resetModified()
	{
		this.modified = false;

		this.setWindowTitle();
	}
	
	setWindowTitle()
	{
		document.title = this.fileName + (this.modified ? ' * ' : ' - ') + 'Weltmeister';

		$('#headerTitle').text(this.fileName).toggleClass('unsaved', this.modified);
	}
	
	confirmClose(event)
	{
		let rv = undefined;

		if(this.modified && WM.config.askBeforeClose) rv = 'There are some unsaved changes. Leave anyway?';

		event.returnValue = rv;

		return rv;
	}
	
	resize()
	{
		KG.system.resize(Math.floor(Weltmeister.getMaxWidth() / WM.config.view.zoom), Math.floor(Weltmeister.getMaxHeight() / WM.config.view.zoom), WM.config.view.zoom);

		KG.system.context.textBaseline = 'top';
		KG.system.context.font = WM.config.labels.font;

		this.draw();
	}
	
	scroll(x, y)
	{
		this.screen.x -= x;
		this.screen.y -= y;

		this._rscreen.x = Math.round(this.screen.x * KG.system.scale) / KG.system.scale;
		this._rscreen.y = Math.round(this.screen.y * KG.system.scale) / KG.system.scale;

		for(let i = 0; i < this.layers.length; i++) this.layers[i].setScreenPos(this.screen.x, this.screen.y);
	}
	
	drag()
	{
		var dx = KG.input.mouse.x - this.mouseLast.x,
			dy = KG.input.mouse.y - this.mouseLast.y;

		this.scroll(dx, dy);
	}

	touchScroll(event)
	{
		event.preventDefault();

		this.scroll(-event.deltaX / KG.system.scale, -event.deltaY / KG.system.scale);
		this.draw();

		return false;
	}

	zoom(delta)
	{
		let z = WM.config.view.zoom;
		const mx = KG.input.mouse.x * z,
			my = KG.input.mouse.y * z;
		
		if(z <= 1)
		{
			if(delta < 0) z /= 2;
			else z *= 2;
		}
		else z += delta;
		
		WM.config.view.zoom = z.limit(WM.config.view.zoomMin, WM.config.view.zoomMax);
		WM.config.labels.step = Math.round(this.labelsStep / WM.config.view.zoom);

		$('#zoomIndicator').text(WM.config.view.zoom + 'x' ).stop(true,true).show().delay(300).fadeOut();
		
		// Adjust mouse pos and screen coordinates
		KG.input.mouse.x = mx / WM.config.view.zoom;
		KG.input.mouse.y = my / WM.config.view.zoom;

		this.drag();
		
		for(let i in KGImage.cache) KGImage.cache[i].resize(WM.config.view.zoom);
		
		this.resize();
	}
	
	// -------------------------------------------------------------------------
	// Loading
	
	loadNew()
	{
		$.cookie('wmLastLevel', null);

		while(this.layers.length)
		{
			this.layers[0].destroy();
			this.layers.splice(0, 1);
		}

		this.screen = { x: 0, y: 0 };

		this.entities.clear();

		this.fileName = 'untitled.js';
		this.filePath = WM.config.project.levelPath + 'untitled.js';
		this.levelData = {};

		this.saveDialog.setPath(this.filePath);
		this.resetModified();
		this.draw();
	}
	
	load(dialog, path)
	{
		this.filePath = path;

		this.saveDialog.setPath(path);

		this.fileName = path.replace(/^.*\//,'');
		
		$.ajax(
		{
			url: (path + '?nocache=' + Math.random()), 
			dataType: 'text',
			async: false,
			success: this.loadResponse.bind(this),
			error: () => $.cookie('wmLastLevel', null)
		});
	}
	
	loadResponse(data)
	{
		$.cookie('wmLastLevel', this.filePath);
		
		// extract JSON from a module's JS
		const jsonMatch = data.match(/\/\*JSON\[\*\/([\s\S]*?)\/\*\]JSON\*\//);
		data = JSON.parse(jsonMatch ? jsonMatch[1] : data);
		this.levelData = data;
		
		while(this.layers.length)
		{
			this.layers[0].destroy();
			this.layers.splice(0, 1);
		}

		this.screen = { x: 0, y: 0 };

		this.entities.clear();
		
		for(let i = 0; i < data.entities.length; i++)
		{
			const ent = data.entities[i];

			this.entities.spawnEntity(ent.type, ent.x, ent.y, ent.settings);
		}
		
		for(let i = 0; i < data.layer.length; i++)
		{
			const ld = data.layer[i];
			const newLayer = new EditMap(ld.name, ld.tilesize, ld.tilesetName, !!ld.foreground);

			newLayer.resize(ld.width, ld.height);

			newLayer.linkWithCollision = ld.linkWithCollision;
			newLayer.repeat = ld.repeat;
			newLayer.preRender = !!ld.preRender;
			newLayer.distance = ld.distance;
			newLayer.visible = !ld.visible;
			newLayer.data = ld.data;

			newLayer.toggleVisibility();
			this.layers.push(newLayer);
			
			if(ld.name == 'collision') this.collisionLayer = newLayer;
			
			this.setActiveLayer(ld.name);
		}
		
		this.setActiveLayer('entities');
		
		this.reorderLayers();
		$('#layers').sortable('refresh');
		
		this.resetModified();
		this.undo.clear();
		this.draw();
	}
	
	// -------------------------------------------------------------------------
	// Saving
	
	saveQuick()
	{
		if(this.fileName == 'untitled.js') this.saveDialog.open();
		else this.save(null, this.filePath);
	}
	
	save(dialog, path)
	{
		if(!path.match(/\.js$/)) path += '.js';
		
		this.filePath = path;
		this.fileName = path.replace(/^.*\//,'');
		const data = this.levelData;
		data.entities = this.entities.getSaveData();
		data.layer = [];
		
		let resources = [];

		for(let i = 0; i < this.layers.length; i++)
		{
			const layer = this.layers[i];
			data.layer.push(layer.getSaveData());

			if(layer.name != 'collision') resources.push(layer.tiles.path);
		}
		
		let dataString = JSON.stringify(data);

		if(WM.config.project.prettyPrint) dataString = JSONFormat(dataString);
		
		if(WM.config.project.outputFormat == 'module' )
		{
			const levelModule = path.replace(WM.config.project.modulePath, '').replace(/\.js$/, '').replace(/\//g, '.');
				
			const levelName = levelModule.replace(/(^.*\.|-)(\w)/g, (m, s, a) =>
			{
				return a.toUpperCase();
			});
			
			let resourcesString = '';

			if(resources.length)
			{
				resourcesString = "const Level" + levelName + "Resources=[new KGImage('" +
					resources.join("'), new KGImage('") +
				"')];\n";
			}
			
			// include /*JSON[*/ ... /*]JSON*/ markers, so we can easily load
			// this level as JSON again
			dataString = "import KGImage from '../../krater/image.js';\n" +
				"const Level" + levelName + " =/*JSON[*/" + dataString + "/*]JSON*/;\n" +
				resourcesString + 
				"\nexport default Level" + levelName + ";";
		}
		
		const postString = 'path=' + encodeURIComponent(path) + '&data=' + encodeURIComponent(dataString);
		
		$.ajax(
		{
			url: WM.config.api.save,
			type: 'POST',
			dataType: 'json',
			async: false,
			data: postString,
			success: this.saveResponse.bind(this)
		});
	}
	
	saveResponse(data)
	{
		if(data.error) alert('Error: ' + data.msg);
		else
		{
			this.resetModified();
			$.cookie('wmLastLevel', this.filePath);
		}
	}
	
	// -------------------------------------------------------------------------
	// Layers
	
	addLayer()
	{
		const name = 'new_layer_' + this.layers.length;
		const newLayer = new EditMap(name, WM.config.layerDefaults.tilesize);

		newLayer.resize(WM.config.layerDefaults.width, WM.config.layerDefaults.height);
		newLayer.setScreenPos(this.screen.x, this.screen.y);
		this.layers.push(newLayer);
		this.setActiveLayer(name);
		this.updateLayerSettings();
		
		this.reorderLayers();
		
		$('#layers').sortable('refresh');
	}
	
	removeLayer()
	{
		const name = this.activeLayer.name;

		if(name == 'entities') return false;

		this.activeLayer.destroy();

		for(let i = 0; i < this.layers.length; i++)
		{
			if(this.layers[i].name == name)
			{
				this.layers.splice(i, 1);
				this.reorderLayers();
				$('#layers').sortable('refresh');
				this.setActiveLayer( 'entities');

				return true;
			}
		}

		return false;
	}
	
	getLayerWithName(name)
	{
		for(let i = 0; i < this.layers.length; i++)
		{
			if(this.layers[i].name == name) return this.layers[i];
		}

		return null;
	}
	
	reorderLayers()
	{
		let newLayers = [];
		let isForegroundLayer = true;

		$('#layers div.layer span.name').each((function(newIndex, span)
		{
			const name = $(span).text();
			
			const layer = name == 'entities' ? this.entities : this.getLayerWithName(name);
				
			if(layer)
			{
				layer.setHotkey(newIndex + 1);

				if(layer.name == 'entities') isForegroundLayer = false;// All layers after the entity layer are not foreground layers
				else
				{
					layer.foreground = isForegroundLayer;

					newLayers.unshift(layer);
				}
			}
		}).bind(this));

		this.layers = newLayers;

		this.setModified();
		this.draw();
	}
	
	updateLayerSettings()
	{
		$('#layerName').val(this.activeLayer.name);
		$('#layerTileset').val(this.activeLayer.tilesetName);
		$('#layerTilesize').val(this.activeLayer.tilesize);
		$('#layerWidth').val(this.activeLayer.width);
		$('#layerHeight').val(this.activeLayer.height);
		$('#layerPreRender').prop('checked', this.activeLayer.preRender);
		$('#layerRepeat').prop('checked', this.activeLayer.repeat);
		$('#layerLinkWithCollision').prop('checked', this.activeLayer.linkWithCollision);
		$('#layerDistance').val(this.activeLayer.distance);
	}
	
	saveLayerSettings()
	{
		const isCollision = $('#layerIsCollision').prop('checked');
		
		let newName = $('#layerName').val();
		const newWidth = Math.floor($('#layerWidth').val());
		const newHeight = Math.floor($('#layerHeight').val());
		
		if(newWidth != this.activeLayer.width || newHeight != this.activeLayer.height) this.activeLayer.resize(newWidth, newHeight);

		this.activeLayer.tilesize = Math.floor($('#layerTilesize').val());
		
		if(isCollision)
		{
			newName = 'collision';
			this.activeLayer.linkWithCollision = false;
			this.activeLayer.distance = 1;
			this.activeLayer.repeat = false;

			this.activeLayer.setCollisionTileset();
		}
		else
		{
			const newTilesetName = $('#layerTileset').val();

			if(newTilesetName != this.activeLayer.tilesetName) this.activeLayer.setTileset(newTilesetName);

			this.activeLayer.linkWithCollision = $('#layerLinkWithCollision').prop('checked');
			this.activeLayer.distance = parseFloat($('#layerDistance').val());
			this.activeLayer.repeat = $('#layerRepeat').prop('checked');
			this.activeLayer.preRender = $('#layerPreRender').prop('checked');
		}
		
		if(newName == 'collision') this.collisionLayer = this.activeLayer;// is collision layer
		else if( this.activeLayer.name == 'collision' ) this.collisionLayer = null;// was collision layer, but is no more

		this.activeLayer.setName(newName);
		this.setModified();
		this.draw();
	}
	
	setActiveLayer(name)
	{
		const previousLayer = this.activeLayer;
		this.activeLayer = (name == 'entities' ? this.entities : this.getLayerWithName(name));

		if(previousLayer == this.activeLayer) return; // nothing to do here
		
		if(previousLayer) previousLayer.setActive(false);

		this.activeLayer.setActive(true);

		this.mode = this.MODE.DEFAULT;
		
		$('#layerIsCollision').prop('checked', (name == 'collision'));
		
		if(name == 'entities') $('#layerSettings').fadeOut(100);
		else
		{
			this.entities.selectEntity(null);
			this.toggleCollisionLayer();
			$('#layerSettings').fadeOut(100,this.updateLayerSettings.bind(this)).fadeIn(100);
		}

		this.draw();
	}
	
	toggleCollisionLayer(ev)
	{
		const isCollision = $('#layerIsCollision').prop('checked');

		$('#layerLinkWithCollision,#layerDistance,#layerPreRender,#layerRepeat,#layerName,#layerTileset').attr('disabled', isCollision );
	}
	
	// -------------------------------------------------------------------------
	// Update
	
	mousemove()
	{
		if(!this.activeLayer) return;
		
		if(this.mode == this.MODE.DEFAULT)
		{
			// scroll map
			if(KG.input.state('drag')) this.drag();
			else if(KG.input.state('draw'))
			{
				// move/scale entity
				if(this.activeLayer == this.entities)
				{
					const x = KG.input.mouse.x + this.screen.x;
					const y = KG.input.mouse.y + this.screen.y;

					this.entities.dragOnSelectedEntity(x, y);
					this.setModified();
				}
				else if(!this.activeLayer.isSelecting) this.setTileOnCurrentLayer();// draw on map
			}
			else if(this.activeLayer == this.entities)
			{
				const x = KG.input.mouse.x + this.screen.x;
				const y = KG.input.mouse.y + this.screen.y;

				this.entities.mousemove(x, y);
			}
		}
		
		this.mouseLast = { x: KG.input.mouse.x, y: KG.input.mouse.y };

		this.draw();
	}
	
	keydown(action)
	{
		if(!this.activeLayer) return;
		
		if(action == 'draw')
		{
			if(this.mode == this.MODE.DEFAULT)
			{
				// select entity
				if(this.activeLayer == this.entities)
				{
					const x = KG.input.mouse.x + this.screen.x;
					const y = KG.input.mouse.y + this.screen.y;
					const entity = this.entities.selectEntityAt(x, y);

					if(entity) this.undo.beginEntityEdit(entity);
				}
				else
				{
					if(KG.input.state('select')) this.activeLayer.beginSelecting(KG.input.mouse.x, KG.input.mouse.y);
					else
					{
						this.undo.beginMapDraw();
						this.activeLayer.beginEditing();

						if(this.activeLayer.linkWithCollision && this.collisionLayer && this.collisionLayer != this.activeLayer) this.collisionLayer.beginEditing();

						this.setTileOnCurrentLayer();
					}
				}
			}
			else if(this.mode == this.MODE.TILESELECT && KG.input.state('select')) this.activeLayer.tileSelect.beginSelecting(KG.input.mouse.x, KG.input.mouse.y);
		}
		
		this.draw();
	}
	
	keyup(action)
	{
		if(!this.activeLayer) return;
		
		if(action == 'delete')
		{
			this.entities.deleteSelectedEntity();
			this.setModified();
		}
		else if(action == 'clone')
		{
			this.entities.cloneSelectedEntity();
			this.setModified();
		}
		else if(action == 'grid') WM.config.view.grid = !WM.config.view.grid;
		else if(action == 'menu')
		{
			if(this.mode != this.MODE.TILESELECT && this.mode != this.MODE.ENTITYSELECT)
			{
				if(this.activeLayer == this.entities)
				{
					this.mode = this.MODE.ENTITYSELECT;

					this.entities.showMenu(KG.input.mouse.x, KG.input.mouse.y);
				}
				else
				{
					this.mode = this.MODE.TILESELECT;

					this.activeLayer.tileSelect.setPosition(KG.input.mouse.x, KG.input.mouse.y);
				}
			}
			else
			{
				this.mode = this.MODE.DEFAULT;

				this.entities.hideMenu();
			}
		}
		else if(action == 'zoomin') this.zoom(1);
		else if(action == 'zoomout') this.zoom(-1);
		
		
		if(action == 'draw')
		{			
			// select tile
			if(this.mode == this.MODE.TILESELECT)
			{
				this.activeLayer.brush = this.activeLayer.tileSelect.endSelecting(KG.input.mouse.x, KG.input.mouse.y);
				this.mode = this.MODE.DEFAULT;
			}
			else if(this.activeLayer == this.entities) this.undo.endEntityEdit();
			else
			{
				if(this.activeLayer.isSelecting) this.activeLayer.brush = this.activeLayer.endSelecting(KG.input.mouse.x, KG.input.mouse.y);
				else this.undo.endMapDraw();
			}
		}
		
		if(action == 'undo') this.undo.undo();
		
		if(action == 'redo') this.undo.redo();
		
		this.draw();

		this.mouseLast = { x: KG.input.mouse.x, y: KG.input.mouse.y };
	}
	
	setTileOnCurrentLayer()
	{
		if(!this.activeLayer || !this.activeLayer.scroll) return;
		
		const co = this.activeLayer.getCursorOffset();
		const x = KG.input.mouse.x + this.activeLayer.scroll.x - co.x;
		const y = KG.input.mouse.y + this.activeLayer.scroll.y - co.y;
		
		const brush = this.activeLayer.brush;

		for(let by = 0; by < brush.length; by++)
		{
			const brushRow = brush[by];

			for(let bx = 0; bx < brushRow.length; bx++)
			{
				const mapx = x + bx * this.activeLayer.tilesize;
				const mapy = y + by * this.activeLayer.tilesize;
				
				const newTile = brushRow[bx];
				const oldTile = this.activeLayer.getOldTile(mapx, mapy);
				
				this.activeLayer.setTile(mapx, mapy, newTile);
				this.undo.pushMapDraw(this.activeLayer, mapx, mapy, oldTile, newTile);
				
				if(this.activeLayer.linkWithCollision && this.collisionLayer && this.collisionLayer != this.activeLayer) 
				{
					const collisionLayerTile = newTile > 0 ? this.collisionSolid : 0;
					const oldCollisionTile = this.collisionLayer.getOldTile(mapx, mapy);

					this.collisionLayer.setTile(mapx, mapy, collisionLayerTile);
					this.undo.pushMapDraw(this.collisionLayer, mapx, mapy, oldCollisionTile, collisionLayerTile);
				}
			}
		}
		
		this.setModified();
	}
	
	// -------------------------------------------------------------------------
	// Drawing
	
	draw()
	{
		// The actual drawing loop is scheduled via KG.setAnimation() already.
		// We just set a flag to indicate that a redraw is needed.
		this.needsDraw = true;
	}
	
	drawIfNeeded()
	{
		// Only draw if flag is set
		if(!this.needsDraw) return;

		this.needsDraw = false;
		
		KG.system.clear(WM.config.colors.clear);
	
		let entitiesDrawn = false;

		for(let i = 0; i < this.layers.length; i++)
		{
			const layer = this.layers[i];
			
			if(!entitiesDrawn && layer.foreground)// This layer is a foreground layer? -> Draw entities first!
			{
				entitiesDrawn = true;

				this.entities.draw();
			}

			layer.draw();
		}
		
		if(!entitiesDrawn) this.entities.draw();
		
		
		if(this.activeLayer)
		{
			if(this.mode == this.MODE.TILESELECT)
			{
				this.activeLayer.tileSelect.draw();
				this.activeLayer.tileSelect.drawCursor(KG.input.mouse.x, KG.input.mouse.y);
			}
			
			if(this.mode == this.MODE.DEFAULT) this.activeLayer.drawCursor(KG.input.mouse.x, KG.input.mouse.y);
		}
		
		if(WM.config.labels.draw) this.drawLabels(WM.config.labels.step);
	}
	
	drawLabels(step)
	{
		KG.system.context.fillStyle = WM.config.colors.primary;

		let xlabel = this.screen.x - this.screen.x % step - step;

		for(let tx = Math.floor(-this.screen.x % step); tx < KG.system.width; tx += step)
		{
			xlabel += step;

			KG.system.context.fillText(xlabel, tx * KG.system.scale, 0);
		}
		
		let ylabel = this.screen.y - this.screen.y % step - step;

		for(let ty = Math.floor(-this.screen.y % step); ty < KG.system.height; ty += step )
		{
			ylabel += step;

			KG.system.context.fillText(ylabel, 0, ty * KG.system.scale);
		}
	}
	
	getEntityByName(name)
	{
		return this.entities.getEntityByName(name);
	}

	static getMaxWidth()
	{
		return $(window).width();
	};
	
	static getMaxHeight()
	{
		return $(window).height() - $('#headerMenu').height();
	};
}

if (!KG.ready)//Garantindo que isso só seja rodado uma única vez
{
	// Custom KGImage class for use in Weltmeister. To make the zoom function 
	// work, we need some additional scaling behavior:
	// Keep the original image, maintain a cache of scaled versions and use the 
	// default Canvas scaling (~bicubic) instead of nearest neighbor when 
	// zooming out.
	const oldResize = KGImage.staticResize;
	KGImage.staticResize = (scale, image) =>
	{
		if(!image.loaded ) return;

		if(!image.scaleCache ) image.scaleCache = {};

		if(image.scaleCache['x'+scale])
		{
			image.data = image.scaleCache['x' + scale];

			return;
		}
		
		// Retain the original image when scaling
		image.origData = image.data = image.origData || image.data;
		
		if(scale > 1) oldResize(scale, image);// Nearest neighbor when zooming in
		else
		{
			// Otherwise blur
			const scaled = KG.$new('canvas');
			scaled.width = Math.ceil(image.width * scale);
			scaled.height = Math.ceil(image.height * scale);
			const scaledCtx = scaled.getContext('2d');

			scaledCtx.drawImage(image.data, 0, 0, image.width, image.height, 0, 0, scaled.width, scaled.height);

			image.data = scaled;
		}
		
		image.scaleCache['x' + scale] = image.data;
	}

	import('./wm-loader.js');
}

export default Weltmeister;