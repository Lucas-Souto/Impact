import IG from '../../krater/krater.js';
import Entity from '../../krater/entity.js';
import {AnimationSheet} from '../../krater/animation.js';

class EntityPlayer extends Entity
{
    size = { x: 16, y: 16 };
    collides = Entity.COLLIDES.FIXED;
    animSheet = new AnimationSheet('media/square.png', 16, 16);

    constructor(x, y, settings)
    {
        super(x, y, settings);
        this.addAnim('idle', 1, [0]);
    }

    update()
    {
        const up = IG.input.state('up') ? 1 : 0,
            down = IG.input.state('down') ? 1 : 0,
            right = IG.input.state('right') ? 1 : 0,
            left = IG.input.state('left') ? 1 : 0;
        
        this.vel.x = (right - left) * 500;
        this.vel.y = (down - up) * 500;

        if (this.id === 1 && IG.input.pressed('clone')) IG.game.spawnEntity(EntityPlayer, this.pos.x + 16, this.pos.y + 16, {});

        super.update();
    }
}

export default EntityPlayer;