
export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  SAND = 6,
  WATER = 7,
  SNOW = 8,
  CACTUS = 9,
  COAL_ORE = 10,
  IRON_ORE = 11,
  BEDROCK = 99
}

export enum ItemType {
  HAND = 'hand',
  PICKAXE = 'pickaxe',
  AXE = 'axe',
  FOOD = 'food',
  BLOCK = 'block'
}

export interface InventorySlot {
  id: string;
  type: ItemType;
  blockType?: BlockType; // If it's a placeable block
  count: number;
  name: string;
  icon?: string;
}

export interface PlayerStats {
  health: number;
  hunger: number;
  thirst: number;
  temp: number;
}

export interface WorldBlock {
  x: number;
  y: number;
  z: number; // Vertical height
  type: BlockType;
}

export interface GameState {
  player: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    yaw: number;   // Horizontal angle (radians)
    pitch: number; // Vertical angle (radians)
  };
  stats: PlayerStats;
  time: number; // 0 to 2400
  inventory: InventorySlot[];
  selectedSlot: number;
}
