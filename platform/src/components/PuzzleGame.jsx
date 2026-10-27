import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, Lightbulb, RotateCcw, Shuffle, Timer } from "lucide-react";
import { getApiBaseUrl } from "../lib/api.js";
import { usePlayerAuth } from "../lib/PlayerAuthContext.jsx";
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
  const { user } = usePlayerAuth();
  const apiBase = getApiBaseUrl();
  const cloudEligible = Boolean(user && apiBase && game.gameId && game.puzzleSlug);
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
  const [hintsUsed, setHintsUsed] = useState(() => Number.isFinite(initialProgress?.hintsUsed) ? initialProgress.hintsUsed : 0);
  const [showReference, setShowReference] = useState(false);
  const [showFunFact, setShowFunFact] = useState(false);
  const [activeFunFact, setActiveFunFact] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [cloudReady, setCloudReady] = useState(!cloudEligible);
  const [cloudStatus, setCloudStatus] = useState("local");
  const solvedCount = pieces.reduce((count, piece, slot) => count + (piece === slot ? 1 : 0), 0);
  const complete = solvedCount === pieceCount;
  const hintLimit = Math.max(1, Math.floor(pieceCount * 0.1));
  const progress = Math.round((solvedCount / pieceCount) * 100);
  const factSlotsRef = useRef(null);
  const suppressNextFactRef = useRef(false);
  const perPieceFacts = useMemo(() => Array.isArray(game.funFacts) ? game.funFacts.filter(Boolean) : [], [game.funFacts]);
  const boardStyle = useMemo(() => ({
    "--puzzle-columns": columns,
    "--puzzle-rows": rows,
    "--puzzle-image": `url("${game.image}")`,
    "--puzzle-background-size": `${columns * 100}% ${rows * 100}%`,
  }), [columns, rows, game.image]);

  useEffect(() => {
    try {
      window.localStorage.setItem(saveKey, JSON.stringify({ pieces, moves, seconds, hintsUsed }));
    } catch {
      // The puzzle remains playable if browser storage is disabled or full.
    }
  }, [saveKey, pieces, moves, seconds, hintsUsed]);

  useEffect(() => {
    let cancelled = false;
    if (!cloudEligible || !user) {
      setCloudReady(true);
      setCloudStatus("local");
      return undefined;
    }
    setCloudReady(false);
    setCloudStatus("syncing");
    async function restoreCloudProgress() {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${apiBase}/v1/me/progress`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Cloud progress could not be loaded.");
        if (cancelled) return;
        const saved = (payload.data || []).find((item) => item.puzzleId === game.id);
        const state = saved?.state;
        const validPieces = Array.isArray(state?.pieces) &&
          state.pieces.length === pieceCount &&
          state.pieces.every((piece) => Number.isInteger(piece) && piece >= 0 && piece < pieceCount) &&
          new Set(state.pieces).size === pieceCount;
        if (saved && validPieces && !initialProgress) {
          suppressNextFactRef.current = true;
          setPieces(state.pieces);
          setMoves(Number.isFinite(state.moves) ? state.moves : 0);
          setSeconds(Number.isFinite(saved.elapsedSeconds) ? saved.elapsedSeconds : (Number.isFinite(state.seconds) ? state.seconds : 0));
          setHintsUsed(Number.isFinite(state.hintsUsed) ? state.hintsUsed : 0);
        }
        setCloudStatus("saved");
      } catch {
        if (!cancelled) setCloudStatus("offline");
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    }
    restoreCloudProgress();
    return () => { cancelled = true; };
  }, [cloudEligible, user, apiBase, game.id, pieceCount, initialProgress]);

  useEffect(() => {
    if (!cloudEligible || !cloudReady || !user) return undefined;
    const timeout = window.setTimeout(async () => {
      try {
        setCloudStatus("syncing");
        const token = await user.getIdToken();
        const response = await fetch(`${apiBase}/v1/me/progress/${game.id}`, {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            state: { pieces, moves, seconds, hintsUsed },
            elapsedSeconds: seconds,
            completed: complete,
          }),
        });
        if (!response.ok) throw new Error("Cloud progress could not be saved.");
        setCloudStatus("saved");
      } catch {
        setCloudStatus("offline");
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [cloudEligible, cloudReady, user, apiBase, game.id, pieces, moves, seconds, hintsUsed, complete]);

  useEffect(() => {
    if (complete) return undefined;
    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [complete]);

  useEffect(() => {
    if (complete && game.funFact) setShowFunFact(true);
  }, [complete, game.funFact]);

  // The first board render (and a cloud-save restore) establishes a baseline.
  // Only a newly-correct placement during play triggers a per-piece fact.
  useEffect(() => {
    const correctSlots = new Set(pieces.flatMap((piece, slot) => piece === slot ? [slot] : []));
    const previous = factSlotsRef.current;
    factSlotsRef.current = correctSlots;
    if (!previous || suppressNextFactRef.current) {
      suppressNextFactRef.current = false;
      return;
    }
    const newlyCorrect = [...correctSlots].find((slot) => !previous.has(slot));
    if (newlyCorrect == null || perPieceFacts.length === 0) return;
    setActiveFunFact(perPieceFacts[newlyCorrect % perPieceFacts.length]);
  }, [pieces, perPieceFacts]);

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
    setHintsUsed(0);
    setShowReference(false);
    setShowFunFact(false);
    setActiveFunFact(null);
    factSlotsRef.current = null;
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

  function useHint() {
    if (complete || hintsUsed >= hintLimit) return;
    suppressNextFactRef.current = true;
    setPieces((current) => {
      const targetSlot = current.findIndex((piece, slot) => piece !== slot);
      if (targetSlot < 0) return current;
      const sourceSlot = current.indexOf(targetSlot);
      const next = [...current];
      [next[targetSlot], next[sourceSlot]] = [next[sourceSlot], next[targetSlot]];
      return next;
    });
    setHintsUsed((current) => current + 1);
    setMoves((current) => current + 1);
    setSelected(null);
    setDragging(null);
  }

  return (
    <section className="puzzle-game" aria-label={`Play ${game.title}`}>
      <div className="puzzle-game-top">
        <button className="puzzle-back" onClick={onBack}><ArrowLeft size={16} /> Back to details</button>
        <span className="puzzle-live-label"><span /> {cloudEligible ? "ACCOUNT SYNC ENABLED" : "PLAYABLE PUZZLE"}</span>
      </div>
      <div className="puzzle-heading">
        <div>
          <span className="eyebrow">{`IGITI PLAY · ${pieceCount} PIECES`}</span>
          <h2>{game.title}</h2>
          <p>Choose one piece, then choose another to swap them. You can also drag pieces on desktop.</p>
        </div>
        <div className="puzzle-heading-actions"><button className="puzzle-secondary" onClick={useHint} disabled={complete || hintsUsed >= hintLimit}><Lightbulb size={15} /> Hint {hintsUsed}/{hintLimit}</button><button className="puzzle-reset" onClick={resetPuzzle}><RotateCcw size={15} /> Restart</button></div>
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
      {(activeFunFact || showFunFact) && <div className="puzzle-fact-overlay" role="presentation"><section className="puzzle-fact-popup" role="dialog" aria-modal="true" aria-labelledby="puzzle-fact-title"><Lightbulb size={24} /><span className="eyebrow">{activeFunFact ? "CORRECT PIECE · FACT UNLOCKED" : "PUZZLE COMPLETE · FACT UNLOCKED"}</span><h3 id="puzzle-fact-title">Did you know?</h3><p>{activeFunFact || game.funFact}</p><button className="button button-primary" onClick={() => { setActiveFunFact(null); setShowFunFact(false); }}>Keep playing</button></section></div>}
      <p className="puzzle-footnote">{cloudEligible ? (cloudStatus === "syncing" ? "Syncing your arrangement to your account…" : cloudStatus === "saved" ? "Your arrangement, moves and timer are syncing to your account, so you can return on another device." : "Cloud sync is temporarily unavailable. Your progress is still saved on this browser.") : user ? "This preview puzzle saves on this browser. Sign-in and cloud saves will be available for published puzzles." : "Progress saves automatically on this browser, including your arrangement, moves, and timer. Sign in to use account-based saves on published puzzles."}</p>
    </section>
  );
}
