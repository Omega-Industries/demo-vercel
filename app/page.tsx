"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type GameStatus = "ready" | "playing" | "paused" | "game-over";
type Cell = string | null;
type Board = Cell[][];
type TetrominoName = keyof typeof TETROMINOES;
type Piece = {
  name: TetrominoName;
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

const columns = 10;
const rows = 20;

const TETROMINOES = {
  I: {
    color: "cyan",
    shape: [[1, 1, 1, 1]],
  },
  J: {
    color: "blue",
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  L: {
    color: "orange",
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  O: {
    color: "yellow",
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  S: {
    color: "green",
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  T: {
    color: "purple",
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
  Z: {
    color: "red",
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
} as const;

const pieceNames = Object.keys(TETROMINOES) as TetrominoName[];

function createBoard(): Board {
  return Array.from({ length: rows }, () => Array<Cell>(columns).fill(null));
}

function createPiece(
  name = pieceNames[Math.floor(Math.random() * pieceNames.length)],
): Piece {
  const tetromino = TETROMINOES[name];
  return {
    name,
    shape: tetromino.shape.map((row) => [...row]),
    color: tetromino.color,
    x: Math.floor((columns - tetromino.shape[0].length) / 2),
    y: 0,
  };
}

function rotateShape(shape: number[][]) {
  return shape[0].map((_, index) => shape.map((row) => row[index]).reverse());
}

function hasCollision(
  board: Board,
  piece: Piece,
  nextX = piece.x,
  nextY = piece.y,
  nextShape = piece.shape,
) {
  return nextShape.some((row, y) =>
    row.some((cell, x) => {
      if (!cell) return false;

      const boardX = nextX + x;
      const boardY = nextY + y;

      if (boardX < 0 || boardX >= columns || boardY >= rows) return true;
      if (boardY < 0) return false;

      return Boolean(board[boardY][boardX]);
    }),
  );
}

function mergePiece(board: Board, piece: Piece): Board {
  const nextBoard = board.map((row) => [...row]);

  piece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell && piece.y + y >= 0) {
        nextBoard[piece.y + y][piece.x + x] = piece.color;
      }
    });
  });

  return nextBoard;
}

function clearCompletedLines(board: Board) {
  const remainingRows = board.filter((row) => row.some((cell) => !cell));
  const clearedLines = rows - remainingRows.length;
  const emptyRows = Array.from({ length: clearedLines }, () =>
    Array<Cell>(columns).fill(null),
  );

  return {
    board: [...emptyRows, ...remainingRows],
    clearedLines,
  };
}

function scoreForLines(clearedLines: number, level: number) {
  const lineScores = [0, 100, 300, 500, 800];
  return lineScores[clearedLines] * level;
}

function dropSpeed(level: number) {
  return Math.max(110, 820 - (level - 1) * 80);
}

export default function Home() {
  const [board, setBoard] = useState<Board>(() => createBoard());
  const [activePiece, setActivePiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece>(() => createPiece());
  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);

  const startGame = useCallback(() => {
    const firstPiece = createPiece();
    const upcomingPiece = createPiece();

    setBoard(createBoard());
    setActivePiece(firstPiece);
    setNextPiece(upcomingPiece);
    setScore(0);
    setLines(0);
    setLevel(1);
    setStatus("playing");
  }, []);

  const lockPiece = useCallback(
    (piece: Piece) => {
      const mergedBoard = mergePiece(board, piece);
      const result = clearCompletedLines(mergedBoard);
      const totalLines = lines + result.clearedLines;
      const nextLevel = Math.floor(totalLines / 10) + 1;
      const points = scoreForLines(result.clearedLines, level);
      const spawnedPiece = nextPiece;
      const upcomingPiece = createPiece();

      setBoard(result.board);
      setLines(totalLines);
      setLevel(nextLevel);
      setScore((currentScore) => currentScore + points);

      if (hasCollision(result.board, spawnedPiece)) {
        setStatus("game-over");
        setActivePiece(null);
        setBestScore((currentBestScore) => {
          const finalScore = Math.max(currentBestScore, score + points);
          window.localStorage.setItem("tetris-best-score", String(finalScore));
          return finalScore;
        });
        return;
      }

      setActivePiece(spawnedPiece);
      setNextPiece(upcomingPiece);
    },
    [board, level, lines, nextPiece, score],
  );

  const movePiece = useCallback(
    (direction: -1 | 1) => {
      if (status !== "playing" || !activePiece) return;
      const nextX = activePiece.x + direction;

      if (!hasCollision(board, activePiece, nextX)) {
        setActivePiece({ ...activePiece, x: nextX });
      }
    },
    [activePiece, board, status],
  );

  const rotatePiece = useCallback(() => {
    if (status !== "playing" || !activePiece) return;

    const rotatedShape = rotateShape(activePiece.shape);
    const wallKicks = [0, -1, 1, -2, 2];
    const safeKick = wallKicks.find(
      (kick) =>
        !hasCollision(
          board,
          activePiece,
          activePiece.x + kick,
          activePiece.y,
          rotatedShape,
        ),
    );

    if (safeKick !== undefined) {
      setActivePiece({
        ...activePiece,
        x: activePiece.x + safeKick,
        shape: rotatedShape,
      });
    }
  }, [activePiece, board, status]);

  const tick = useCallback(() => {
    if (status !== "playing" || !activePiece) return;

    const nextY = activePiece.y + 1;

    if (!hasCollision(board, activePiece, activePiece.x, nextY)) {
      setActivePiece({ ...activePiece, y: nextY });
      return;
    }

    lockPiece(activePiece);
  }, [activePiece, board, lockPiece, status]);

  const softDrop = useCallback(() => {
    if (status !== "playing" || !activePiece) return;

    const nextY = activePiece.y + 1;
    if (!hasCollision(board, activePiece, activePiece.x, nextY)) {
      setActivePiece({ ...activePiece, y: nextY });
      setScore((currentScore) => currentScore + 1);
      return;
    }

    lockPiece(activePiece);
  }, [activePiece, board, lockPiece, status]);

  const hardDrop = useCallback(() => {
    if (status !== "playing" || !activePiece) return;

    let dropDistance = 0;
    while (
      !hasCollision(
        board,
        activePiece,
        activePiece.x,
        activePiece.y + dropDistance + 1,
      )
    ) {
      dropDistance += 1;
    }

    const droppedPiece = { ...activePiece, y: activePiece.y + dropDistance };
    setScore((currentScore) => currentScore + dropDistance * 2);
    lockPiece(droppedPiece);
  }, [activePiece, board, lockPiece, status]);

  const togglePause = useCallback(() => {
    setStatus((currentStatus) => {
      if (currentStatus === "playing") return "paused";
      if (currentStatus === "paused") return "playing";
      return currentStatus;
    });
  }, []);

  useEffect(() => {
    const storedBestScore = window.localStorage.getItem("tetris-best-score");
    if (storedBestScore) {
      setBestScore(Number(storedBestScore));
    }
  }, []);

  useEffect(() => {
    if (status !== "playing") return;

    const timer = window.setInterval(tick, dropSpeed(level));
    return () => window.clearInterval(timer);
  }, [level, status, tick]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" && status !== "playing") {
        event.preventDefault();
        startGame();
        return;
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        togglePause();
        return;
      }

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        movePiece(-1);
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        movePiece(1);
      }

      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        softDrop();
      }

      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        rotatePiece();
      }

      if (event.code === "Space") {
        event.preventDefault();
        hardDrop();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hardDrop,
    movePiece,
    rotatePiece,
    softDrop,
    startGame,
    status,
    togglePause,
  ]);

  const displayBoard = useMemo(() => {
    const nextBoard = board.map((row) => [...row]);

    if (activePiece) {
      activePiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          const boardY = activePiece.y + y;
          const boardX = activePiece.x + x;
          if (
            cell &&
            boardY >= 0 &&
            boardY < rows &&
            boardX >= 0 &&
            boardX < columns
          ) {
            nextBoard[boardY][boardX] = activePiece.color;
          }
        });
      });
    }

    return nextBoard;
  }, [activePiece, board]);

  const nextPreview = useMemo(() => {
    const preview = Array.from({ length: 4 }, () => Array<Cell>(4).fill(null));
    nextPiece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) preview[y][x] = nextPiece.color;
      });
    });
    return preview;
  }, [nextPiece]);

  return (
    <main className="page">
      <section className="game-shell">
        <div className="hero-copy">
          <p className="eyebrow">Vercel Ready Arcade</p>
          <h1>Tetris</h1>
          <p className="description">
            Stack neon blocks, clear lines, and chase your best score in this
            fast little browser game.
          </p>
        </div>

        <div className="game-layout">
          <aside className="side-panel left-panel" aria-label="Game stats">
            <div className="stat-card">
              <span>Score</span>
              <strong>{score}</strong>
            </div>
            <div className="stat-card">
              <span>Best</span>
              <strong>{bestScore}</strong>
            </div>
            <div className="stat-card">
              <span>Lines</span>
              <strong>{lines}</strong>
            </div>
            <div className="stat-card">
              <span>Level</span>
              <strong>{level}</strong>
            </div>
          </aside>

          <div className="board-wrap">
            <div className="board" aria-label="Tetris board" role="grid">
              {displayBoard.flatMap((row, y) =>
                row.map((cell, x) => (
                  <div
                    className={`cell ${cell ? `cell-${cell}` : ""}`}
                    key={`${x}-${y}`}
                  />
                )),
              )}
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
                    ? "Start a new game and clear more lines."
                    : "Press Enter to play, arrows to move, and Space to drop."}
                </span>
              </div>
            )}
          </div>

          <aside className="side-panel right-panel">
            <div className="next-card">
              <span>Next</span>
              <div
                className="preview-grid"
                aria-label={`Next piece ${nextPiece.name}`}
              >
                {nextPreview.flatMap((row, y) =>
                  row.map((cell, x) => (
                    <div
                      className={`preview-cell ${cell ? `cell-${cell}` : ""}`}
                      key={`${x}-${y}`}
                    />
                  )),
                )}
              </div>
            </div>
            <div className="help-card">
              <span>Controls</span>
              <p>← → move</p>
              <p>↑ rotate</p>
              <p>↓ soft drop</p>
              <p>Space hard drop</p>
              <p>P pause</p>
            </div>
          </aside>
        </div>

        <div className="mobile-controls" aria-label="Touch controls">
          <button
            type="button"
            onClick={() => movePiece(-1)}
            aria-label="Move left"
          >
            ←
          </button>
          <button type="button" onClick={rotatePiece} aria-label="Rotate">
            ↻
          </button>
          <button
            type="button"
            onClick={() => movePiece(1)}
            aria-label="Move right"
          >
            →
          </button>
          <button type="button" onClick={softDrop} aria-label="Soft drop">
            ↓
          </button>
          <button type="button" onClick={hardDrop} aria-label="Hard drop">
            Drop
          </button>
        </div>

        <div className="actions">
          <button type="button" onClick={startGame}>
            {status === "game-over" ? "Restart game" : "New game"}
          </button>
          <button className="secondary" type="button" onClick={togglePause}>
            {status === "playing" ? "Pause" : "Resume"}
          </button>
        </div>
      </section>
    </main>
  );
}
