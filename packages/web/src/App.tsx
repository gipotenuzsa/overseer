export function App() {
  return (
    <main>
      <header>
        <a className="wordmark" href="/" aria-label="Overseer home">
          <span className="brand-mark" aria-hidden="true">
            O
          </span>
          Overseer
        </a>
        <span className="badge">Development preview</span>
      </header>

      <section className="intro" aria-labelledby="intro-title">
        <p className="eyebrow">Understand what changed.</p>
        <h1 id="intro-title">See what your AI coding agent actually built.</h1>
        <p className="description">
          A clearer view of your project, the changes your agent makes, and the questions worth
          asking before you ship.
        </p>
      </section>

      <section className="status" aria-labelledby="status-title">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <h2 id="status-title">The foundation is ready.</h2>
          <p>Project scanning is coming next. This preview does not open or analyze your files.</p>
        </div>
      </section>

      <footer>
        <span>Open source · MIT license</span>
        <span>No account. No API key. No data sent.</span>
      </footer>
    </main>
  );
}
