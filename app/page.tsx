"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Direction = "up" | "down" | "left" | "right";
type Point = { x: number; y: number };
type GameStatus = "ready" | "playing" | "paused" | "game-over";

const boardSize = 20;
const startingSnake: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const startingFood: Point = { x: 14, y: 10 };
const oppositeDirection: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function pointsMatch(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function randomFood(snake: Point[]) {
  const openCells: Point[] = [];

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      const point = { x, y };
      if (!snake.some((segment) => pointsMatch(segment, point))) {
        openCells.push(point);
      }
    }
  }

  return (
    openCells[Math.floor(Math.random() * openCells.length)] ?? startingFood
  );
}

function getNextHead(head: Point, direction: Direction) {
  if (direction === "up") return { x: head.x, y: head.y - 1 };
  if (direction === "down") return { x: head.x, y: head.y + 1 };
  if (direction === "left") return { x: head.x - 1, y: head.y };
  return { x: head.x + 1, y: head.y };
}

export default function Home() {
  const [snake, setSnake] = useState<Point[]>(startingSnake);
  const [food, setFood] = useState<Point>(startingFood);
  const [direction, setDirection] = useState<Direction>("right");
  const [nextDirection, setNextDirection] = useState<Direction>("right");
  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const directionRef = useRef<Direction>("right");

  const resetGame = useCallback(() => {
    setSnake(startingSnake);
    setFood(startingFood);
    setDirection("right");
    setNextDirection("right");
    directionRef.current = "right";
    setScore(0);
    setStatus("playing");
  }, []);

  const changeDirection = useCallback(
    (newDirection: Direction) => {
      if (oppositeDirection[directionRef.current] === newDirection) return;

      setNextDirection(newDirection);
      directionRef.current = newDirection;

      if (status === "ready") {
        setStatus("playing");
      }
    },
    [status],
  );

  useEffect(() => {
    const storedBestScore = window.localStorage.getItem("snake-best-score");
    if (storedBestScore) {
      setBestScore(Number(storedBestScore));
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const keyMap: Record<string, Direction | undefined> = {
        ArrowUp: "up",
        w: "up",
        W: "up",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
      };

      const requestedDirection = keyMap[event.key];
      if (requestedDirection) {
        event.preventDefault();
        changeDirection(requestedDirection);
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setStatus((currentStatus) => {
          if (currentStatus === "playing") return "paused";
          if (currentStatus === "paused" || currentStatus === "ready")
            return "playing";
          return currentStatus;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection]);

  useEffect(() => {
    if (status !== "playing") return;

    const timer = window.setInterval(
      () => {
        setSnake((currentSnake) => {
          const currentDirection = nextDirection;
          setDirection(currentDirection);
          const head = currentSnake[0];
          const nextHead = getNextHead(head, currentDirection);
          const hitWall =
            nextHead.x < 0 ||
            nextHead.x >= boardSize ||
            nextHead.y < 0 ||
            nextHead.y >= boardSize;
          const willEat = pointsMatch(nextHead, food);
          const bodyToCheck = willEat
            ? currentSnake
            : currentSnake.slice(0, -1);
          const hitSelf = bodyToCheck.some((segment) =>
            pointsMatch(segment, nextHead),
          );

          if (hitWall || hitSelf) {
            setStatus("game-over");
            setBestScore((currentBestScore) => {
              const newBestScore = Math.max(currentBestScore, score);
              window.localStorage.setItem(
                "snake-best-score",
                String(newBestScore),
              );
              return newBestScore;
            });
            return currentSnake;
          }

          const nextSnake = [nextHead, ...currentSnake];

          if (willEat) {
            const newScore = score + 1;
            setScore(newScore);
            setFood(randomFood(nextSnake));
            return nextSnake;
          }

          nextSnake.pop();
          return nextSnake;
        });
      },
      Math.max(70, 160 - score * 4),
    );

    return () => window.clearInterval(timer);
  }, [food, nextDirection, score, status]);

  const cells = useMemo(() => {
    return Array.from({ length: boardSize * boardSize }, (_, index) => {
      const point = { x: index % boardSize, y: Math.floor(index / boardSize) };
      const snakeIndex = snake.findIndex((segment) =>
        pointsMatch(segment, point),
      );
      const isFood = pointsMatch(food, point);
      const className = [
        "cell",
        snakeIndex === 0 ? "snake-head" : "",
        snakeIndex > 0 ? "snake-body" : "",
        isFood ? "food" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return <div className={className} key={`${point.x}-${point.y}`} />;
    });
  }, [food, snake]);

  return (
    <main className="page">
      <section className="game-shell">
        <div className="hero-copy">
          <p className="eyebrow">Vercel Ready</p>
          <h1>Snake</h1>
          <p className="description">
            Eat the glowing apples, avoid the walls, and try to beat your high
            score.
          </p>
        </div>

        <div className="scoreboard" aria-label="Game stats">
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{bestScore}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{status.replace("-", " ")}</strong>
          </div>
        </div>

        <div className="board-wrap">
          <div className="board" aria-label="Snake game board" role="grid">
            {cells}
          </div>
          {status !== "playing" && (
            <div className="overlay">
              <strong>
                {status === "game-over"
                  ? "Game over"
                  : status === "paused"
                    ? "Paused"
                    : "Ready?"}
              </strong>
              <span>
                {status === "game-over"
                  ? "Press restart to try again."
                  : "Use arrow keys, WASD, or the controls below."}
              </span>
            </div>
          )}
        </div>

        <div className="controls" aria-label="Snake controls">
          <button
            type="button"
            onClick={() => changeDirection("up")}
            aria-label="Move up"
          >
            ↑
          </button>
          <div>
            <button
              type="button"
              onClick={() => changeDirection("left")}
              aria-label="Move left"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => changeDirection("down")}
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => changeDirection("right")}
              aria-label="Move right"
            >
              →
            </button>
          </div>
        </div>

        <div className="actions">
          <button type="button" onClick={resetGame}>
            {status === "game-over" ? "Restart game" : "New game"}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() =>
              setStatus((currentStatus) =>
                currentStatus === "playing" ? "paused" : "playing",
              )
            }
          >
            {status === "playing" ? "Pause" : "Play"}
          </button>
        </div>
      </section>
    </main>
  );
}
