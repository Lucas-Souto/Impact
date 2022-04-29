import IG from './impact';
import Animation from './animation';

class Entity
{
	id = 0;
	settings = {};
	
	size = { x: 16, y: 16 };
	offset = { x: 0, y: 0 };
	
	pos = { x: 0, y: 0 };
	last = { x: 0, y: 0 };
	vel = { x: 0, y: 0 };
	accel = { x: 0, y: 0 };
	friction = { x: 0, y: 0 };
	maxVel = { x: 100, y: 100 };
	zIndex = 0;
	gravityFactor = 1;
	standing = false;
	bounciness = 0;
	minBounceVelocity = 40;
	
	anims = {};
	animSheet = null;
	currentAnim = null;
	health = 10;
	
	type = 0; // TYPE.NONE
	checkAgainst = 0; // TYPE.NONE
	collides = 0; // COLLIDES.NEVER
	
	_killed = false;
	
	slopeStanding = { min: (44).toRad(), max: (136).toRad() };

	static _lastId = 0;// Last used entity id; incremented with each spawned entity

	// Collision Types - Determine if and how entities collide with each other

	// In ACTIVE vs. LITE or FIXED vs. ANY collisions, only the "weak" entity moves,
	// while the other one stays fixed. In ACTIVE vs. ACTIVE and ACTIVE vs. PASSIVE
	// collisions, both entities are moved. LITE or PASSIVE entities don't collide
	// with other LITE or PASSIVE entities at all. The behaiviour for FIXED vs.
	// FIXED collisions is undefined.

	static COLLIDES =
	{
		NEVER: 0,
		LITE: 1,
		PASSIVE: 2,
		ACTIVE: 4,
		FIXED: 8
	};

	static TYPE = // Entity Types - used for checks
	{
		NONE: 0,
		A: 1,
		B: 2,
		BOTH: 3
	};
	
	constructor(x, y, settings)
	{
		this.id = ++Entity._lastId;
		this.pos.x = this.last.x = x;
		this.pos.y = this.last.y = y;
		
		IG.merge(this, settings);
	}
	
	reset(x, y, settings)
	{
		const proto = this.constructor.prototype;
		this.pos.x = x;
		this.pos.y = y;
		this.last.x = x;
		this.last.y = y;
		this.vel.x = proto.vel.x;
		this.vel.y = proto.vel.y;
		this.accel.x = proto.accel.x;
		this.accel.y = proto.accel.y;
		this.health = proto.health;
		this._killed = proto._killed;
		this.standing = proto.standing;
		
		this.type = proto.type;
		this.checkAgainst = proto.checkAgainst;
		this.collides = proto.collides;
		
		IG.merge(this, settings);
	}
	
	addAnim(name, frameTime, sequence, stop)
	{
		if(!this.animSheet) throw(`No animSheet to add the animation '${name}' to.`);

		const a = new Animation(this.animSheet, frameTime, sequence, stop);
		this.anims[name] = a;

		if(!this.currentAnim) this.currentAnim = a;
		
		return a;
	}
	
	update()
	{
		this.last.x = this.pos.x;
		this.last.y = this.pos.y;
		this.vel.y += IG.game.gravity * IG.system.tick * this.gravityFactor;
		
		this.vel.x = this.getNewVelocity(this.vel.x, this.accel.x, this.friction.x, this.maxVel.x);
		this.vel.y = this.getNewVelocity(this.vel.y, this.accel.y, this.friction.y, this.maxVel.y);
		
		// movement & collision
		const mx = this.vel.x * IG.system.tick;
		const my = this.vel.y * IG.system.tick;
		const res = IG.game.collisionMap.trace(this.pos.x, this.pos.y, mx, my, this.size.x, this.size.y);
		this.handleMovementTrace(res);
		
		if(this.currentAnim) this.currentAnim.update();
	}
	
	getNewVelocity(vel, accel, friction, max)
	{
		if(accel) return (vel + accel * IG.system.tick).limit(-max, max);
		else if(friction)
		{
			const delta = friction * IG.system.tick;
			
			if(vel - delta > 0) return vel - delta;
			else if(vel + delta < 0) return vel + delta;
			else return 0;
		}

		return vel.limit(-max, max);
	}
	
	handleMovementTrace(res)
	{
		this.standing = false;
		
		if(res.collision.y)
		{
			if(this.bounciness > 0 && Math.abs(this.vel.y) > this.minBounceVelocity) this.vel.y *= -this.bounciness;
			else
			{
				if(this.vel.y > 0) this.standing = true;

				this.vel.y = 0;
			}
		}

		if(res.collision.x)
		{
			if(this.bounciness > 0 && Math.abs(this.vel.x) > this.minBounceVelocity) this.vel.x *= -this.bounciness;	
			else this.vel.x = 0;
		}

		if(res.collision.slop )
		{
			const s = res.collision.slope;
			
			if(this.bounciness > 0)
			{
				const proj = this.vel.x * s.nx + this.vel.y * s.ny;
				
				this.vel.x = (this.vel.x - s.nx * proj * 2) * this.bounciness;
				this.vel.y = (this.vel.y - s.ny * proj * 2) * this.bounciness;
			}
			else
			{
				const lengthSquared = s.x * s.x + s.y * s.y;
				const dot = (this.vel.x * s.x + this.vel.y * s.y) / lengthSquared;
				
				this.vel.x = s.x * dot;
				this.vel.y = s.y * dot;
				
				const angle = Math.atan2(s.x, s.y);

				if(angle > this.slopeStanding.min && angle < this.slopeStanding.max) this.standing = true;
			}
		}
		
		this.pos = res.pos;
	}
	
	draw()
	{
		if(this.currentAnim) this.currentAnim.draw(this.pos.x - this.offset.x - IG.game._rscreen.x, this.pos.y - this.offset.y - IG.game._rscreen.y);
	}
	
	kill()
	{
		IG.game.removeEntity(this);
	}
	
	receiveDamage(amount, from)
	{
		this.health -= amount;

		if(this.health <= 0) this.kill();
	}
	
	touches(other)
	{
		return !(this.pos.x >= other.pos.x + other.size.x || this.pos.x + this.size.x <= other.pos.x || 
			this.pos.y >= other.pos.y + other.size.y || this.pos.y + this.size.y <= other.pos.y);
	}
	
	distanceTo(other)
	{
		const xd = (this.pos.x + this.size.x / 2) - (other.pos.x + other.size.x / 2); 
		const yd = (this.pos.y + this.size.y / 2) - (other.pos.y + other.size.y / 2);

		return Math.sqrt(xd * xd + yd * yd );
	}
	
	angleTo(other)
	{
		return Math.atan2((other.pos.y + other.size.y / 2) - (this.pos.y + this.size.y / 2), (other.pos.x + other.size.x / 2) - (this.pos.x + this.size.x / 2));
	}
	
	check(other){}
	collideWith(other, axis){}
	ready(){}
	erase(){}

	static checkPair(a, b)
	{
	
		// Do these entities want checks?
		if(a.checkAgainst & b.type) a.check(b);
		
		if(b.checkAgainst & a.type) b.check(a);
		
		// If this pair allows collision, solve it! At least one entity must
		// collide ACTIVE or FIXED, while the other one must not collide NEVER.
		if(a.collides && b.collides && a.collides + b.collides > Entity.COLLIDES.ACTIVE) Entity.solveCollision(a, b);
	}

	static solveCollision(a, b)
	{
		// If one entity is FIXED, or the other entity is LITE, the weak
		// (FIXED/NON-LITE) entity won't move in collision response
		let weak = null;

		if(a.collides == Entity.COLLIDES.LITE || b.collides == Entity.COLLIDES.FIXED) weak = a;
		else if(b.collides == Entity.COLLIDES.LITE || a.collides == Entity.COLLIDES.FIXED) weak = b;
		
		// Did they already overlap on the X-axis in the last frame? If so,
		// this must be a vertical collision!
		if(a.last.x + a.size.x > b.last.x && a.last.x < b.last.x + b.size.x)
		{
			// Which one is on top?
			if(a.last.y < b.last.y) Entity.seperateOnYAxis(a, b, weak);
			else Entity.seperateOnYAxis(b, a, weak);

			a.collideWith(b, 'y');
			b.collideWith(a, 'y');
		}
		
		// Horizontal collision
		else if(a.last.y + a.size.y > b.last.y && a.last.y < b.last.y + b.size.y)
		{
			// Which one is on the left?
			if(a.last.x < b.last.x) Entity.seperateOnXAxis(a, b, weak);
			else Entity.seperateOnXAxis(b, a, weak);

			a.collideWith(b, 'x');
			b.collideWith(a, 'x');
		}
	}

	// FIXME: This is a mess. Instead of doing all the movements here, the entities
	// should get notified of the collision (with all details) and resolve it
	// themselfs.

	static seperateOnXAxis(left, right, weak)
	{
		const nudge = (left.pos.x + left.size.x - right.pos.x);
		
		// We have a weak entity, so just move this one
		if(weak)
		{
			const strong = left === weak ? right : left;
			weak.vel.x = -weak.vel.x * weak.bounciness + strong.vel.x;
			
			const resWeak = IG.game.collisionMap.trace(weak.pos.x, weak.pos.y, weak == left ? -nudge : nudge, 0, weak.size.x, weak.size.y);
			weak.pos.x = resWeak.pos.x;
		}
		else // Normal collision - both move
		{
			const v2 = (left.vel.x - right.vel.x) / 2;
			left.vel.x = -v2;
			right.vel.x = v2;
		
			const resLeft = IG.game.collisionMap.trace(left.pos.x, left.pos.y, -nudge / 2, 0, left.size.x, left.size.y);
			left.pos.x = Math.floor(resLeft.pos.x);
			
			const resRight = IG.game.collisionMap.trace(right.pos.x, right.pos.y, nudge / 2, 0, right.size.x, right.size.y);
			right.pos.x = Math.ceil(resRight.pos.x);
		}
	}

	static seperateOnYAxis(top, bottom, weak)
	{
		const nudge = (top.pos.y + top.size.y - bottom.pos.y);
		
		// We have a weak entity, so just move this one
		if(weak)
		{
			const strong = top === weak ? bottom : top;
			weak.vel.y = -weak.vel.y * weak.bounciness + strong.vel.y;
			
			// Riding on a platform?
			const nudgeX = 0;

			if(weak == top && Math.abs(weak.vel.y - strong.vel.y) < weak.minBounceVelocity)
			{
				weak.standing = true;
				nudgeX = strong.vel.x * IG.system.tick;
			}
			
			const resWeak = IG.game.collisionMap.trace(weak.pos.x, weak.pos.y, nudgeX, weak == top ? -nudge : nudge, weak.size.x, weak.size.y);
			weak.pos.y = resWeak.pos.y;
			weak.pos.x = resWeak.pos.x;
		}
		else if(IG.game.gravity && (bottom.standing || top.vel.y > 0))// Bottom entity is standing - just bounce the top one
		{	
			const resTop = IG.game.collisionMap.trace(top.pos.x, top.pos.y, 0, -(top.pos.y + top.size.y - bottom.pos.y), top.size.x, top.size.y);
			top.pos.y = resTop.pos.y;
			
			if(top.bounciness > 0 && top.vel.y > top.minBounceVelocity) top.vel.y *= -top.bounciness;
			else
			{
				top.standing = true;
				top.vel.y = 0;
			}
		}
		else // Normal collision - both move
		{
			const v2 = (top.vel.y - bottom.vel.y) / 2;
			top.vel.y = -v2;
			bottom.vel.y = v2;
			
			const nudgeX = bottom.vel.x * ig.system.tick;
			const resTop = IG.game.collisionMap.trace(top.pos.x, top.pos.y, nudgeX, -nudge / 2, top.size.x, top.size.y);
			top.pos.y = resTop.pos.y;
			
			const resBottom = IG.game.collisionMap.trace(bottom.pos.x, bottom.pos.y, 0, nudge/2, bottom.size.x, bottom.size.y);
			bottom.pos.y = resBottom.pos.y;
		}
	}
}

export default Entity;