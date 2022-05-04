import KG from '../krater/krater.js';
import Input from '../krater/input.js';
import Game from '../krater/game.js';
import Font from '../krater/font.js';
import LevelTest from './levels/test.js';

class MyGame extends Game
{
	gravity = 800;

	constructor()
	{
		super();
		
		// Initialize your game here; bind keys etc.
		KG.input.bind(Input.KEY.UP_ARROW, 'jump');
		KG.input.bind(Input.KEY.RIGHT_ARROW, 'right');
		KG.input.bind(Input.KEY.LEFT_ARROW, 'left');

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
	}
}

// Start the Game with 60fps, a resolution of 320x240, scaled
// up by a factor of 2
KG.main('#canvas', MyGame, 60, 960, 640, 1);