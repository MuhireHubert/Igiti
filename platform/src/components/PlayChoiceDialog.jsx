import { Puzzle, UsersRound, X } from "lucide-react";

export default function PlayChoiceDialog({ gameTitle, onSolo, onTogether, onClose }) {
  return <div className="play-choice-overlay" role="presentation">
    <section className="play-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="play-choice-title">
      <button className="play-choice-close" type="button" onClick={onClose} aria-label="Close play options"><X size={18} /></button>
      <span className="eyebrow">CHOOSE YOUR ADVENTURE</span>
      <h2 id="play-choice-title">Play solo or <em>together?</em></h2>
      <p>Start <strong>{gameTitle}</strong> at your own pace, or open a private team challenge and invite friends or classmates with a room code.</p>
      <div className="play-choice-options">
        <button type="button" onClick={onSolo}>
          <span className="play-choice-icon"><Puzzle size={24} /></span>
          <strong>Play solo</strong>
          <small>Build the picture, chase your own best time, and learn as you go.</small>
        </button>
        <button type="button" onClick={onTogether}>
          <span className="play-choice-icon"><UsersRound size={24} /></span>
          <strong>Play together</strong>
          <small>Open the team challenge room and share its six-character code.</small>
        </button>
      </div>
      <p className="play-choice-note">Team challenge rooms sync scores and rounds. A live shared puzzle board is the next multiplayer upgrade.</p>
    </section>
  </div>;
}
