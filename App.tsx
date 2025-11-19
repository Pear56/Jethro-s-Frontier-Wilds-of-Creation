
import React, { useEffect, useRef, useState, useCallback } from 'react';
import HUD from './components/UI/HUD';
import { 
  BlockType, 
  InventorySlot, 
  ItemType, 
  PlayerStats, 
  WorldBlock 
} from './types';
import { 
  COLORS, 
  INITIAL_INVENTORY, 
  RENDER_DISTANCE, 
  PLAYER_SPEED, 
  DAY_LENGTH, 
  TICK_RATE,
  GRAVITY,
  JUMP_FORCE,
  PLAYER_EYE_HEIGHT,
  PLAYER_HEIGHT,
  SENSITIVITY,
  PLAYER_RADIUS,
  CHUNK_SIZE
} from './constants';
import { 
  drawCube, 
  generateChunk, 
  castRay,
  RayResult,
  project
} from './utils/engine';
import { Play, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const stateRef = useRef<{
    blocks: Map<string, WorldBlock>;
    player: { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; pitch: number };
    keys: Set<string>;
    lastTime: number;
    gameTickAccumulator: number;
    mouseLocked: boolean;
    highlight: RayResult | null;
  }>({
    blocks: generateChunk(),
    player: { x: 0, y: 0, z: 12, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 },
    keys: new Set(),
    lastTime: performance.now(),
    gameTickAccumulator: 0,
    mouseLocked: false,
    highlight: null
  });

  const [uiStats, setUiStats] = useState<PlayerStats>({ health: 100, hunger: 100, thirst: 100, temp: 50 });
  const [inventory, setInventory] = useState<InventorySlot[]>(INITIAL_INVENTORY);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [gameTime, setGameTime] = useState(800);
  const [showMenu, setShowMenu] = useState(true);

  // --- Physics Helpers ---
  const isBlockSolid = useCallback((x: number, y: number, z: number) => {
      const key = `${x},${y},${z}`;
      const b = stateRef.current.blocks.get(key);
      return b && b.type !== BlockType.WATER && b.type !== BlockType.AIR && b.type !== BlockType.CACTUS;
  }, []);

  const checkCollision = useCallback((pos: {x: number, y: number, z: number}) => {
    const r = PLAYER_RADIUS;
    const minX = Math.floor(pos.x - r);
    const maxX = Math.floor(pos.x + r);
    const minY = Math.floor(pos.y - r);
    const maxY = Math.floor(pos.y + r);
    const minZ = Math.floor(pos.z);
    const maxZ = Math.floor(pos.z + PLAYER_HEIGHT - 0.1);

    for(let x = minX; x <= maxX; x++) {
      for(let y = minY; y <= maxY; y++) {
        for(let z = minZ; z <= maxZ; z++) {
           if (isBlockSolid(x,y,z)) return true;
        }
      }
    }
    return false;
  }, [isBlockSolid]);

  // --- Interaction ---
  const handleInteraction = () => {
     const { highlight, blocks } = stateRef.current;
     if (!highlight) return;

     const item = inventory[selectedSlot];
     const { hit, place } = highlight;

     if (item.type === ItemType.PICKAXE || item.type === ItemType.HAND || item.type === ItemType.AXE) {
         blocks.delete(`${hit.x},${hit.y},${hit.z}`);
     } 
     else if (item.type === ItemType.BLOCK && item.blockType) {
         const blockBox = { x: place.x + 0.5, y: place.y + 0.5, z: place.z };
         const dx = Math.abs(stateRef.current.player.x - blockBox.x);
         const dy = Math.abs(stateRef.current.player.y - blockBox.y);
         const dz = blockBox.z - stateRef.current.player.z;
         
         // Prevent placing block inside self
         if (dx < 0.5 + PLAYER_RADIUS && dy < 0.5 + PLAYER_RADIUS && dz >= -1 && dz < PLAYER_HEIGHT) {
             return;
         }
         blocks.set(`${place.x},${place.y},${place.z}`, { x: place.x, y: place.y, z: place.z, type: item.blockType });
         
         const newInv = [...inventory];
         if (newInv[selectedSlot].count > 1) {
             newInv[selectedSlot].count--;
         } else {
             newInv[selectedSlot].count = 0; 
         }
         setInventory(newInv);
     }
  };

  // --- Input Events ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => stateRef.current.keys.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => stateRef.current.keys.delete(e.code);
    
    const handleMouseMove = (e: MouseEvent) => {
        if (!stateRef.current.mouseLocked) return;
        const { player } = stateRef.current;
        player.yaw -= e.movementX * SENSITIVITY;
        player.pitch -= e.movementY * SENSITIVITY;
        player.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, player.pitch));
    };

    const handleClick = () => {
        if (!stateRef.current.mouseLocked && !showMenu) {
            canvasRef.current?.requestPointerLock();
            return;
        }
        handleInteraction();
    };

    const onLockChange = () => {
        stateRef.current.mouseLocked = !!document.pointerLockElement;
        if (!document.pointerLockElement && !showMenu) {
            setShowMenu(true);
        }
    };

    // Mobile Controls
    let touchStartX = 0, touchStartY = 0;
    let lookStartX = 0, lookStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
        for(let i=0; i<e.touches.length; i++) {
            const t = e.touches[i];
            if (t.clientX < window.innerWidth / 2) {
                touchStartX = t.clientX;
                touchStartY = t.clientY;
            } else {
                lookStartX = t.clientX;
                lookStartY = t.clientY;
                handleInteraction();
            }
        }
    };
    const handleTouchMove = (e: TouchEvent) => {
         for(let i=0; i<e.touches.length; i++) {
            const t = e.touches[i];
            if (t.clientX < window.innerWidth / 2) {
                const dy = t.clientY - touchStartY;
                stateRef.current.keys.delete('KeyW'); stateRef.current.keys.delete('KeyS');
                if (dy < -20) stateRef.current.keys.add('KeyW');
                if (dy > 20) stateRef.current.keys.add('KeyS');
            } else {
                const dx = t.clientX - lookStartX;
                const dy = t.clientY - lookStartY;
                stateRef.current.player.yaw -= dx * 0.01;
                stateRef.current.player.pitch -= dy * 0.01;
                lookStartX = t.clientX;
                lookStartY = t.clientY;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleClick);
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showMenu, selectedSlot, inventory]);

  // --- Game Loop ---
  const update = useCallback(() => {
    if (showMenu) {
        stateRef.current.lastTime = performance.now(); // Reset timer so physics doesn't jump
        requestRef.current = requestAnimationFrame(update);
        return;
    }

    const now = performance.now();
    let dt = now - stateRef.current.lastTime;
    stateRef.current.lastTime = now;
    
    // Prevent huge delta time if tab was inactive
    if (dt > 100) dt = 100;

    const { player, keys, blocks } = stateRef.current;

    // 1. Game Logic (Fixed Tick Rate Accumulator)
    stateRef.current.gameTickAccumulator += dt;
    if (stateRef.current.gameTickAccumulator > TICK_RATE) {
        setGameTime(prev => (prev + 1) % DAY_LENGTH);
        setUiStats(prev => ({
            ...prev,
            hunger: Math.max(0, prev.hunger - 0.01),
            health: prev.hunger === 0 ? prev.health - 0.1 : Math.min(100, prev.health + 0.01)
        }));
        stateRef.current.gameTickAccumulator -= TICK_RATE;
    }

    // 2. Physics (Scaled by Delta Time)
    // Reference FPS = 60 (16.66ms). Scale factor = dt / 16.66
    const dtScale = dt / 16.66;
    
    // Highlight Raycast
    const camEye = { x: player.x, y: player.y, z: player.z + PLAYER_EYE_HEIGHT };
    stateRef.current.highlight = castRay(blocks, camEye, player.yaw, player.pitch, 5.0);

    // Movement
    let speed = PLAYER_SPEED * dtScale;
    if (keys.has('ShiftLeft')) speed *= 1.5; 
    if (uiStats.hunger < 10) speed *= 0.5;

    let mx = 0, my = 0;
    if (keys.has('KeyW')) my += 1;
    if (keys.has('KeyS')) my -= 1;
    if (keys.has('KeyA')) mx -= 1;
    if (keys.has('KeyD')) mx += 1;

    if (mx !== 0 || my !== 0) {
        const angle = Math.atan2(mx, my) + player.yaw;
        player.vx = -Math.sin(angle) * speed;
        player.vy = Math.cos(angle) * speed;
    } else {
        player.vx *= 0.8; // Friction
        player.vy *= 0.8;
    }

    // Collision X
    if (checkCollision({ x: player.x + player.vx, y: player.y, z: player.z })) {
        player.vx = 0;
    }
    player.x += player.vx;

    // Collision Y
    if (checkCollision({ x: player.x, y: player.y + player.vy, z: player.z })) {
        player.vy = 0;
    }
    player.y += player.vy;

    // World Bounds
    const LIMIT = CHUNK_SIZE + 4;
    player.x = Math.max(-LIMIT, Math.min(LIMIT, player.x));
    player.y = Math.max(-LIMIT, Math.min(LIMIT, player.y));

    // Gravity & Jump
    if (keys.has('Space') && player.vz === 0) {
        if (checkCollision({ x: player.x, y: player.y, z: player.z - 0.05 })) {
            player.vz = JUMP_FORCE;
        }
    }

    player.vz -= GRAVITY * dtScale;
    
    // Collision Z
    if (checkCollision({ x: player.x, y: player.y, z: player.z + player.vz })) {
        if (player.vz < 0) {
             player.z = Math.round(player.z); 
        }
        player.vz = 0;
    }
    player.z += player.vz;

    // Kill Floor
    if (player.z < -5) {
        handleRespawn();
        return;
    }

    draw(gameTime);
    requestRef.current = requestAnimationFrame(update);
  }, [showMenu, uiStats, gameTime, checkCollision]);

  // --- Rendering ---
  const draw = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    const { width, height } = canvas;
    if (width !== window.innerWidth || height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Sky Calculations
    const timePercent = time / DAY_LENGTH;
    const isDay = time > 400 && time < 2000;
    
    // Sky Color Interpolation (Simple)
    let skyHex = isDay ? '#60a5fa' : '#0f172a';
    if (time > 300 && time <= 400) skyHex = '#fdba74'; // Sunrise
    if (time >= 2000 && time < 2100) skyHex = '#c084fc'; // Sunset
    
    ctx.fillStyle = skyHex;
    ctx.fillRect(0, 0, width, height);

    // Sun / Moon
    // Sun angle moves from 0 to PI during day (0.16 to 0.83 of time)
    const sunAngle = (timePercent * Math.PI * 2) - (Math.PI / 2); // Start bottom
    const cx = width / 2;
    const cy = height; // Horizon
    const orbitRadius = height * 0.8;
    
    const sunX = cx + Math.cos(sunAngle) * orbitRadius;
    const sunY = cy + Math.sin(sunAngle) * orbitRadius;
    
    // Draw Sun
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw Moon (Opposite)
    const moonX = cx + Math.cos(sunAngle + Math.PI) * orbitRadius;
    const moonY = cy + Math.sin(sunAngle + Math.PI) * orbitRadius;
    ctx.fillStyle = '#f1f5f9';
    ctx.shadowColor = '#f1f5f9';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset

    const { player, blocks, highlight } = stateRef.current;
    const cam = { ...player, z: player.z + PLAYER_EYE_HEIGHT };

    // Collect visible blocks
    const renderList: {block: WorldBlock, dist: number}[] = [];
    const r = RENDER_DISTANCE;
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    const pz = Math.floor(player.z);

    for(let x = px - r; x <= px + r; x++) {
        for(let y = py - r; y <= py + r; y++) {
            for(let z = pz - r; z <= pz + r; z++) {
                const key = `${x},${y},${z}`;
                const b = blocks.get(key);
                if (b) {
                    const distSq = (x - px)**2 + (y - py)**2 + (z - pz)**2;
                    if (distSq < r*r) {
                         renderList.push({ block: b, dist: distSq });
                    }
                }
            }
        }
    }

    // Sort Far to Near
    renderList.sort((a, b) => b.dist - a.dist);

    // Render Blocks
    renderList.forEach(item => {
        drawCube(ctx, item.block, cam, width, height, blocks, false, item.dist);
    });

    // Render Highlight
    if (highlight) {
        drawCube(ctx, highlight.hit, cam, width, height, blocks, true);
    }

    renderHand(ctx, width, height);
  };

  const renderHand = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const item = inventory[selectedSlot];
      // Bobbing effect using Time
      const now = performance.now();
      const isMoving = stateRef.current.keys.has('KeyW') || stateRef.current.keys.has('KeyS') || stateRef.current.keys.has('KeyA') || stateRef.current.keys.has('KeyD');
      const bobOffset = isMoving ? Math.sin(now / 150) * 10 : Math.sin(now / 500) * 2;
      
      const handX = w - 220;
      const handY = h - 200 + bobOffset;

      ctx.save();
      if (item.type === ItemType.BLOCK && item.blockType) {
           const c = COLORS[item.blockType];
           ctx.translate(handX, handY);
           ctx.fillStyle = c.side;
           ctx.fillRect(0, 40, 80, 80);
           ctx.fillStyle = c.top;
           ctx.beginPath(); 
           ctx.moveTo(0, 40); ctx.lineTo(40, 0); ctx.lineTo(120, 0); ctx.lineTo(80, 40); 
           ctx.fill();
      } else {
          ctx.translate(handX, handY);
          ctx.fillStyle = '#fca5a5';
          ctx.fillRect(40, 40, 60, 200);
          
          if (item.type === ItemType.PICKAXE) {
              ctx.fillStyle = '#64748b';
              ctx.translate(70, 30);
              ctx.rotate(-0.2);
              ctx.fillRect(0, -20, 15, 120);
              ctx.fillStyle = '#cbd5e1';
              ctx.beginPath();
              ctx.moveTo(-20, -20);
              ctx.quadraticCurveTo(7, -40, 35, -20);
              ctx.lineTo(35, -10);
              ctx.quadraticCurveTo(7, -30, -20, -10);
              ctx.fill();
          }
      }
      ctx.restore();
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  const handleRespawn = () => {
      stateRef.current.blocks = generateChunk();
      stateRef.current.player = { x: 0, y: 0, z: 15, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 };
      setUiStats({ health: 100, hunger: 100, thirst: 100, temp: 50 });
      setGameTime(800);
      setShowMenu(false);
      stateRef.current.lastTime = performance.now();
  };

  return (
    <div className="relative w-full h-full bg-gray-900 font-sans select-none overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {!showMenu && (
        <HUD 
          stats={uiStats} 
          inventory={inventory} 
          selectedSlot={selectedSlot} 
          onSelectSlot={setSelectedSlot}
          time={gameTime}
          onOpenMenu={() => setShowMenu(true)}
        />
      )}

      {showMenu && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm text-white">
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-600 max-w-md w-full text-center shadow-2xl">
                <h1 className="text-4xl font-bold text-yellow-500 mb-2">Jethro's Frontier</h1>
                <p className="text-gray-400 mb-8">First Person Sandbox Survival</p>
                
                <button onClick={() => { 
                    setShowMenu(false); 
                    stateRef.current.lastTime = performance.now();
                    canvasRef.current?.requestPointerLock(); 
                }} className="w-full py-3 mb-4 bg-green-600 hover:bg-green-500 rounded font-bold flex justify-center items-center gap-2 transition-colors">
                    <Play size={20} /> {uiStats.health <= 0 ? 'Respawn' : 'Resume Game'}
                </button>
                
                <button onClick={handleRespawn} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded font-bold flex justify-center items-center gap-2 transition-colors">
                    <RefreshCw size={20} /> New World
                </button>
                
                <div className="mt-6 text-left text-sm text-gray-400 bg-black/30 p-4 rounded-lg">
                    <p className="mb-2 font-semibold text-gray-300">Controls:</p>
                    <ul className="grid grid-cols-2 gap-1">
                        <li>🖱️ <strong>Mouse:</strong> Look</li>
                        <li>⌨️ <strong>WASD:</strong> Move</li>
                        <li>␣ <strong>Space:</strong> Jump</li>
                        <li>⇧ <strong>Shift:</strong> Sprint</li>
                        <li>🖱️ <strong>L-Click:</strong> Action</li>
                        <li>⎋ <strong>ESC:</strong> Menu</li>
                    </ul>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
