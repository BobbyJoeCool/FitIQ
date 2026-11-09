/** Shown instead of the app when the Supabase environment is missing or unsafe. */
export function ConfigError({ problems }: { problems: string[] }) {
  return (
    <main
      role="alert"
      style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}
    >
      <h1>FitIQ isn't configured</h1>
      <p>The app can't reach its database because its environment is incomplete:</p>
      <ul>
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
      <p>
        Locally, copy <code>.env.example</code> to <code>.env</code> and fill it in. For the
        deployed site, set the repository variables used by the deploy workflow. See the README's
        Setup section.
      </p>
    </main>
  )
}
