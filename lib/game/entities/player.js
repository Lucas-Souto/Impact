import KG from '../../krater/krater.js';
import Entity from '../../krater/entity.js';
import {AnimationSheet} from '../../krater/animation.js';

const animation = new AnimationSheet('media/square.png', 16, 16);

class EntityPlayer extends Entity
{
    size = { x: 16, y: 16 };
    collides = Entity.COLLIDES.FIXED;
    animSheet = animation;

    constructor(x, y, settings)
    {
        super(x, y, settings);
        this.addAnim('idle', 1, [0]);
    }

    update()
    {
        const up = KG.input.state('up') ? 1 : 0,
            down = KG.input.state('down') ? 1 : 0,
            right = KG.input.state('right') ? 1 : 0,
            left = KG.input.state('left') ? 1 : 0;
        
        this.vel.x = (right - left) * 500;
        this.vel.y = (down - up) * 500;

        super.update();
    }
}

export default EntityPlayer;