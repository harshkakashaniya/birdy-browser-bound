import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BodySegment {
  x: number;
  y: number;
  id: string;
}

interface GameState {
  birdX: number;
  birdY: number;
  birdDirection: { x: number; y: number };
  bodySegments: BodySegment[];
  pipes: Array<{ x: number; topHeight: number; passed: boolean; isSpecial?: boolean; gap: number; id?: string }>;
  coins: number;
  gameStarted: boolean;
  gameOver: boolean;
  inSpecialWorld: boolean;
  worldCoins: Array<{ x: number; y: number; collected: boolean; id: string }>;
  colorTheme: number;
  portalTimer: number;
  portalExit: { x: number; y: number } | null;
  enteredPortal: { x: number; topHeight: number; gap: number; id: string } | null;
  frogsEaten: number;
  isEating: boolean;
  usedPortalIds: Set<string>;
}

const BIRD_SIZE = 30;
const PIPE_WIDTH = 60;
const INITIAL_PIPE_GAP = 250;
const MIN_PIPE_GAP = 120;
const MOVE_SPEED = 4; // Increased from 3 for more reactive controls
const PIPE_SPEED = 2;
const SPECIAL_PIPE_CHANCE = 0.2;
const SEGMENT_FOLLOW_DISTANCE = 25; // Distance between body segments

export const FlappyBird = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    birdX: 200,
    birdY: 250,
    birdDirection: { x: 0, y: 0 },
    bodySegments: [],
    pipes: [],
    coins: 0,
    gameStarted: false,
    gameOver: false,
    inSpecialWorld: false,
    worldCoins: [],
    colorTheme: 0,
    portalTimer: 10,
    portalExit: null,
    enteredPortal: null,
    frogsEaten: 0,
    isEating: false,
    usedPortalIds: new Set(),
  });

  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const resetGame = () => {
    setGameState({
      birdX: 200,
      birdY: 250,
      birdDirection: { x: 0, y: 0 },
      bodySegments: [],
      pipes: [],
      coins: 0,
      gameStarted: false,
      gameOver: false,
      inSpecialWorld: false,
      worldCoins: [],
      colorTheme: 0,
      portalTimer: 10,
      portalExit: null,
      enteredPortal: null,
      frogsEaten: 0,
      isEating: false,
      usedPortalIds: new Set(),
    });
    toast("Game Reset! Use WASD to control the snake!");
  };

  // Generate random frogs for special world
  const generateWorldCoins = () => {
    const frogs = [];
    for (let i = 0; i < 12; i++) {
      frogs.push({
        x: Math.random() * 340 + 30,
        y: Math.random() * 400 + 50,
        collected: false,
        id: `frog-${i}-${Date.now()}`
      });
    }
    return frogs;
  };

  // Generate portal exit
  const generatePortalExit = () => {
    return {
      x: Math.random() * 300 + 50,
      y: Math.random() * 300 + 50
    };
  };

  // Calculate dynamic pipe gap based on coins
  const getCurrentPipeGap = (coins: number) => {
    const reduction = Math.floor(coins / 10) * 15;
    return Math.max(MIN_PIPE_GAP, INITIAL_PIPE_GAP - reduction);
  };

  // Calculate color theme based on coins
  const getCurrentTheme = (coins: number) => {
    return Math.floor(coins / 20);
  };

  // Helper function to update body segments
  const updateBodySegments = (headX: number, headY: number, currentSegments: BodySegment[], frogsEaten: number) => {
    const targetSegmentCount = Math.min(10, frogsEaten); // Max 10 segments
    const newSegments: BodySegment[] = [];
    
    if (targetSegmentCount > 0) {
      // Add head position as first segment
      const headSegment = { x: headX, y: headY, id: 'head' };
      
      // Calculate positions for body segments
      for (let i = 0; i < targetSegmentCount; i++) {
        if (i === 0) {
          // First segment follows the head
          if (currentSegments.length > 0) {
            const prevSegment = currentSegments[0];
            const dx = headX - prevSegment.x;
            const dy = headY - prevSegment.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > SEGMENT_FOLLOW_DISTANCE) {
              const ratio = SEGMENT_FOLLOW_DISTANCE / distance;
              newSegments.push({
                x: headX - dx * ratio,
                y: headY - dy * ratio,
                id: `segment-${i}`
              });
            } else {
              newSegments.push({ ...prevSegment, id: `segment-${i}` });
            }
          } else {
            // No previous segments, place first segment behind head
            newSegments.push({
              x: headX - SEGMENT_FOLLOW_DISTANCE,
              y: headY,
              id: `segment-${i}`
            });
          }
        } else {
          // Each segment follows the previous one
          const prevSegment = newSegments[i - 1];
          const targetSegment = currentSegments[i] || { x: prevSegment.x - SEGMENT_FOLLOW_DISTANCE, y: prevSegment.y };
          
          const dx = prevSegment.x - targetSegment.x;
          const dy = prevSegment.y - targetSegment.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > SEGMENT_FOLLOW_DISTANCE) {
            const ratio = SEGMENT_FOLLOW_DISTANCE / distance;
            newSegments.push({
              x: prevSegment.x - dx * ratio,
              y: prevSegment.y - dy * ratio,
              id: `segment-${i}`
            });
          } else {
            newSegments.push({ ...targetSegment, id: `segment-${i}` });
          }
        }
      }
    }
    
    return newSegments;
  };

  // WASD Controls - More responsive
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = e.key.toLowerCase();
      
      if (['w', 'a', 's', 'd'].includes(key)) {
        if (!gameState.gameStarted) {
          setGameState(prev => ({ ...prev, gameStarted: true }));
        }
        setPressedKeys(prev => new Set(prev.add(key)));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        setPressedKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStarted]);

  // Game loop - Enhanced with body segments and better portal handling
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const gameLoop = setInterval(() => {
      setGameState(prev => {
        // Calculate new snake direction based on pressed keys (more responsive)
        let newDirectionX = 0;
        let newDirectionY = 0;
        
        if (pressedKeys.has('w')) newDirectionY = -MOVE_SPEED;
        if (pressedKeys.has('s')) newDirectionY = MOVE_SPEED;
        if (pressedKeys.has('a')) newDirectionX = -MOVE_SPEED;
        if (pressedKeys.has('d')) newDirectionX = MOVE_SPEED;

        // Update snake head position
        let newBirdX = Math.max(0, Math.min(370, prev.birdX + newDirectionX));
        let newBirdY = Math.max(0, Math.min(470, prev.birdY + newDirectionY));
        
        // Update body segments
        let newBodySegments = updateBodySegments(newBirdX, newBirdY, prev.bodySegments, prev.frogsEaten);
        
        let newPipes = [...prev.pipes];
        let newGameOver = prev.gameOver;
        let newCoins = prev.coins;
        let newInSpecialWorld = prev.inSpecialWorld;
        let newWorldCoins = [...prev.worldCoins];
        let newColorTheme = getCurrentTheme(newCoins);
        let newUsedPortalIds = new Set(prev.usedPortalIds);

        if (!newInSpecialWorld) {
          // Normal world - move pipes
          newPipes = newPipes.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }));
          newPipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

          // Add new pipes
          if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < 200) {
            const currentGap = getCurrentPipeGap(prev.coins);
            const isSpecial = Math.random() < SPECIAL_PIPE_CHANCE;
            const topHeight = Math.random() * 200 + 50;
            const pipeId = `pipe-${Date.now()}-${Math.random()}`;
            
            newPipes.push({
              x: 400,
              topHeight,
              passed: false,
              isSpecial,
              gap: currentGap,
              id: pipeId
            });
          }

          // Check pipe collisions and portal entry
          newPipes.forEach(pipe => {
            const birdLeft = newBirdX;
            const birdRight = newBirdX + BIRD_SIZE;
            const birdTop = newBirdY;
            const birdBottom = newBirdY + BIRD_SIZE;

            const pipeLeft = pipe.x;
            const pipeRight = pipe.x + PIPE_WIDTH;

            // Check if bird is within pipe x range and hasn't used this portal before
            if (birdRight > pipeLeft && birdLeft < pipeRight && !newUsedPortalIds.has(pipe.id || '')) {
              if (pipe.isSpecial) {
                // Special pipe - check if bird goes through the portal
                const portalTop = pipe.topHeight + pipe.gap * 0.3;
                const portalBottom = pipe.topHeight + pipe.gap * 0.7;
                
                if (birdTop >= portalTop && birdBottom <= portalBottom) {
                  // Bird entered special world!
                  if (!newInSpecialWorld && pipe.id) {
                    newInSpecialWorld = true;
                    newWorldCoins = generateWorldCoins();
                    newCoins += 5;
                    newUsedPortalIds.add(pipe.id);
                    // Store the portal information for exit positioning
                    const enteredPortal = { x: pipe.x, topHeight: pipe.topHeight, gap: pipe.gap, id: pipe.id || '' };
                    toast.success("🌟 Entered Portal! Collect the frogs! Find the exit in 10 seconds!");
                    
                    return {
                      ...prev,
                      birdX: newBirdX,
                      birdY: newBirdY,
                      bodySegments: newBodySegments,
                      birdDirection: { x: newDirectionX, y: newDirectionY },
                      pipes: newPipes,
                      coins: newCoins,
                      gameOver: newGameOver,
                      inSpecialWorld: newInSpecialWorld,
                      worldCoins: newWorldCoins,
                      colorTheme: newColorTheme,
                      portalTimer: 10,
                      portalExit: generatePortalExit(),
                      enteredPortal: enteredPortal,
                      usedPortalIds: newUsedPortalIds
                    };
                  }
                } else if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + pipe.gap) {
                  newGameOver = true;
                  toast.error(`Game Over! Total Coins: ${newCoins}`);
                }
              } else {
                // Regular pipe collision
                if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + pipe.gap) {
                  newGameOver = true;
                  toast.error(`Game Over! Total Coins: ${newCoins}`);
                }
              }
            }

            // Check if bird passed the pipe
            if (!pipe.passed && birdLeft > pipeRight) {
              pipe.passed = true;
              newCoins += pipe.isSpecial ? 3 : 1;
              
              if (pipe.isSpecial) {
                toast.success(`⭐ Portal Passed! +3 Coins!`);
              } else {
                toast.success(`Pipe Passed! +1 Coin`);
              }
            }
          });
        } else {
          // Special world - handle timer, frog collection, and exit
          let newPortalTimer = prev.portalTimer;
          let newPortalExit = prev.portalExit;
          
          // Initialize portal exit on first entry
          if (!newPortalExit) {
            newPortalExit = generatePortalExit();
          }
          
          // Countdown timer
          newPortalTimer -= 16 / 1000; // 16ms per frame
          
          if (newPortalTimer <= 0) {
            // Timer expired - game over
            newGameOver = true;
            toast.error("Time's up! Game Over!");
            return {
              ...prev,
              gameOver: newGameOver,
              portalTimer: 0
            };
          }
          
          // Check frog collection
          let newFrogsEaten = prev.frogsEaten;
          let newIsEating = false;
          newWorldCoins = newWorldCoins.map(frog => {
            if (!frog.collected) {
              const distance = Math.sqrt(
                Math.pow(newBirdX - frog.x, 2) + Math.pow(newBirdY - frog.y, 2)
              );
              
              if (distance < 25) {
                newCoins += 2;
                newFrogsEaten += 1;
                newIsEating = true;
                toast.success("🐸 Frog collected! +2 Coins! Snake grows!");
                return { ...frog, collected: true };
              }
            }
            return frog;
          });
          
          // Reset eating animation after a short delay
          if (newIsEating) {
            setTimeout(() => {
              setGameState(current => ({ ...current, isEating: false }));
            }, 300);
          }

          // Check exit collision
          if (newPortalExit) {
            const exitDistance = Math.sqrt(
              Math.pow(newBirdX - newPortalExit.x, 2) + Math.pow(newBirdY - newPortalExit.y, 2)
            );
            
            if (exitDistance < 30) {
              // Successfully exited portal - position snake at the CENTER of the portal and REMOVE the portal
              let returnX = 200; // Default position
              let returnY = 250; // Default position
              
              if (prev.enteredPortal) {
                // Position snake at the CENTER of the portal they entered
                returnX = prev.enteredPortal.x + PIPE_WIDTH / 2 - BIRD_SIZE / 2;
                returnY = prev.enteredPortal.topHeight + prev.enteredPortal.gap / 2 - BIRD_SIZE / 2;
                
                // Make sure snake is within game bounds
                returnX = Math.max(0, Math.min(370, returnX));
                returnY = Math.max(0, Math.min(470, returnY));
                
                // Don't remove portal immediately, just mark as used
                // Portal is already marked as used, so it won't be re-enterable
              }
              
              newInSpecialWorld = false;
              newWorldCoins = [];
              newPortalTimer = 10;
              newPortalExit = null;
              newBirdX = returnX;
              newBirdY = returnY;
              toast.success("Portal vanished! Continue your journey!");
              
              return {
                ...prev,
                birdX: newBirdX,
                birdY: newBirdY,
                bodySegments: newBodySegments,
                birdDirection: { x: newDirectionX, y: newDirectionY },
                pipes: newPipes,
                coins: newCoins,
                gameOver: newGameOver,
                inSpecialWorld: newInSpecialWorld,
                worldCoins: newWorldCoins,
                colorTheme: newColorTheme,
                portalTimer: newPortalTimer,
                portalExit: newPortalExit,
                enteredPortal: null,
                frogsEaten: newFrogsEaten,
                isEating: newIsEating,
                usedPortalIds: newUsedPortalIds
              };
            }
          }
          
          return {
            ...prev,
            birdX: newBirdX,
            birdY: newBirdY,
            bodySegments: newBodySegments,
            birdDirection: { x: newDirectionX, y: newDirectionY },
            pipes: newPipes,
            coins: newCoins,
            gameOver: newGameOver,
            inSpecialWorld: newInSpecialWorld,
            worldCoins: newWorldCoins,
            colorTheme: newColorTheme,
            portalTimer: newPortalTimer,
            portalExit: newPortalExit,
            frogsEaten: newFrogsEaten,
            isEating: newIsEating,
            usedPortalIds: newUsedPortalIds
          };
        }

        return {
          ...prev,
          birdX: newBirdX,
          birdY: newBirdY,
          bodySegments: newBodySegments,
          birdDirection: { x: newDirectionX, y: newDirectionY },
          pipes: newPipes,
          coins: newCoins,
          gameOver: newGameOver,
          inSpecialWorld: newInSpecialWorld,
          worldCoins: newWorldCoins,
          colorTheme: newColorTheme,
          portalTimer: prev.portalTimer,
          portalExit: prev.portalExit,
          enteredPortal: prev.enteredPortal,
          frogsEaten: prev.frogsEaten,
          isEating: prev.isEating,
          usedPortalIds: newUsedPortalIds
        };
      });
    }, 12); // Increased FPS for more responsive controls (~83 FPS)

    return () => clearInterval(gameLoop);
  }, [gameState.gameStarted, gameState.gameOver, pressedKeys]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">🐍 Snake Bird Adventure</h1>
        <div className="flex justify-center gap-4 mb-4">
          <div className="bg-card px-3 py-1 rounded-lg border">
            <span className="text-sm text-muted-foreground">Coins:</span>
            <span className="ml-1 font-bold text-yellow-500">🪙 {gameState.coins}</span>
          </div>
          {gameState.inSpecialWorld && (
            <div className="bg-purple-500/20 px-3 py-1 rounded-lg border border-purple-500">
              <span className="text-purple-400 font-bold">✨ Portal World</span>
              <span className="ml-2 text-red-400 font-bold">⏰ {Math.ceil(gameState.portalTimer)}s</span>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={gameRef}
        className={`relative w-[400px] h-[500px] border-2 border-border rounded-lg overflow-hidden select-none transition-all duration-1000 ${
          gameState.inSpecialWorld 
            ? 'bg-gradient-to-b from-purple-600 via-pink-500 to-cyan-600' 
            : gameState.colorTheme % 5 === 0 ? 'bg-gradient-to-b from-blue-400 to-blue-600' :
              gameState.colorTheme % 5 === 1 ? 'bg-gradient-to-b from-orange-400 to-red-500' :
              gameState.colorTheme % 5 === 2 ? 'bg-gradient-to-b from-green-400 to-emerald-600' :
              gameState.colorTheme % 5 === 3 ? 'bg-gradient-to-b from-purple-400 to-indigo-600' :
              'bg-gradient-to-b from-pink-400 to-rose-600'
        }`}
      >
        {/* Enhanced Snake with Body Segments */}
        {/* Snake Head */}
        <div
          className={`absolute transition-all duration-100 ${
            gameState.inSpecialWorld ? 'animate-pulse' : ''
          } ${gameState.isEating ? 'animate-bounce' : ''}`}
          style={{
            left: `${gameState.birdX}px`,
            top: `${gameState.birdY}px`,
            width: `${Math.min(50, 30 + gameState.frogsEaten * 3)}px`,
            height: `${Math.min(40, 25 + gameState.frogsEaten * 2)}px`,
            transform: `rotate(${gameState.birdDirection.x > 0 ? '15deg' : 
              gameState.birdDirection.x < 0 ? '-15deg' : 
              gameState.birdDirection.y > 0 ? '90deg' : 
              gameState.birdDirection.y < 0 ? '-90deg' : '0deg'})`,
            zIndex: 100
          }}
        >
          {/* Snake Head */}
          <div className={`w-full h-full rounded-full border-3 shadow-xl relative overflow-hidden ${
            gameState.frogsEaten >= 10 ? 'border-gold-400 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600' :
            gameState.frogsEaten >= 5 ? 'border-purple-400 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500' :
            gameState.inSpecialWorld ? 'border-cyan-400 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600' : 
            'border-white bg-gradient-to-br from-green-500 via-emerald-600 to-green-700'
          }`}>
            
            {/* Fancy Pattern Overlay */}
            {gameState.frogsEaten >= 3 && (
              <>
                <div className={`absolute inset-1 rounded-full ${
                  gameState.frogsEaten >= 10 ? 'bg-gradient-to-br from-gold-300/30 to-amber-500/30' :
                  gameState.frogsEaten >= 5 ? 'bg-gradient-to-br from-purple-300/30 to-pink-500/30' :
                  'bg-gradient-to-br from-cyan-300/30 to-emerald-500/30'
                } animate-pulse`}></div>
                {/* Diamond pattern for advanced snakes */}
                <div className={`absolute w-2 h-2 top-1 left-1/2 transform -translate-x-1/2 rotate-45 ${
                  gameState.frogsEaten >= 10 ? 'bg-gold-300' :
                  gameState.frogsEaten >= 5 ? 'bg-purple-300' : 'bg-cyan-300'
                }`}></div>
              </>
            )}
            
            {/* Enhanced Snake Pattern */}
            <div className={`absolute w-2.5 h-2.5 rounded-full top-1 left-2 ${
              gameState.frogsEaten >= 10 ? 'bg-amber-300' :
              gameState.frogsEaten >= 5 ? 'bg-purple-300' :
              gameState.inSpecialWorld ? 'bg-emerald-300' : 'bg-green-400'
            }`}></div>
            <div className={`absolute w-2 h-2 rounded-full top-3 left-1 ${
              gameState.frogsEaten >= 10 ? 'bg-orange-300' :
              gameState.frogsEaten >= 5 ? 'bg-pink-300' :
              gameState.inSpecialWorld ? 'bg-teal-300' : 'bg-green-400'
            }`}></div>
            
            {/* Enhanced Snake Eyes */}
            <div className={`absolute w-3 h-3 rounded-full top-1.5 right-2 border-2 border-black ${
              gameState.frogsEaten >= 10 ? 'bg-gold-200' :
              gameState.frogsEaten >= 5 ? 'bg-purple-200' :
              'bg-yellow-400'
            }`}>
              <div className={`absolute w-2 h-2 rounded-full top-0.5 left-0.5 ${
                gameState.isEating ? 'bg-red-600' : 'bg-black'
              }`}></div>
            </div>
            <div className={`absolute w-3 h-3 rounded-full top-1.5 right-0.5 border-2 border-black ${
              gameState.frogsEaten >= 10 ? 'bg-gold-200' :
              gameState.frogsEaten >= 5 ? 'bg-purple-200' :
              'bg-yellow-400'
            }`}>
              <div className={`absolute w-2 h-2 rounded-full top-0.5 left-0.5 ${
                gameState.isEating ? 'bg-red-600' : 'bg-black'
              }`}></div>
            </div>
            
            {/* Enhanced Mouth - Opens when eating */}
            <div className={`absolute right-0 rounded-r-full transition-all duration-200 ${
              gameState.isEating ? 'w-4 h-3 top-2 bg-red-600 border-2 border-red-800' : 
              'w-3 h-1 top-3 bg-green-800'
            }`}>
              {/* Teeth when eating */}
              {gameState.isEating && (
                <>
                  <div className="absolute w-1 h-1 bg-white top-0 left-1"></div>
                  <div className="absolute w-1 h-1 bg-white bottom-0 left-1"></div>
                  <div className="absolute w-1 h-1 bg-white top-0 right-1"></div>
                  <div className="absolute w-1 h-1 bg-white bottom-0 right-1"></div>
                </>
              )}
            </div>
            
            {/* Forked Tongue - Enhanced */}
            <div className={`absolute bg-red-500 right-0 rounded-r-full transition-all duration-200 ${
              gameState.isEating ? 'w-2 h-0.5 top-2.5' : 'w-3 h-0.5 top-3'
            }`}></div>
            <div className={`absolute bg-red-500 right-0 rounded-r-full transition-all duration-200 ${
              gameState.isEating ? 'w-1 h-0.5 top-2' : 'w-1 h-0.5 top-2.5'
            }`}></div>
            
            {/* Snake Body Trail - Grows with frogs eaten */}
            <div className={`absolute left-0 rounded-l-full ${
              gameState.frogsEaten >= 10 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
              gameState.frogsEaten >= 5 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
              gameState.inSpecialWorld ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-green-500'
            }`}
            style={{
              width: `${Math.min(8, 3 + gameState.frogsEaten * 0.5)}px`,
              height: `${Math.min(12, 4 + gameState.frogsEaten * 0.8)}px`,
              top: `${Math.max(3, 8 - gameState.frogsEaten * 0.3)}px`
            }}></div>
            
            {/* Crown for legendary snakes */}
            {gameState.frogsEaten >= 10 && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-yellow-400 text-xs animate-bounce">
                👑
              </div>
            )}
          </div>
        </div>

        {/* Frogs (only in special world) */}
        {gameState.inSpecialWorld && gameState.worldCoins.map((frog) => (
          !frog.collected && (
            <div
              key={frog.id}
              className="absolute w-10 h-8 animate-bounce shadow-lg"
              style={{
                left: `${frog.x}px`,
                top: `${frog.y}px`,
                animation: 'bounce 2s ease-in-out infinite'
              }}
            >
              {/* Frog body (oval shape) */}
              <div className="absolute w-8 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-2 border-green-300 left-1 top-1"></div>
              
              {/* Frog head (slightly overlapping body) */}
              <div className="absolute w-6 h-5 bg-gradient-to-br from-green-300 to-green-500 rounded-full border border-green-400 left-2 top-0"></div>
              
              {/* Large protruding eyes on top of head */}
              <div className="absolute w-2.5 h-2.5 bg-yellow-400 rounded-full top-0 left-1.5 border border-black z-10">
                <div className="absolute w-1.5 h-1.5 bg-black rounded-full top-0.5 left-0.5"></div>
              </div>
              <div className="absolute w-2.5 h-2.5 bg-yellow-400 rounded-full top-0 right-1.5 border border-black z-10">
                <div className="absolute w-1.5 h-1.5 bg-black rounded-full top-0.5 left-0.5"></div>
              </div>
              
              {/* Frog mouth */}
              <div className="absolute w-3 h-1 bg-green-600 rounded-full left-1/2 top-3 transform -translate-x-1/2"></div>
              
              {/* Front legs/arms */}
              <div className="absolute w-2 h-3 bg-green-500 rounded-full left-0 top-2"></div>
              <div className="absolute w-2 h-3 bg-green-500 rounded-full right-0 top-2"></div>
              
              {/* Back legs (visible from side) */}
              <div className="absolute w-1.5 h-4 bg-green-600 rounded-full left-0.5 bottom-0"></div>
              <div className="absolute w-1.5 h-4 bg-green-600 rounded-full right-0.5 bottom-0"></div>
            </div>
          )
        ))}

        {/* Portal Exit (only in special world) */}
        {gameState.inSpecialWorld && gameState.portalExit && (
          <div
            className="absolute w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full border-4 border-yellow-400 animate-pulse shadow-xl"
            style={{
              left: `${gameState.portalExit.x}px`,
              top: `${gameState.portalExit.y}px`,
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          >
            <div className="absolute inset-2 bg-gradient-to-br from-cyan-200 to-blue-300 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-white">
              🚪
            </div>
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-yellow-400 animate-bounce">
              EXIT
            </div>
          </div>
        )}
        
        {/* Snake Body Segments */}
        {gameState.bodySegments.map((segment, index) => (
          <div
            key={segment.id}
            className={`absolute transition-all duration-150 rounded-full border-2 shadow-lg ${
              gameState.frogsEaten >= 10 ? 'border-amber-400 bg-gradient-to-br from-amber-500 to-orange-500' :
              gameState.frogsEaten >= 5 ? 'border-purple-400 bg-gradient-to-br from-purple-500 to-pink-500' :
              gameState.inSpecialWorld ? 'border-emerald-400 bg-gradient-to-br from-emerald-500 to-teal-500' : 
              'border-green-400 bg-gradient-to-br from-green-500 to-green-600'
            }`}
            style={{
              left: `${segment.x}px`,
              top: `${segment.y}px`,
              width: `${Math.max(15, 25 - index * 1.5)}px`,
              height: `${Math.max(12, 20 - index * 1.2)}px`,
              zIndex: 90 - index // Ensure proper layering
            }}
          >
            {/* Body segment pattern */}
            <div className={`absolute inset-1 rounded-full ${
              gameState.frogsEaten >= 10 ? 'bg-gradient-to-br from-gold-400/40 to-amber-600/40' :
              gameState.frogsEaten >= 5 ? 'bg-gradient-to-br from-purple-400/40 to-pink-600/40' :
              gameState.inSpecialWorld ? 'bg-gradient-to-br from-emerald-400/40 to-teal-600/40' : 
              'bg-gradient-to-br from-green-400/40 to-green-700/40'
            }`}></div>
          </div>
        ))}
        
        {/* Pipes (only in normal world) */}
        {!gameState.inSpecialWorld && gameState.pipes.map((pipe, index) => (
          <div key={index}>
            {/* Top pipe */}
            <div
              className={`absolute border-2 border-foreground rounded-b-lg shadow-lg ${
                pipe.isSpecial 
                  ? 'bg-gradient-to-b from-purple-500 to-purple-700 border-purple-300 shadow-purple-500/50' 
                  : 'bg-gradient-to-b from-green-600 to-green-800'
              }`}
              style={{
                left: `${pipe.x}px`,
                top: '0px',
                width: `${PIPE_WIDTH}px`,
                height: `${pipe.topHeight}px`
              }}
            >
              {/* Pipe ridges for realism */}
              <div className="absolute w-full h-1 bg-black/20 top-2"></div>
              <div className="absolute w-full h-1 bg-black/20 bottom-4"></div>
              
              {pipe.isSpecial && (
                <>
                  {/* Special pipe portal effect */}
                  <div className="absolute inset-2 bg-gradient-to-b from-cyan-400/30 to-purple-400/30 rounded animate-pulse"></div>
                  <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                </>
              )}
            </div>
            
            {/* Portal opening indicator */}
            {pipe.isSpecial && (
              <div
                className="absolute bg-gradient-to-r from-cyan-400 to-purple-400 border-2 border-yellow-400 rounded animate-pulse"
                style={{
                  left: `${pipe.x - 5}px`,
                  top: `${pipe.topHeight + pipe.gap * 0.3}px`,
                  width: `${PIPE_WIDTH + 10}px`,
                  height: `${pipe.gap * 0.4}px`,
                  zIndex: 10
                }}
              >
                <div className="absolute inset-1 bg-gradient-to-r from-cyan-200/50 to-purple-200/50 rounded animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white">
                  🌀PORTAL🌀
                </div>
              </div>
            )}
            
            {/* Bottom pipe */}
            <div
              className={`absolute border-2 border-foreground rounded-t-lg shadow-lg ${
                pipe.isSpecial 
                  ? 'bg-gradient-to-t from-purple-500 to-purple-700 border-purple-300 shadow-purple-500/50' 
                  : 'bg-gradient-to-t from-green-600 to-green-800'
              }`}
              style={{
                left: `${pipe.x}px`,
                top: `${pipe.topHeight + pipe.gap}px`,
                width: `${PIPE_WIDTH}px`,
                height: `${500 - (pipe.topHeight + pipe.gap)}px`
              }}
            >
              {/* Pipe ridges for realism */}
              <div className="absolute w-full h-1 bg-black/20 top-4"></div>
              <div className="absolute w-full h-1 bg-black/20 bottom-2"></div>
              
              {pipe.isSpecial && (
                <>
                  {/* Special pipe portal effect */}
                  <div className="absolute inset-2 bg-gradient-to-t from-cyan-400/30 to-purple-400/30 rounded animate-pulse"></div>
                  <div className="absolute bottom-1 left-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-12 bg-gradient-to-b from-green-700 to-green-900 border-t-2 border-foreground" />

        {/* Game Over Overlay */}
        {gameState.gameOver && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center bg-card p-6 rounded-lg border shadow-lg">
              <h2 className="text-2xl font-bold mb-2 text-destructive">Game Over!</h2>
              <div className="mb-4 space-y-2">
                <p>Total Coins: <span className="font-bold text-yellow-500">🪙 {gameState.coins}</span></p>
                {gameState.coins >= 50 && <p className="text-green-500 font-bold">🎉 Coin Master!</p>}
                {gameState.coins >= 100 && <p className="text-purple-500 font-bold">👑 Portal Champion!</p>}
              </div>
              <Button onClick={resetGame} className="w-full">
                Play Again
              </Button>
            </div>
          </div>
        )}

        {/* Start Screen */}
        {!gameState.gameStarted && !gameState.gameOver && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center bg-card p-6 rounded-lg border shadow-lg">
              <h2 className="text-2xl font-bold mb-2">Ready to Snake Adventure?</h2>
              <p className="mb-4">Use WASD keys to control the snake!</p>
              <div className="grid grid-cols-3 gap-1 w-fit mx-auto mb-4">
                <div></div>
                <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">W</div>
                <div></div>
                <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">A</div>
                <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">S</div>
                <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">D</div>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full mx-auto animate-float border-2 border-white"></div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-md">
        <p>Use <strong>WASD</strong> keys to control the snake!</p>
        <p>Fly through <strong>purple portals</strong> to enter special worlds and collect frogs!</p>
        <p className="text-yellow-600 font-medium">Find the exit within 10 seconds or game over!</p>
      </div>

      {gameState.gameStarted && !gameState.gameOver && (
        <Button variant="outline" onClick={resetGame}>
          Reset Game
        </Button>
      )}
    </div>
  );
};