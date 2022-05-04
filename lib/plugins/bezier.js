class Bezier
{
    static getBezierPath(segments, point0, point1, point2, point3)
    {
        let points = [];

        for (let i = 0; i < segments; i++)
        {
            const t = i / segments;
            points.push(Bezier.calculateBezierPoint(t, point0, point1, point2, point3));
        }

        return points;
    }

    static calculateBezierPoint(t, p0, p1, p2, p3)
    {
        //(1–t)³P0+3(1–t)²tP1+3(1–t)t²P2+t³P3
        const u = 1 - t, uSquared = u * u, uCubic = uSquared * u, tSquared = t * t, tCubic = tSquared * t;
        const position = uCubic * p0 + 3 * uSquared * t * p1 + 3 * u * tSquared * p2 + tCubic * p3;

        return position;
    }
}

export default Bezier;