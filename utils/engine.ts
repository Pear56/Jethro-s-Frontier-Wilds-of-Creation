
import { BlockType, WorldBlock } from '../types';
import { COLORS, CHUNK_SIZE, FOV, RENDER_DISTANCE } from '../constants';

// ----------------------
// Terrain Generation
// ----------------------

export const getNoiseHeight = (x: number, y: number) => {
  const n1 = Math.sin(x / 10) * Math.cos(y / 10);
  const n2 = Math.sin(x / 20 + 100) * Math.cos(y / 20 + 100);
  const heightMap = Math.floor((n1 + n2) * 4) + 3;
  
  if (x > 20 && y > 20) return 2; // Desert flat
  
  return Math.max(1, heightMap + 6);
};

export const getBiomeBlock = (x: number, y: number, z: number, groundLevel: number): BlockType => {
  if (z === 0) return BlockType.BEDROCK;
  if (z < 4 && z > groundLevel) return BlockType.WATER;
  if (x > 20 && y > 20) return BlockType.SAND;
  if (z > 12) return BlockType.SNOW;
  
  // Ores & Stone
  if (z <= groundLevel - 3) {
    const noise = Math.sin(x * y * z);
    if (noise > 0.95) return BlockType.COAL_ORE;
    if (noise < -0.96 && z < 8) return BlockType.IRON_ORE;
    return BlockType.STONE;
  }
  
  if (z > 9) return BlockType.STONE;
  return BlockType.GRASS;
};

export const generateChunk = (): Map<string, WorldBlock> => {
  const blocks = new Map<string, WorldBlock>();

  // Generate slightly wider than chunk size to avoid edge gaps in distance
  const GEN_SIZE = CHUNK_SIZE + 5;

  for (let x = -GEN_SIZE; x <= GEN_SIZE; x++) {
    for (let y = -GEN_SIZE; y <= GEN_SIZE; y++) {
      const h = getNoiseHeight(x, y);
      
      // Bedrock floor for safety
      blocks.set(`${x},${y},0`, { x, y, z: 0, type: BlockType.BEDROCK });

      for (let z = 1; z <= h; z++) {
        const type = getBiomeBlock(x, y, z, h);
        blocks.set(`${x},${y},${z}`, { x, y, z, type });
      }

      // Trees
      if (h > 4 && h < 10 && Math.random() < 0.02 && x <= 20 && getBiomeBlock(x,y,h,h) === BlockType.GRASS) {
        for(let i=1; i<=3; i++) blocks.set(`${x},${y},${h+i}`, { x, y, z: h+i, type: BlockType.WOOD });
        const lz = h + 3;
        for(let lx = -1; lx <= 1; lx++) {
           for(let ly = -1; ly <= 1; ly++) {
              if (lx===0 && ly===0) continue; // Don't overwrite wood
              blocks.set(`${x+lx},${y+ly},${lz}`, { x: x+lx, y: y+ly, z: lz, type: BlockType.LEAVES });
           }
        }
        blocks.set(`${x},${y},${lz+1}`, { x, y, z: lz+1, type: BlockType.LEAVES });
      }

      // Cacti
      if (x > 20 && y > 20 && Math.random() < 0.01) {
         blocks.set(`${x},${y},${h+1}`, { x, y, z: h+1, type: BlockType.CACTUS });
         blocks.set(`${x},${y},${h+2}`, { x, y, z: h+2, type: BlockType.CACTUS });
      }
    }
  }
  return blocks;
};

// ----------------------
// 3D Math & Physics Helpers
// ----------------------

export interface RayResult {
  hit: WorldBlock;
  place: {x: number, y: number, z: number};
  dist: number;
}

export const castRay = (
  blocks: Map<string, WorldBlock>,
  origin: {x: number, y: number, z: number},
  yaw: number,
  pitch: number,
  reach: number
): RayResult | null => {
  let rx = origin.x;
  let ry = origin.y;
  let rz = origin.z;
  
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  
  const dx = -sn * cp;
  const dy = cs * cp;
  const dz = -sp;
  
  const step = 0.05; // Precision
  const steps = Math.ceil(reach / step);

  let prev = { x: Math.floor(rx), y: Math.floor(ry), z: Math.floor(rz) };

  for(let i=0; i<steps; i++) {
     rx += dx * step;
     ry += dy * step;
     rz += dz * step;
     
     const bx = Math.floor(rx);
     const by = Math.floor(ry);
     const bz = Math.floor(rz);
     
     // Optimization: Only check if block coordinate changed
     if (bx === prev.x && by === prev.y && bz === prev.z) continue;

     const key = `${bx},${by},${bz}`;
     const block = blocks.get(key);
     
     if (block && block.type !== BlockType.WATER && block.type !== BlockType.AIR) {
        return {
            hit: block,
            place: prev, // The empty space before the hit
            dist: i * step
        };
     }
     prev = { x: bx, y: by, z: bz };
  }
  return null;
};

// ----------------------
// Projection & Rendering
// ----------------------

interface Point3D { x: number, y: number, z: number }
interface ScreenPoint { x: number, y: number, scale: number, visible: boolean }

export const project = (
  p: Point3D, 
  cam: { x: number, y: number, z: number, yaw: number, pitch: number },
  width: number, 
  height: number
): ScreenPoint => {
  // 1. Translate to camera space
  let x = p.x - cam.x;
  let y = p.y - cam.y;
  let z = p.z - cam.z;

  // 2. Rotate Yaw (around Z-axis)
  const cs = Math.cos(cam.yaw);
  const sn = Math.sin(cam.yaw);
  const rx = x * cs - y * sn;
  const ry = x * sn + y * cs; 

  // 3. Rotate Pitch (around X-axis)
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  
  const depth = ry * cp - z * sp;
  const up = ry * sp + z * cp;

  if (depth <= 0.1) {
    return { x: 0, y: 0, scale: 0, visible: false };
  }

  // 4. Perspective Projection
  const aspect = width / height;
  const f = height / (2 * Math.tan(FOV / 2));
  
  const sx = (rx * f) / depth + width / 2;
  const sy = (height / 2) - (up * f) / depth;

  return {
    x: sx,
    y: sy,
    scale: f / depth,
    visible: true
  };
};

// Helper to check if a face is hidden by a neighbor
export const isOccluded = (blocks: Map<string, WorldBlock>, x: number, y: number, z: number) => {
  const neighbor = blocks.get(`${x},${y},${z}`);
  return neighbor && neighbor.type !== BlockType.LEAVES && neighbor.type !== BlockType.WATER && neighbor.type !== BlockType.CACTUS;
};

export const drawCube = (
  ctx: CanvasRenderingContext2D,
  block: WorldBlock,
  cam: { x: number, y: number, z: number, yaw: number, pitch: number },
  width: number,
  height: number,
  blocks: Map<string, WorldBlock>,
  isHighlight: boolean = false,
  distSq: number = 0
) => {
  const { x, y, z, type } = block;
  
  const vertices = [
    { x: x,   y: y,   z: z },   // 0
    { x: x+1, y: y,   z: z },   // 1
    { x: x+1, y: y+1, z: z },   // 2
    { x: x,   y: y+1, z: z },   // 3
    { x: x,   y: y,   z: z+1 }, // 4
    { x: x+1, y: y,   z: z+1 }, // 5
    { x: x+1, y: y+1, z: z+1 }, // 6
    { x: x,   y: y+1, z: z+1 }, // 7
  ].map(v => project(v, cam, width, height));

  // Simple culling: if all vertices off screen or behind
  if (vertices.every(v => !v.visible)) return;

  // Fog Calculation
  let opacity = 1;
  if (!isHighlight) {
    // Linear fog
    const dist = Math.sqrt(distSq);
    const maxDist = RENDER_DISTANCE; 
    // Fade out starting at 70% of render distance
    if (dist > maxDist * 0.7) {
      opacity = 1 - (dist - maxDist * 0.7) / (maxDist * 0.3);
    }
    if (opacity <= 0) return; // Don't draw if fully fogged
  }

  // Selection Box Mode: Draw simple wireframe
  if (isHighlight) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1; // Always fully visible
    const lines = [
      [0,1], [1,2], [2,3], [3,0], // Bottom
      [4,5], [5,6], [6,7], [7,4], // Top
      [0,4], [1,5], [2,6], [3,7]  // Pillars
    ];
    
    ctx.beginPath();
    lines.forEach(([s, e]) => {
        if (vertices[s].visible && vertices[e].visible) {
            ctx.moveTo(vertices[s].x, vertices[s].y);
            ctx.lineTo(vertices[e].x, vertices[e].y);
        }
    });
    ctx.stroke();
    return;
  }

  // Normal Render Mode
  const cols = COLORS[type] || COLORS[BlockType.STONE];
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(0,0,0,${0.1 * opacity})`; 
  ctx.globalAlpha = opacity;

  const drawFace = (vIdx: number[], color: string) => {
     ctx.fillStyle = color;
     ctx.beginPath();
     ctx.moveTo(vertices[vIdx[0]].x, vertices[vIdx[0]].y);
     ctx.lineTo(vertices[vIdx[1]].x, vertices[vIdx[1]].y);
     ctx.lineTo(vertices[vIdx[2]].x, vertices[vIdx[2]].y);
     ctx.lineTo(vertices[vIdx[3]].x, vertices[vIdx[3]].y);
     ctx.closePath();
     ctx.fill();
     ctx.stroke();
  };

  // Drawing faces logic (Backface culling approximation)
  // TOP (z+1)
  if (cam.z > z && !isOccluded(blocks, x, y, z+1)) {
      drawFace([4, 5, 6, 7], cols.top);
  }
  // BOTTOM (z)
  else if (cam.z < z && !isOccluded(blocks, x, y, z-1) && type !== BlockType.WATER) {
      drawFace([3, 2, 1, 0], cols.bottom);
  }

  // FRONT (+y)
  if (cam.y > y && !isOccluded(blocks, x, y+1, z)) {
      drawFace([3, 2, 6, 7], cols.side);
  }
  // BACK (-y)
  else if (cam.y < y && !isOccluded(blocks, x, y-1, z)) {
      drawFace([1, 0, 4, 5], cols.side);
  }

  // RIGHT (+x)
  if (cam.x > x && !isOccluded(blocks, x+1, y, z)) {
      drawFace([1, 2, 6, 5], cols.side);
  }
  // LEFT (-x)
  else if (cam.x < x && !isOccluded(blocks, x-1, y, z)) {
      drawFace([3, 0, 4, 7], cols.side);
  }

  ctx.globalAlpha = 1.0; // Reset
};
