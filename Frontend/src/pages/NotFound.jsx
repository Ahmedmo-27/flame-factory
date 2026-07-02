import usePageTitle from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Not Found');
  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <p style={{ fontSize: 72, fontWeight: 800, color: 'var(--border-md)', letterSpacing: '-3px', lineHeight: 1, marginBottom: 16 }}>404</p>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>Page not found</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)' }}>The page you're looking for doesn't exist or you don't have access.</p>
      </div>
    </div>
  );
}
