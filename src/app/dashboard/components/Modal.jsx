export default function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay active" role="presentation">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
