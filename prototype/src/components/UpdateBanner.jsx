// Service Worker update banner — shows when new version is deployed

export default function UpdateBanner({ show }) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'var(--accent)', color: '#fff', textAlign: 'center',
      padding: '8px 16px', fontSize: 'var(--font-sm)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', gap: '8px',
    }}>
      <span>系統已更新</span>
      <button onClick={() => window.location.reload()} style={{
        background: '#fff', color: 'var(--accent)', border: 'none',
        borderRadius: '4px', padding: '2px 10px', fontSize: 'var(--font-xs)',
        cursor: 'pointer', fontWeight: 600,
      }}>重新載入</button>
    </div>
  );
}
