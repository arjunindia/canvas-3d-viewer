import { parseSTL } from "./parse_stl.js";

const ctx = display.getContext('2d');
const canvas = display;
const width = canvas.width;
const height = canvas.height;

let pageZoom = 1
const clipZ = 0.5
const project3dPoint = ({ x, y, z }) => {
  const clippedZ = Math.max(z,clipZ)
    return {
        x:  0.03 *x / clippedZ,
        y:  0.03*y / clippedZ
    }

}
const cartesianToJSCoordinate = ({ x, y }) => {
    // x is in range [-1, 1]
    // y is in range [-1, 1]
    return {
        x: (x + 1) / 2 * width,
        y: (1 - (y + 1) / 2) * height
    }
}
const printPoint = ({ x, y }) => {
    ctx.fillRect(x, y, 5, 5);
}

/**
 * @param {"x" | "y" | "z"} axis
 */
function rotate_axis(point, axis, angle) {
    const { x, y, z } = point;
    if (axis === 'y') {
        const rotatedX = x * Math.cos(angle) - z * Math.sin(angle);
        const rotatedZ = x * Math.sin(angle) + z * Math.cos(angle);
        return { x: rotatedX, y: y, z: rotatedZ };
    } else if (axis === 'x') {
        const rotatedY = y * Math.cos(angle) + z * Math.sin(angle);
        const rotatedZ = -y * Math.sin(angle) + z * Math.cos(angle);
        return { x: x, y: rotatedY, z: rotatedZ };
    } else {
        const rotatedX = x * Math.cos(angle) + y * Math.sin(angle);
        const rotatedY = -x * Math.sin(angle) + y * Math.cos(angle);
        return { x: rotatedX, y: rotatedY, z: z };
    }
}


const transposeZ = (point, delta = 0.0001) => {
    return { x: point.x, y: point.y, z: 0 };
}

// const points = [
//     { x: -0.5, y: -0.5, z: 0.5 },
//     { x: 0.5, y: -0.5, z: 0.5 },
//     { x: 0.5, y: 0.5, z: 0.5 },
//     { x: -0.5, y: 0.5, z: 0.5 },
//     { x: -0.5, y: -0.5, z: -0.5 },
//     { x: 0.5, y: -0.5, z: -0.5 },
//     { x: 0.5, y: 0.5, z: -0.5 },
//     { x: -0.5, y: 0.5, z: -0.5 },
// ]
// const connections = [
//     [0, 1],
//     [1, 2],
//     [2, 3],
//     [3, 0],
//     [4, 5],
//     [5, 6],
//     [6, 7],
//     [7, 4],
//     [0, 4],
//     [1, 5],
//     [2, 6],
//     [3, 7],
// ]

// const points = [
//     { x: -10, y: 0, z: 0 },
//     { x: -5, y: 6, z: 3 },
//     { x: 15, y: 0, z: 0 },
//     { x: -5, y: -6, z: 3 },
//     { x: -1, y: 13, z: 0 },
//     { x: 14, y: 8, z: 0 },
//     { x: -1, y: 18, z: 4 },
//     { x: -13, y: 8, z: 0 },
//     { x: -1, y: -13, z: 0 },
//     { x: 14, y: -8, z: 0 },
//     { x: -1, y: -18, z: 4 },
//     { x: -13, y: -8, z: 0 }
// ];
// const connections = [
//     [0, 1], [1, 2], [2, 3], [3, 0], // First loop
//     [4, 5], [5, 6], [6, 7], [7, 4], // Second loop
//     [8, 9], [9, 10], [10, 11], [11, 8] // Third loop
// ];

function isFrontFacing(polygon,delta) {
    const pointsCurr = polygon.points.map(index => points[index]);
    let rotatedPointsCurr = pointsCurr.map(point => rotate_axis(point, "y", delta));
    rotatedPointsCurr = rotatedPointsCurr.map(point => rotate_axis(point, "x", delta));
    
    // Compute normal using cross product of two edges
    const v0 = rotatedPointsCurr[0];
    const v1 = rotatedPointsCurr[1];
    const v2 = rotatedPointsCurr[2];
    
    const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
    
    const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x
    };
    
    // Camera at origin looking down -Z axis (adjust if different)
    const cameraDir = { x: 0, y: 0, z: -1 };
    
    const dot = normal.x * cameraDir.x + normal.y * cameraDir.y + normal.z * cameraDir.z;
    // return dot < 0;  // Negative = front-facing (normal towards camera) (too harsh)
    return dot >0.002;
}


const stlData = await fetch('models/Utah_teapot_(solid).stl').then(res => res.arrayBuffer());
const { points,connections,polygons } = parseSTL(stlData);

polygons.forEach(polygon => {
    polygon.rotatedPoints = polygon.points.map(index => {
        let point = points[index];
        point = rotate_axis(point, "y", 0.01);
        return rotate_axis(point, "x", 0.01);
    });
});
function getAverageZ(polygon) {
    return polygon.rotatedPoints.reduce((sum, pt) => sum + pt.z, 0) / polygon.rotatedPoints.length;
}

const sortedPolygons = polygons.sort((a, b) => getAverageZ(b) - getAverageZ(a));
// const findClosedConnections = (connections) => {
//     const visited = new Set();
//     const polygons = [];
//     const stack = [];
//     for (let i = 0; i < connections.length; i++) {
//         const [a, b] = connections[i];
//         stack.push(a);
//         stack.push(b);
//     }
//     while (stack.length > 0) {
//         const current = stack.pop();
//         if (visited.has(current)) {
//             continue;
//         }
//         visited.add(current);
//         const polygon = [];
//         polygon.push(current);
//         while (true) {
//             const next = connections[polygon[polygon.length - 1]][1];
//             if (visited.has(next)) {
//                 break;
//             }
//             visited.add(next);
//             polygon.push(next);
//             stack.push(next);
//         }
//         polygons.push(polygon);
//     }
//     return polygons;
// }
// let polygons = findClosedConnections(connections);

/// timer for FPS calculation
let lastTime = performance.now();
let frameCount = 0; 
let fps = 0;



/**
 * 
 * @type {FrameRequestCallback}
 */
function draw(delta = 0.01) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    // for (let i = 0; i < points.length; i++) {
    //     const point = points[i];
    //     let rotatedPoint = rotate_axis(point, "y", delta)
    //     rotatedPoint = rotate_axis(rotatedPoint, "x", delta)

    //     let projectedPoint = cartesianToJSCoordinate(project3dPoint(transposeZ(rotatedPoint)))

    //     printPoint(projectedPoint)

    // }
    // for (let i = 0; i < connections.length; i++) {
    //     const [a, b] = connections[i];
    //     const pointA = points[a];
    //     const pointB = points[b];
    //     let rotatedPointA = rotate_axis(pointA, "y", delta)
    //     let rotatedPointB = rotate_axis(pointB, "y", delta)
    //     rotatedPointA = rotate_axis(rotatedPointA, "x", delta)
    //     rotatedPointB = rotate_axis(rotatedPointB, "x", delta)
    //     const projectedPointA = project3dPoint(transposeZ(rotatedPointA))
    //     const projectedPointB = project3dPoint(transposeZ(rotatedPointB))
    //     // if ((cartesianToJSCoordinate(projectedPointA).x < -1 / 2 * width || cartesianToJSCoordinate(projectedPointA).x > width + 1 / 2 * width || cartesianToJSCoordinate(projectedPointA).y < -1 / 2 * height || cartesianToJSCoordinate(projectedPointA).y > height + 1 / 2 * height) && (cartesianToJSCoordinate(projectedPointB).x < -1 / 2 * width || cartesianToJSCoordinate(projectedPointB).x > width + 1 / 2 * width || cartesianToJSCoordinate(projectedPointB).y < -1 / 2 * height || cartesianToJSCoordinate(projectedPointB).y > height + 1 / 2 * height)) {
    //     //     continue;
    //     // }

    //     const gradientForVertex = ctx.createLinearGradient(cartesianToJSCoordinate(projectedPointA).x, cartesianToJSCoordinate(projectedPointA).y, cartesianToJSCoordinate(projectedPointB).x, cartesianToJSCoordinate(projectedPointB).y);
    //     //create two color stops derived from the current vertex. as points are from -1 to 1, we multiply by 360 to get a value between 0 and 360
    //     let stop1 = `hsl(${Math.round(360 * rotatedPointA.x)}, 100%, 50%)`;
    //     let stop2 = `hsl(${Math.round(360 * rotatedPointB.x)}, 100%, 50%)`;
    //     gradientForVertex.addColorStop(0, stop1);
    //     gradientForVertex.addColorStop(1, stop2);
    //     ctx.strokeStyle = gradientForVertex;
    //     ctx.beginPath();
    //     ctx.moveTo(cartesianToJSCoordinate(projectedPointA).x, cartesianToJSCoordinate(projectedPointA).y);
    //     ctx.lineTo(cartesianToJSCoordinate(projectedPointB).x, cartesianToJSCoordinate(projectedPointB).y);
    //     ctx.stroke();
    // }
    // find closed connections using dfs and fill with gradient
    // sort polygons by distance from camera such that polygons closer to camera are drawn first. Note, technically the polygon IS at 0,0 to facilitate rotation and is then translated to show on screen. So, the distance calculation should accomodate for this translation of the object being drawn.

    for (let i = 0; i < sortedPolygons.length; i++) {
        const polygon = sortedPolygons[i];
        if(!isFrontFacing(polygon,delta)){ 
            continue;
        }
        const pointsCurr = polygon.points.map(index => points[index]);
        let rotatedPointsCurr = pointsCurr.map(point => rotate_axis(point, "y", delta))
        rotatedPointsCurr = rotatedPointsCurr.map(point => rotate_axis(point, "x", delta))
        const projectedPointsCurr = rotatedPointsCurr.map(point => project3dPoint(transposeZ(point)))
        const gradientForPolygon = ctx.createLinearGradient(cartesianToJSCoordinate(projectedPointsCurr[0]).x, cartesianToJSCoordinate(projectedPointsCurr[0]).y, cartesianToJSCoordinate(projectedPointsCurr[projectedPointsCurr.length - 1]).x, cartesianToJSCoordinate(projectedPointsCurr[projectedPointsCurr.length - 1]).y);
        for (let j = 0; j < projectedPointsCurr.length; j++) {
            const point = projectedPointsCurr[j];
            let stop1 = `hsl(${Math.round(360 * point.x)}, 100%, 50%)`;
            let stop2 = `hsl(${Math.round(360 * point.x)}, 100%, 50%)`;
            gradientForPolygon.addColorStop(j / projectedPointsCurr.length, stop1);
            gradientForPolygon.addColorStop(j / projectedPointsCurr.length, stop2);
        }
        ctx.fillStyle = gradientForPolygon;
        ctx.beginPath();
        ctx.moveTo(cartesianToJSCoordinate(projectedPointsCurr[0]).x, cartesianToJSCoordinate(projectedPointsCurr[0]).y);
        for (let j = 1; j < projectedPointsCurr.length; j++) {
            ctx.lineTo(cartesianToJSCoordinate(projectedPointsCurr[j]).x, cartesianToJSCoordinate(projectedPointsCurr[j]).y);
        }
        ctx.fill();
    }

    // FPS calculation
    frameCount++;
    const currentTime = performance.now();
    const elapsedTime = currentTime - lastTime;
    if (elapsedTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
    }

    ctx.fillStyle = '#0f0';
    // use pageZoom to scale font size
    ctx.font = `${16 / pageZoom}px monospace`;
    ctx.fillText(`FPS: ${fps}`, 10, 30);

    requestAnimationFrame((time) => draw(time / 10000));
}


draw();