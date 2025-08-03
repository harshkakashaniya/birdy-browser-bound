import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GameState {
  birdY: number;
  birdVelocity: number;
  pipes: Array<{ x: number; topHeight: number; passed: boolean }>;
  score: number;
  gameStarted: boolean;
  gameOver: boolean;
}

const BIRD_SIZE = 30;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 2;

export const FlappyBird = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    birdY: 250,
    birdVelocity: 0,
    pipes: [],
    score: 0,
    gameStarted: false,
    gameOver: false,
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
      gameStarted: false,
      gameOver: false,
    });
    toast("Game Reset! Press SPACE or click to start!");
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
          newPipes.push({
            x: 400,
            topHeight: Math.random() * 200 + 50,
            passed: false
          });
        }

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
            // Check collision with top or bottom pipe
            if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP) {
              newGameOver = true;
              toast.error(`Game Over! Final Score: ${prev.score}`);
            }
          }

          // Check if bird passed the pipe
          if (!pipe.passed && birdLeft > pipeRight) {
            pipe.passed = true;
            newScore++;
            toast.success(`Score: ${newScore}`);
          }
        });

        return {
          ...prev,
          birdY: newBirdY,
          birdVelocity: newBirdVelocity,
          pipes: newPipes,
          score: newScore,
          gameOver: newGameOver
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
        <h1 className="text-4xl font-bold mb-2">Flappy Bird</h1>
        <p className="text-muted-foreground mb-4">
          Press SPACE or click to jump! Score: {gameState.score}
        </p>
      </div>

      <div 
        ref={gameRef}
        className="relative w-[400px] h-[500px] bg-gradient-to-b from-game-sky to-game-sky/70 border-2 border-border rounded-lg overflow-hidden cursor-pointer select-none"
        onClick={jump}
      >
        {/* Bird */}
        <div
          className={`absolute w-[30px] h-[30px] bg-game-bird rounded-full border-2 border-foreground transition-transform duration-100 ${
            gameState.birdVelocity < 0 ? 'animate-bounce-bird' : ''
          }`}
          style={{
            left: '50px',
            top: `${gameState.birdY}px`,
            transform: `rotate(${Math.min(Math.max(gameState.birdVelocity * 3, -30), 30)}deg)`
          }}
        >
          {/* Bird eye */}
          <div className="absolute w-2 h-2 bg-foreground rounded-full top-1 right-1"></div>
        </div>

        {/* Pipes */}
        {gameState.pipes.map((pipe, index) => (
          <div key={index}>
            {/* Top pipe */}
            <div
              className="absolute bg-game-pipe border-2 border-foreground"
              style={{
                left: `${pipe.x}px`,
                top: '0px',
                width: `${PIPE_WIDTH}px`,
                height: `${pipe.topHeight}px`
              }}
            />
            {/* Bottom pipe */}
            <div
              className="absolute bg-game-pipe border-2 border-foreground"
              style={{
                left: `${pipe.x}px`,
                top: `${pipe.topHeight + PIPE_GAP}px`,
                width: `${PIPE_WIDTH}px`,
                height: `${500 - (pipe.topHeight + PIPE_GAP)}px`
              }}
            />
          </div>
        ))}

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-12 bg-gradient-to-b from-game-ground to-game-ground/80 border-t-2 border-foreground" />

        {/* Game Over Overlay */}
        {gameState.gameOver && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center bg-card p-6 rounded-lg border shadow-lg">
              <h2 className="text-2xl font-bold mb-2 text-destructive">Game Over!</h2>
              <p className="mb-4">Final Score: {gameState.score}</p>
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