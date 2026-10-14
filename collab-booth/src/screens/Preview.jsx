export default function Preview({ photo, onRetake, onUse }) {
  return (
    <div className="screen preview">
      <img className="shot" src={photo.dataUrl} alt="Your photo" />
      <div className="row">
        <button className="btn ghost big" onClick={onRetake}>
          Retake
        </button>
        <button className="btn primary big" onClick={onUse}>
          Use This ✓
        </button>
      </div>
    </div>
  );
}
