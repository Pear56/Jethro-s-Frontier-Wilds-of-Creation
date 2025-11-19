
import { BlockType, InventorySlot, ItemType } from './types';

export const CHUNK_SIZE = 32; // Size of generated area (Radius)
export const RENDER_DISTANCE = 14; // Draw distance in blocks (Radius)

// 3D & Physics
export const FOV = 80 * (Math.PI / 180);
export const SENSITIVITY = 0.0025;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE_HEIGHT = 1.6;
export const PLAYER_WIDTH = 0.6;
export const PLAYER_RADIUS = PLAYER_WIDTH / 2;
// Physics constants tuned for 60 FPS reference (dt ~16ms)
export const PLAYER_SPEED = 0.11; 
export const GRAVITY = 0.014;
export const JUMP_FORCE = 0.26;

export const COLORS: Record<BlockType, { top: string; side: string; bottom: string }> = {
  [BlockType.AIR]: { top: '#000', side: '#000', bottom: '#000' },
  [BlockType.GRASS]: { top: '#4ade80', side: '#166534', bottom: '#14532d' }, 
  [BlockType.DIRT]: { top: '#a87138', side: '#78350f', bottom: '#451a03' },
  [BlockType.STONE]: { top: '#94a3b8', side: '#475569', bottom: '#1e293b' },
  [BlockType.WOOD]: { top: '#5d4037', side: '#3e2723', bottom: '#271c19' },
  [BlockType.LEAVES]: { top: '#65a30d', side: '#365314', bottom: '#1a2e05' },
  [BlockType.SAND]: { top: '#fde047', side: '#ca8a04', bottom: '#854d0e' },
  [BlockType.WATER]: { top: '#60a5fa', side: '#1d4ed8', bottom: '#1e3a8a' },
  [BlockType.SNOW]: { top: '#f8fafc', side: '#cbd5e1', bottom: '#94a3b8' },
  [BlockType.CACTUS]: { top: '#10b981', side: '#047857', bottom: '#064e3b' },
  [BlockType.COAL_ORE]: { top: '#525252', side: '#262626', bottom: '#171717' }, // Darker stone
  [BlockType.IRON_ORE]: { top: '#d6d3d1', side: '#a8a29e', bottom: '#78716c' }, // Lighter/Rust spots
  [BlockType.BEDROCK]: { top: '#0f172a', side: '#020617', bottom: '#000' },
};

export const INITIAL_INVENTORY: InventorySlot[] = [
  { id: 'hand', type: ItemType.HAND, count: 1, name: 'Hand' },
  { id: 'pickaxe', type: ItemType.PICKAXE, count: 1, name: 'Pickaxe' },
  { id: 'wood', type: ItemType.BLOCK, blockType: BlockType.WOOD, count: 64, name: 'Wood Log' },
  { id: 'stone', type: ItemType.BLOCK, blockType: BlockType.STONE, count: 64, name: 'Stone' },
  { id: 'grass', type: ItemType.BLOCK, blockType: BlockType.GRASS, count: 64, name: 'Grass' },
  { id: 'berry', type: ItemType.FOOD, count: 10, name: 'Berries' },
];

export const DAY_LENGTH = 2400; // Ticks per day
export const TICK_RATE = 50; // ms per game logic tick
