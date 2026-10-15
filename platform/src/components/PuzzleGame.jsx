import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, RotateCcw, Shuffle, Timer } from "lucide-react";
import "./PuzzleGame.css";

function shufflePieces(count) {
  const pieces = Array.from({ length: count }, (_, index) => index);
  for (let i = pieces.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  if (pieces.every((piece, index) => piece === index)) {
    [pieces[0], pieces[1]] = [pieces[1], pieces[0]];
  }
  return pieces;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function PuzzleGame({ game, onBack }) {
  const pieceCount = Math.max(2, Number(game.pieces) || 60);
  const columns = 10;
  const rows = Math.ceil(pieceCount / columns);
  const saveKey = `igiti-puzzle-progress:${game.slug || game.id || game.title}:${pieceCount}`;
  const [initialProgress] = useState(() => {
    try {
      const raw = window.localStorage.getItem(saveKey);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (
        Array.isArray(saved.pieces) &&
        saved.pieces.length === pieceCount &&
        saved.pieces.every((piece) => Number.isInteger(piece) && piece >= 0 && piece < pieceCount) &&
        new Set(saved.pieces).size === pieceCount
      ) return saved;
    } catch {
      // Storage may be unavailable or contain invalid data; start a fresh puzzle.
    }
    return null;
  });
  const [pieces, setPieces] = useState(() => initialProgress?.pieces || shufflePieces(pieceCount));
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState(() => Number.isFinite(initialProgress?.moves) ? initialProgress.moves : 0);
  const [seconds, setSeconds] = useState(() => Number.isFinite(initialProgress?.seconds) ? initialProgress.seconds : 0);
  const [showReference, setShowReference] = useState(false);
  const [dragging, setDragging] = useState(null);
  const solvedCount = pieces.reduce((count, piece, slot) => count + (piece === slot ? 1 : 0), 0);
  const complete = solvedCount === pieceCount;
  const progress = Math.round((solvedCount / pieceCount) * 100);
  const boardStyle = useMemo(() => ({
    "--puzzle-columns": columns,
    "--puzzle-rows": rows,
    "--puzzle-image": `url("${game.image}")`,
    "--puzzle-background-size": `${columns * 100}% ${rows * 100}%`,
  }), [columns, rows, game.image]);

  useEffect(() => {
    try {
      window.localStorage.setItem(saveKey, JSON.stringify({ pieces, moves, seconds }));
    } catch {
      // The puzzle remains playable if browser storage is disabled or full.
    }
  }, [saveKey, pieces, moves, seconds]);

  useEffect(() => {
    if (complete) return undefined;
    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [complete]);

  function resetPuzzle() {
    try {
      window.localStorage.removeItem(saveKey);
    } catch {
      // Reset should still work if browser storage is unavailable.
    }
    setPieces(shufflePieces(pieceCount));
    setSelected(null);
    setDragging(null);
    setMoves(0);
    setSeconds(0);
    setShowReference(false);
  }

  function swapPieces(fromSlot, toSlot) {
    if (fromSlot === toSlot || fromSlot == null || toSlot == null) return;
    setPieces((current) => {
      const next = [...current];
      [next[fromSlot], next[toSlot]] = [next[toSlot], next[fromSlot]];
      return next;
    });
    setMoves((current) => current + 1);
    setSelected(null);
    setDragging(null);
  }

  function choosePiece(slot) {
    if (selected === null) {
      setSelected(slot);
      return;
    }
    if (selected === slot) {
      setSelected(null);
      return;
    }
    swapPieces(selected, slot);
  }

  return (
    <section className="puzzle-game" aria-label={`Play ${game.title}`}>
      <div className="puzzle-game-top">
        <button className="puzzle-back" onClick={onBack}><ArrowLeft size={16} /> Back to details</button>
        <span className="puzzle-live-label"><span /> PLAYABLE STAGING BUILD</span>
      </div>
      <div className="puzzle-heading">
        <div>
          <span className="eyebrow">{`IGITI PLAY · ${pieceCount} PIECES`}</span>
          <h2>{game.title}</h2>
          <p>Choose one piece, then choose another to swap them. You can also drag pieces on desktop.</p>
        </div>
        <button className="puzzle-reset" onClick={resetPuzzle}><RotateCcw size={15} /> Restart</button>
      </div>
      <div className="puzzle-stats">
        <div><span><Timer size={15} /> TIME</span><strong>{formatTime(seconds)}</strong></div>
        <div><span><Shuffle size={15} /> MOVES</span><strong>{moves}</strong></div>
        <div><span>PIECES PLACED</span><strong>{solvedCount} / {pieceCount}</strong></div>
      </div>
      <div className="puzzle-progress" aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }} /></div>
      <div className="puzzle-board-wrap">
        <div className={`puzzle-board ${complete ? "is-complete" : ""}`} style={boardStyle}>
          {pieces.map((piece, slot) => {
            const x = piece % columns;
            const y = Math.floor(piece / columns);
            const isCorrect = piece === slot;
            const isSelected = selected === slot;
            const style = {
              backgroundPosition: `${columns === 1 ? 0 : (x / (columns - 1)) * 100}% ${rows === 1 ? 0 : (y / (rows - 1)) * 100}%`,
              backgroundSize: `${columns * 100}% ${rows * 100}%`,
            };
            return (
              <button
                key={slot}
                className={`puzzle-tile ${isCorrect ? "is-correct" : ""} ${isSelected ? "is-selected" : ""} ${dragging === slot ? "is-dragging" : ""}`}
                style={style}
                aria-label={`Piece ${piece + 1}, position ${slot + 1}${isCorrect ? ", correct" : ""}`}
                aria-pressed={isSelected}
                onClick={() => choosePiece(slot)}
                draggable={!complete}
                onDragStart={(event) => {
                  setDragging(slot);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(slot));
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(event.dataTransfer.getData("text/plain"));
                  if (Number.isInteger(from)) swapPieces(from, slot);
                }}
                onDragEnd={() => setDragging(null)}
              >
                {isCorrect && <span className="tile-check"><CheckCircle2 size={12} /></span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="puzzle-actions">
        <button className="puzzle-secondary" onClick={() => setShowReference((shown) => !shown)}><Eye size={16} /> {showReference ? "Hide picture guide" : "Show picture guide"}</button>
        <span>{selected === null ? "Select a piece to begin swapping." : "Now select the piece you want to swap with."}</span>
      </div>
      {showReference && <div className="puzzle-reference"><img src={game.image} alt={`Reference image for ${game.title}`} /><p>Use this picture as your guide while you arrange the pieces.</p></div>}
      {complete && <div className="puzzle-complete" role="status"><CheckCircle2 size={25} /><div><strong>Beautifully done!</strong><p>You completed the picture in {formatTime(seconds)} with {moves} moves.</p></div><button onClick={resetPuzzle}>Play again</button></div>}
      <p className="puzzle-footnote">Progress saves automatically on this browser, including your arrangement, moves, and timer. Account and cross-device saving are not yet enabled.</p>
    </section>
  );
}
