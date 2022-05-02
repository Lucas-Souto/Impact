import KG from '../krater.js';
import Entity from '../entity.js';
import DebugPanel from './panel.js';

class DebugableEntity extends Entity
{
	static _debugEnableChecks = true;
	static _debugShowBoxes = false;
	static _debugShowVelocities = false;
	static _debugShowNames = false;

	colors =
	{
		names: '#fff',
		velocities: '#0f0',
		boxes: '#f00'
	};
	
	draw()
	{
		super.draw();		
		
		// Collision Boxes
		if(DebugableEntity._debugShowBoxes)
		{
			KG.system.context.strokeStyle = this.colors.boxes;
			KG.system.context.lineWidth = 1.0;
			KG.system.context.strokeRect(KG.system.getDrawPos(this.pos.x.round() - KG.game.screen.x) - 0.5, 
				KG.system.getDrawPos(this.pos.y.round() - KG.game.screen.y) - 0.5, this.size.x * KG.system.scale, this.size.y * KG.system.scale);
		}
		
		// Velocities
		if(DebugableEntity._debugShowVelocities)
		{
			const x = this.pos.x + this.size.x/2;
			const y = this.pos.y + this.size.y/2;
			
			this._debugDrawLine(this.colors.velocities, x, y, x + this.vel.x, y + this.vel.y);
		}
		
		// Names & Targets
		if(DebugableEntity._debugShowNames)
		{
			if(this.name)
			{
				KG.system.context.fillStyle = this.colors.names;

				KG.system.context.fillText(this.name, KG.system.getDrawPos(this.pos.x - KG.game.screen.x), KG.system.getDrawPos(this.pos.y - KG.game.screen.y));
			}
			
			if(typeof(this.target) == 'object')
			{
				for(let t in this.target)
				{
					const ent = KG.game.getEntityByName(this.target[t]);

					if(ent)
					{
						this._debugDrawLine( this.colors.names, this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2, 
							ent.pos.x + ent.size.x / 2, ent.pos.y + ent.size.y / 2 );
					}
				}
			}
		}
	}
	
	_debugDrawLine(color, sx, sy, dx, dy)
	{
		KG.system.context.strokeStyle = color;
		KG.system.context.lineWidth = 1.0;

		KG.system.context.beginPath();
		KG.system.context.moveTo(KG.system.getDrawPos(sx - KG.game.screen.x), KG.system.getDrawPos(sy - KG.game.screen.y));
		KG.system.context.lineTo(KG.system.getDrawPos(dx - KG.game.screen.x), KG.system.getDrawPos(dy - KG.game.screen.y));
		KG.system.context.stroke();
		KG.system.context.closePath();
	}

	checkPair(a, b)
	{
		if(!DebugableEntity._debugEnableChecks) return;

		super.checkPair(a, b);
	};
}

export default DebugableEntity;