import KG from '../krater/krater.js';
import Input from '../krater/input.js';
import Game from '../krater/game.js';
import Font from '../krater/font.js';
import {LevelTest} from './levels/test.js';

const font = new Font('media/04b03.font.png');

class MyGame extends Game
{
	// Load a font
	font = font;
	
	constructor()
	{
		super();
		
		// Initialize your game here; bind keys etc.
		KG.input.bind(Input.KEY.UP_ARROW, 'up');
		KG.input.bind(Input.KEY.DOWN_ARROW, 'down');
		KG.input.bind(Input.KEY.RIGHT_ARROW, 'right');
		KG.input.bind(Input.KEY.LEFT_ARROW, 'left');
		KG.input.bind(Input.KEY.SPACE, 'clone');

		this.loadLevel(LevelTest);
	}
	
	update()
	{
		// Update all entities and backgroundMaps
		super.update();
		
		// Add your own, additional update code here
	}
	
	draw()
	{
		// Draw all entities and backgroundMaps
		super.draw();
		
		// Add your own drawing code here
		const x = KG.system.width / 2,
			y = KG.system.height / 2;
		
		this.font.draw('It Works!', x, y, Font.ALIGN.CENTER);
	}
}

// Start the Game with 60fps, a resolution of 320x240, scaled
// up by a factor of 2
KG.main('#canvas', MyGame, 60, 320, 240, 2);