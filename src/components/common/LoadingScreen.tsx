export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" style={{ display: 'grid', placeItems: 'center', minHeight: '50dvh' }}>
      {label}
    </div>
  )
}
