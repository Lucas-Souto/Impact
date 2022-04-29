class Map
{
	tilesize = 8;
	width = 1;
	height = 1;
	pxWidth = 1;
	pxHeight = 1;
	data = [[]];
	name = null;
	
	constructor(tilesize, data)
	{
		this.tilesize = tilesize;
		this.data = data;
		this.height = data.length;
		this.width = data[0].length;

		this.pxWidth = this.width * this.tilesize;
		this.pxHeight = this.height * this.tilesize;
	}
	
	getTile(x, y)
	{
		const tx = Math.floor(x / this.tilesize);
		const ty = Math.floor(y / this.tilesize);

		if((tx >= 0 && tx <  this.width) && (ty >= 0 && ty < this.height)) return this.data[ty][tx];
		else return 0;
	}
	
	setTile(x, y, tile)
	{
		const tx = Math.floor( x / this.tilesize );
		const ty = Math.floor( y / this.tilesize );

		if((tx >= 0 && tx < this.width) && (ty >= 0 && ty < this.height)) this.data[ty][tx] = tile;
	}
}

export default Map;