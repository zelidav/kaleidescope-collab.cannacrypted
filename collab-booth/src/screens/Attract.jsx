export default function Attract({ onStart, outboxCount }) {
  return (
    <button className="screen attract" onClick={onStart}>
      <div className="attract-inner">
        <div className="eyebrow">Jerome Baker Designs × Hall of Flowers NYC</div>
        <h1 className="title">
          The B*NG
          <br />
          Garden
        </h1>
        <p className="lede">Snap a photo in the garden and we’ll post it to Instagram — with you as a collaborator.</p>
        <div className="cta pulse">Tap to start 🌷</div>
      </div>
      {outboxCount > 0 && <div className="outbox-badge">{outboxCount} waiting for wifi</div>}
    </button>
  );
}
