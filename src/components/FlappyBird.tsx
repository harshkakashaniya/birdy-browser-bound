import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GameState {
  birdY: number;
  birdVelocity: number;
  pipes: Array<{ x: number; topHeight: number; passed: boolean; isSpecial?: boolean; gap: number }>;
  score: number;
  coins: number;
  gameStarted: boolean;
  gameOver: boolean;
  inSpecialWorld: boolean;
  colorTheme: number;
}

const BIRD_SIZE = 30;
const PIPE_WIDTH = 60;
const INITIAL_PIPE_GAP = 250; // Start with wide gap
const MIN_PIPE_GAP = 120; // Minimum gap
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 2;
const SPECIAL_PIPE_CHANCE = 0.15; // 15% chance for special pipes

export const FlappyBird = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    birdY: 250,
    birdVelocity: 0,
    pipes: [],
    score: 0,
    coins: 0,
    gameStarted: false,
    gameOver: false,
    inSpecialWorld: false,
    colorTheme: 0,
  });

  const jump = useCallback(() => {
    if (gameState.gameOver) return;
    
    setGameState(prev => ({
      ...prev,
      birdVelocity: JUMP_STRENGTH,
      gameStarted: true
    }));
  }, [gameState.gameOver]);

  const resetGame = () => {
    setGameState({
      birdY: 250,
      birdVelocity: 0,
      pipes: [],
      score: 0,
      coins: 0,
      gameStarted: false,
      gameOver: false,
      inSpecialWorld: false,
      colorTheme: 0,
    });
    toast("Game Reset! Press SPACE or click to start!");
  };

  // Calculate dynamic pipe gap based on score
  const getCurrentPipeGap = (score: number) => {
    const reduction = Math.floor(score / 5) * 10; // Reduce gap every 5 points
    return Math.max(MIN_PIPE_GAP, INITIAL_PIPE_GAP - reduction);
  };

  // Calculate color theme based on score
  const getCurrentTheme = (score: number) => {
    return Math.floor(score / 10);
  };

  // Game loop
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const gameLoop = setInterval(() => {
      setGameState(prev => {
        let newBirdY = prev.birdY + prev.birdVelocity;
        let newBirdVelocity = prev.birdVelocity + GRAVITY;
        let newPipes = [...prev.pipes];
        let newScore = prev.score;
        let newGameOver = prev.gameOver;

        // Check ground and ceiling collision
        if (newBirdY > 450 || newBirdY < 0) {
          newGameOver = true;
          toast.error(`Game Over! Final Score: ${prev.score}`);
        }

        // Move pipes and check collisions
        newPipes = newPipes.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }));
        
        // Remove off-screen pipes
        newPipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

        // Add new pipes
        if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < 200) {
          const currentGap = getCurrentPipeGap(prev.score);
          const isSpecial = Math.random() < SPECIAL_PIPE_CHANCE;
          const topHeight = Math.random() * 200 + 50;
          
          newPipes.push({
            x: 400,
            topHeight,
            passed: false,
            isSpecial,
            gap: currentGap
          });
        }

        let newCoins = prev.coins;
        let newInSpecialWorld = prev.inSpecialWorld;
        let newColorTheme = getCurrentTheme(newScore);

        // Check pipe collisions and scoring
        newPipes.forEach(pipe => {
          const birdLeft = 50;
          const birdRight = birdLeft + BIRD_SIZE;
          const birdTop = newBirdY;
          const birdBottom = birdTop + BIRD_SIZE;

          const pipeLeft = pipe.x;
          const pipeRight = pipe.x + PIPE_WIDTH;

          // Check if bird is within pipe x range
          if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (pipe.isSpecial) {
              // Special pipe - check if bird goes through the opening
              const specialOpeningTop = pipe.topHeight + pipe.gap * 0.3;
              const specialOpeningBottom = pipe.topHeight + pipe.gap * 0.7;
              
              if (birdTop >= specialOpeningTop && birdBottom <= specialOpeningBottom) {
                // Bird entered special world!
                if (!newInSpecialWorld) {
                  newInSpecialWorld = true;
                  newCoins += 10;
                  toast.success("🌟 Entered Special World! +10 Coins!");
                }
              } else if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + pipe.gap) {
                newGameOver = true;
                toast.error(`Game Over! Final Score: ${prev.score}, Coins: ${newCoins}`);
              }
            } else {
              // Regular pipe collision
              if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + pipe.gap) {
                newGameOver = true;
                toast.error(`Game Over! Final Score: ${prev.score}, Coins: ${newCoins}`);
              }
            }
          }

          // Check if bird passed the pipe
          if (!pipe.passed && birdLeft > pipeRight) {
            pipe.passed = true;
            newScore++;
            newCoins += pipe.isSpecial ? 5 : 1;
            
            if (pipe.isSpecial) {
              toast.success(`⭐ Special Pipe! +5 Coins! Score: ${newScore}`);
            } else {
              toast.success(`Score: ${newScore}, Coins: ${newCoins}`);
            }
          }
        });

        // Exit special world after some time
        if (newInSpecialWorld && Math.random() < 0.02) {
          newInSpecialWorld = false;
          toast("Back to normal world!");
        }

        return {
          ...prev,
          birdY: newBirdY,
          birdVelocity: newBirdVelocity,
          pipes: newPipes,
          score: newScore,
          coins: newCoins,
          gameOver: newGameOver,
          inSpecialWorld: newInSpecialWorld,
          colorTheme: newColorTheme
        };
      });
    }, 16); // ~60 FPS

    return () => clearInterval(gameLoop);
  }, [gameState.gameStarted, gameState.gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">🐦 Flappy Bird Adventure</h1>
        <div className="flex justify-center gap-4 mb-4">
          <div className="bg-card px-3 py-1 rounded-lg border">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className="ml-1 font-bold">{gameState.score}</span>
          </div>
          <div className="bg-card px-3 py-1 rounded-lg border">
            <span className="text-sm text-muted-foreground">Coins:</span>
            <span className="ml-1 font-bold text-yellow-500">🪙 {gameState.coins}</span>
          </div>
          {gameState.inSpecialWorld && (
            <div className="bg-purple-500/20 px-3 py-1 rounded-lg border border-purple-500">
              <span className="text-purple-400 font-bold">✨ Special World</span>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={gameRef}
        className={`relative w-[400px] h-[500px] border-2 border-border rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-1000 ${
          gameState.inSpecialWorld 
            ? 'bg-gradient-to-b from-purple-600 to-pink-600' 
            : gameState.colorTheme % 5 === 0 ? 'bg-gradient-to-b from-blue-400 to-blue-600' :
              gameState.colorTheme % 5 === 1 ? 'bg-gradient-to-b from-orange-400 to-red-500' :
              gameState.colorTheme % 5 === 2 ? 'bg-gradient-to-b from-green-400 to-emerald-600' :
              gameState.colorTheme % 5 === 3 ? 'bg-gradient-to-b from-purple-400 to-indigo-600' :
              'bg-gradient-to-b from-pink-400 to-rose-600'
        }`}
        onClick={jump}
      >
        {/* Cute Bird */}
        <div
          className={`absolute w-[35px] h-[30px] transition-transform duration-100 ${
            gameState.birdVelocity < 0 ? 'animate-bounce-bird' : ''
          } ${gameState.inSpecialWorld ? 'animate-pulse' : ''}`}
          style={{
            left: '50px',
            top: `${gameState.birdY}px`,
            transform: `rotate(${Math.min(Math.max(gameState.birdVelocity * 3, -30), 30)}deg)`
          }}
        >
          {/* Bird Body */}
          <div className={`w-full h-full rounded-full border-2 border-white shadow-lg ${
            gameState.inSpecialWorld ? 'bg-gradient-to-br from-purple-400 to-pink-400' : 
            'bg-gradient-to-br from-orange-400 to-yellow-400'
          }`}>
            {/* Wing */}
            <div className={`absolute w-3 h-4 rounded-full top-1 left-1 ${
              gameState.inSpecialWorld ? 'bg-purple-300' : 'bg-orange-300'
            }`}></div>
            
            {/* Eyes */}
            <div className="absolute w-3 h-3 bg-white rounded-full top-1 right-1 border border-gray-300">
              <div className="absolute w-2 h-2 bg-black rounded-full top-0.5 left-0.5"></div>
              <div className="absolute w-0.5 h-0.5 bg-white rounded-full top-0.5 right-0.5"></div>
            </div>
            
            {/* Beak */}
            <div className="absolute w-2 h-1 bg-orange-500 right-0 top-2 rounded-r-full"></div>
            
            {/* Tail feathers */}
            <div className={`absolute w-2 h-3 left-0 top-2 rounded-l-full ${
              gameState.inSpecialWorld ? 'bg-purple-300' : 'bg-yellow-300'
            }`}></div>
          </div>
        </div>

        {/* Pipes */}
        {gameState.pipes.map((pipe, index) => (
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
            
            {/* Special opening indicator */}
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
                  ✨🌟✨
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
        <div className="absolute bottom-0 w-full h-12 bg-gradient-to-b from-game-ground to-game-ground/80 border-t-2 border-foreground" />

        {/* Game Over Overlay */}
        {gameState.gameOver && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center bg-card p-6 rounded-lg border shadow-lg">
              <h2 className="text-2xl font-bold mb-2 text-destructive">Game Over!</h2>
              <div className="mb-4 space-y-2">
                <p>Final Score: <span className="font-bold">{gameState.score}</span></p>
                <p>Total Coins: <span className="font-bold text-yellow-500">🪙 {gameState.coins}</span></p>
                {gameState.coins >= 50 && <p className="text-green-500 font-bold">🎉 Coin Master!</p>}
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
              <h2 className="text-2xl font-bold mb-2">Ready to Fly?</h2>
              <p className="mb-4">Press SPACE or click to start!</p>
              <div className="w-8 h-8 bg-game-bird rounded-full mx-auto animate-float"></div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-md">
        <p>Use SPACE bar or click/tap to make the bird jump.</p>
        <p>Navigate through the pipes without hitting them!</p>
      </div>

      {gameState.gameStarted && !gameState.gameOver && (
        <Button variant="outline" onClick={resetGame}>
          Reset Game
        </Button>
      )}
    </div>
  );
};