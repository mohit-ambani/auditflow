export default function SimplePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Simple Test Page</h1>
      <p>If you can see this, Next.js routing is working!</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}
