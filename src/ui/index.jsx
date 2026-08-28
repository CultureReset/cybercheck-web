import React from 'react';

export const Spinner = ({ rows = 3 }) => (
  <div className="stack" aria-busy="true">
    {Array.from({ length: rows }, (_, i) => (
      <div className="skeleton" key={i} style={{ height: i === 0 ? 140 : 64 }} />
    ))}
  </div>
);

export const ErrorBox = ({ error, onRetry }) => {
  if (!error) return null;
  const status = error.status ? `${error.status} · ` : '';
  return (
    <div className="error row wrap-row">
      <span>{status}{error.message || 'Something went wrong.'}</span>
      {onRetry ? <button className="btn sm ghost" onClick={onRetry}>Retry</button> : null}
    </div>
  );
};

export const Empty = ({ title, hint, action }) => (
  <div className="empty stack">
    <div style={{ fontSize: '1.05rem', color: 'var(--ink-2)' }}>{title}</div>
    {hint ? <div className="dim">{hint}</div> : null}
    {action}
  </div>
);

export const Field = ({ label, hint, children }) => (
  <label className="field">
    <span>{label}{hint ? <em className="dim" style={{ fontStyle: 'normal' }}> · {hint}</em> : null}</span>
    {children}
  </label>
);

export const Modal = ({ title, onClose, children, footer }) => (
  <div
    role="dialog"
    aria-modal="true"
    onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    style={{
      position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
      background: 'rgba(0,0,0,.45)', padding: 20,
    }}
  >
    <div className="card stack" style={{ width: 'min(620px, 100%)', maxHeight: '86vh', overflow: 'auto', padding: 20 }}>
      <div className="row">
        <strong>{title}</strong>
        <span className="spacer" />
        <button className="btn sm ghost" onClick={onClose} aria-label="Close">✕</button>
      </div>
      {children}
      {footer ? <div className="row" style={{ justifyContent: 'flex-end' }}>{footer}</div> : null}
    </div>
  </div>
);
