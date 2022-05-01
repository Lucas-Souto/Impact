import WM from './wm.js';
import Weltmeister from './weltmeister.js';
import KG from '../krater/krater.js';
import {SoundManager, Sound} from '../krater/sound.js';
import Loader from '../krater/loader.js';
import System from '../krater/system.js';
import EventedInput from './evented-input.js';

// Create a custom loader, to skip sound files and the run loop creation
class WMLoader extends Loader
{
	end()
	{
		if(this.done) return;
		
		clearInterval(this._intervalId);

		this.done = true;

		KG.system.clear(WM.config.colors.clear);
		KG.game = new (this.gameClass)();
	}
	
	loadResource(res)
	{
		if(res instanceof Sound) this._unloaded.erase(res.path);
		else super.loadResource(res);
	}
}

KG.system = new System('#canvas', 1, Math.floor(Weltmeister.getMaxWidth() / WM.config.view.zoom), Math.floor(Weltmeister.getMaxHeight() / WM.config.view.zoom), WM.config.view.zoom);
	
KG.input = new EventedInput();
KG.soundManager = new SoundManager();
KG.ready = true;

const loader = new WMLoader(Weltmeister, KG.resources);

loader.load();//ig.module('weltmeister.loader').requires.apply(ig, wm.config.plugins)