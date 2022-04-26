ig.module(
    'game.entities.player'
)
.requires(
    'impact.entity'
)
.defines(() =>
{
    EntityPlayer = ig.Entity.extend(
    {
        size: { x: 16, y: 16 },
        collides: ig.Entity.COLLIDES.FIXED,
        animSheet: new ig.AnimationSheet('media/square.png', 16, 16),

        init: function(x, y, settings)
        {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, [0]);
        },

        update: function()
        {
            const up = ig.input.state('up') ? 1 : 0,
                down = ig.input.state('down') ? 1 : 0,
                right = ig.input.state('right') ? 1 : 0,
                left = ig.input.state('left') ? 1 : 0;
            
            this.vel.x = (right - left) * 500;
            this.vel.y = (down - up) * 500;

            if (this.id === 1 && ig.input.pressed('clone')) ig.game.spawnEntity(EntityPlayer, this.pos.x + 16, this.pos.y + 16, {});

            this.parent();
        }
    });
});