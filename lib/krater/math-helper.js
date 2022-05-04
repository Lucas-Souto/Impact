class MathHelper
{
    static lerp(value1, value2, amount)
    {
        return value1 + (value2 - value1) * amount;
    }

    static lengthDir(distance, angle)
    {
        return { x: distance.x * Math.cos(angle), y: distance.y * Math.sin(angle) };
    }

    static toGrid(position, grid)
    {
        if (typeof grid === 'number') grid = { x: grid, y: grid };

        return { x: Math.floor(position.x / grid.x) * grid.x, y: Math.floor(position.y / grid.y) * grid.y };
    }

    static rotatePoint(point, origin, rotation)
    {
        const r = rotation.toRad();
        const translated = MathHelper.subtractVector(point, origin);
        const rotated = { x: translated.x * Math.cos(r) - translated.y * Math.sin(r), y: translated.x * Math.sin(r) + translated.y * Math.cos(r) };

        return MathHelper.sumVector(rotated, origin);
    }

    //Operadores para vetores

    static sumVector(a, b)
    {
        return { x: a.x + b.x, y: a.y + b.y };
    }

    static subtractVector(a, b)
    {
        return { x: a.x - b.x, y: a.y - b.y };
    }

    static multiplyVector(a, b)
    {
        return { x: a.x * b.x, y: a.y * b.y };
    }

    static divideVector(a, b)
    {
        return { x: a.x / b.x, y: a.y / b.y };
    }

    static remainderVector(a, b)
    {
        return { x: a.x % b.x, y: a.y % b.y };
    }
}

export default MathHelper;