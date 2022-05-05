import KG from '../../krater/krater.js';
import Entity from '../../krater/entity.js';
import {AnimationSheet} from '../../krater/animation.js';

const animation = new AnimationSheet('media/square.png', 32, 32);

class EntityPlayer extends Entity
{
    maxVel = {x: 300, y: 700};
    friction = { x: 800, y: 0 };

	accelGround = 600;
	accelAir = 500;
    jump = 400;

    type = Entity.TYPE.A;
    size = { x: 32, y: 32 };
    checkAgainst = Entity.TYPE.NONE;
    collides = Entity.COLLIDES.PASSIVE;
    animSheet = animation;

    constructor(x, y, settings)
    {
        super(x, y, settings);
        this.addAnim('idle', 1, [0]);
    }

    update()
    {
        const right = KG.input.state('right') ? 1 : 0, left = KG.input.state('left') ? 1 : 0;
        
        this.accel.x = (right - left) * (this.standing ? this.accelGround : this.accelAir);

        if(this.standing && KG.input.pressed('jump')) this.vel.y = -this.jump;
        
        super.update();
    }
}

export default EntityPlayer;