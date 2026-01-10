function parseSTL(data) {
    const isBinary = ((data) => {
        const reader = new DataView(data);
        const faceCount = reader.getUint32(80, true);
        const expectedSize = 84 + (50 * faceCount);
        return data.byteLength === expectedSize;
    })(data);

    let points = [];
    let connections = [];
    let polygons = [];

    if (isBinary) {
        const reader = new DataView(data);
        const faceCount = reader.getUint32(80, true);
        
        
        if (84 + (50 * faceCount) !== data.byteLength) {
            console.error('Invalid STL: size mismatch');
            return { points: [], connections: [], polygons: [] };
        }

        let offset = 84;
        const pointMap = new Map();
        let pointIndex = 0;
        for (let i = 0; i < faceCount; i++) {
          if (offset + 50 > data.byteLength) {
                console.error(`Offset ${offset} exceeds bounds at face ${i}`);
                break;
            }
          
            const normal = {
                x: reader.getFloat32(offset, true),
                y: reader.getFloat32(offset + 4, true),
                z: reader.getFloat32(offset + 8, true)
            };
            offset += 12;
            const point1 = {
                x: reader.getFloat32(offset, true),
                y: reader.getFloat32(offset + 4, true),
                z: reader.getFloat32(offset + 8, true)
            };
            offset += 12;
            const point2 = {
                x: reader.getFloat32(offset, true),
                y: reader.getFloat32(offset + 4, true),
                z: reader.getFloat32(offset + 8, true)
            };
            offset += 12;
            const point3 = {
                x: reader.getFloat32(offset, true),
                y: reader.getFloat32(offset + 4, true),
                z: reader.getFloat32(offset + 8, true)
            };
            
            
            offset += 14; // Skip attribute byte count
            let index1 = pointMap.get(point1);
            if (index1!=0&&!index1) {
                points.push(point1);
                pointMap.set(point1, pointIndex);
                index1 = pointIndex;
                pointIndex += 1;
            }
            let index2 = pointMap.get(point2);
            if (index2!=0&&!index2) {
                points.push(point2);
                pointMap.set(point2, pointIndex);
                index2 = pointIndex;
                pointIndex += 1;
            }
            let index3 = pointMap.get(point3);
            if (index3!=0&&!index3) {
                points.push(point3);
                pointMap.set(point3, pointIndex);
                index3 = pointIndex;
                pointIndex += 1;
            }
            connections.push([index1, index2]);
            connections.push([index2, index3]);
            connections.push([index3, index1]);

            polygons.push({points:[index1, index2, index3], normal: normal});
        }
    } else {
        const text = new TextDecoder().decode(data);
        const lines = text.split('\n');
        const pointMap = new Map();
        let pointIndex = 0;
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('vertex')) {
                const parts = line.split(/\s+/);
                const point = {
                    x: parseFloat(parts[1]),
                    y: parseFloat(parts[2]),
                    z: parseFloat(parts[3])
                };
                let index = pointMap.get(point);
                if (index === undefined) {
                    points.push(point);
                    pointMap.set(point, pointIndex);
                    index = pointIndex;
                    pointIndex += 1;
                }
                if (points.length % 3 === 0) {
                    const len = points.length;
                    connections.push([len - 3, len - 2]);
                    connections.push([len - 2, len - 1]);
                    connections.push([len - 1, len - 3]);
                }
            }
        }
    }

    return { points, connections, polygons };
}

export { parseSTL };