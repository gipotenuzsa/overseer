import { useEffect, useRef, useState } from 'react';
import { Background, Controls, Position, ReactFlow } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import type { Feature, Finding, ProjectModel } from '@overseer/core';
import '@xyflow/react/dist/style.css';

interface HistoryItem {
  id: string;
  createdAt: string;
  health: number;
  findings: number;
}
interface AppData {
  name: string;
  token: string;
  model: ProjectModel;
  history: HistoryItem[];
}
type Screen = 'Overview' | 'Feature map' | 'Findings' | 'History';
const screens: Screen[] = ['Overview', 'Feature map', 'Findings', 'History'];

async function request(url: string, init?: RequestInit): Promise<AppData> {
  const response = await fetch(url, init);
  const value: unknown = await response.json();
  if (
    !response.ok ||
    !value ||
    typeof value !== 'object' ||
    !('model' in value) ||
    !('history' in value)
  )
    throw new Error(
      'The local project could not be loaded. Start Overseer in your project folder and try again.',
    );
  return value as AppData;
}

function Trend({ history }: { history: HistoryItem[] }) {
  const recent = history.slice(-16);
  const points = recent
    .map(
      (item, index) =>
        `${12 + index * (276 / Math.max(1, recent.length - 1))},${88 - item.health * 0.7}`,
    )
    .join(' ');
  return (
    <svg
      className="trend"
      viewBox="0 0 300 100"
      role="img"
      aria-label={`Health history: ${recent.map((item) => item.health).join(', ')}`}
    >
      <path d="M12 18H288M12 53H288M12 88H288" stroke="#e3e8df" strokeDasharray="3 5" />
      <polyline
        points={points}
        fill="none"
        stroke="#46784b"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {recent.map((item, index) => (
        <circle
          key={item.id}
          cx={12 + index * (276 / Math.max(1, recent.length - 1))}
          cy={88 - item.health * 0.7}
          r="4"
          fill="#46784b"
        />
      ))}
    </svg>
  );
}

function FeatureMap({
  features,
  select,
}: {
  features: Feature[];
  select: (feature: Feature) => void;
}) {
  const shown = features.slice(0, 24);
  const tables = [
    ...new Set(shown.flatMap((feature) => feature.tables.map((table) => table.name))),
  ];
  const nodes: Node[] = shown.map((feature, index) => ({
    id: feature.id,
    position: { x: 0, y: index * 100 },
    sourcePosition: Position.Right,
    data: { label: `${feature.name} · ${feature.files.length} files` },
    style: { width: 250 },
  }));
  nodes.push(
    ...tables.map((table, index) => ({
      id: `table:${table}`,
      position: { x: 440, y: index * 110 + Math.max(30, shown.length * 35) },
      targetPosition: Position.Left,
      data: { label: `Table · ${table}` },
      style: { background: '#edf3e6', borderColor: '#bdd2a5', width: 200 },
    })),
  );
  const edges: Edge[] = shown.flatMap((feature) =>
    feature.tables.map((table) => ({
      id: `${feature.id}:table:${table.name}`,
      source: feature.id,
      target: `table:${table.name}`,
      label: table.access,
      type: 'smoothstep',
    })),
  );
  return (
    <>
      <div className="graph">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ maxZoom: 1 }}
          minZoom={0.1}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, node) => {
            const feature = features.find((item) => item.id === node.id);
            if (feature) select(feature);
          }}
        >
          <Background color="#dce3d5" gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <p className="muted">
        Select a function to see its files. Lines show detected database access.
        {features.length > 24
          ? ' The graph shows the first 24 functions. All functions are listed on Overview.'
          : ''}
      </p>
    </>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return (
    <article className="finding">
      <div className={`severity ${finding.level}`}>{finding.level}</div>
      <div className="finding-body">
        <h3>{finding.title}</h3>
        <p className="file-location">
          {finding.file}:{finding.line ?? 1}
        </p>
        <p>{finding.message}</p>
        <details>
          <summary>Why it matters & how to fix it</summary>
          <p>{finding.whyDangerous}</p>
          <blockquote>{finding.fixPrompt}</blockquote>
        </details>
      </div>
      <button
        className="button small"
        onClick={() => {
          void navigator.clipboard
            .writeText(`${finding.fixPrompt}\nLocation: ${finding.file}:${finding.line ?? 1}`)
            .then(() => {
              setCopied(true);
              setCopyError(false);
            })
            .catch(() => setCopyError(true));
        }}
      >
        {copied ? 'Copied ✓' : 'Copy fix prompt'}
      </button>
      {copyError && <p role="status">Open the explanation and copy the prompt text.</p>}
    </article>
  );
}

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>('Overview');
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [selected, setSelected] = useState<Feature | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    void request('/api/data', { signal: controller.signal })
      .then(setData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : 'Could not load project.');
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  async function rescan(): Promise<void> {
    if (!data) {
      window.location.reload();
      return;
    }
    setBusy(true);
    setError('');
    try {
      setData(
        await request('/api/scan', { method: 'POST', headers: { 'X-Overseer-Token': data.token } }),
      );
      setSelected(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Scan failed.');
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="loading">
        <div className="logo-symbol">O</div>
        <h1>{error ? 'The project is not available' : 'Getting the big picture…'}</h1>
        <p>{error || 'Reading the results from your local Overseer server.'}</p>
        {error && (
          <button className="button primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        )}
      </main>
    );
  const { model } = data;
  const critical = model.findings.filter((item) => item.level === 'critical').length;
  const warnings = model.findings.filter((item) => item.level === 'warning').length;
  const features = model.features.filter((feature) =>
    `${feature.name} ${feature.entry}`.toLowerCase().includes(search.toLowerCase()),
  );
  const findings = model.findings.filter(
    (item) =>
      (level === 'all' || item.level === level) &&
      `${item.title} ${item.file} ${item.message}`.toLowerCase().includes(search.toLowerCase()),
  );
  const headings: Record<Screen, [string, string]> = {
    Overview: [
      'Your project, explained.',
      'A clear view of what is built, what connects, and what needs attention.',
    ],
    'Feature map': [
      'See how it fits together.',
      'Functions and the data they touch, traced from local imports and API calls.',
    ],
    Findings: [
      'Know what needs attention.',
      'Detected patterns, plain explanations, and a next step for your coding agent.',
    ],
    History: [
      'A little better each session.',
      'Follow your project’s health across local snapshots.',
    ],
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="wordmark"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setScreen('Overview');
          }}
        >
          <span className="logo-symbol">O</span>overseer<span className="version">0.1</span>
        </a>
        <div className="project-switch">
          <span className="project-avatar">{data.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{data.name}</strong>
            <small>Next.js{model.stack.db ? ' + Supabase' : ''}</small>
          </div>
          <span className="local-dot" title="Local project" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {screens.map((item, index) => (
            <button
              key={item}
              aria-current={screen === item ? 'page' : undefined}
              className={screen === item ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setScreen(item);
                setSearch('');
              }}
            >
              <span className="nav-icon" aria-hidden="true">
                {['◫', '⌘', '⚑', '◷'][index]}
              </span>
              {item}
              {item === 'Findings' && <span className="nav-count">{model.findings.length}</span>}
            </button>
          ))}
        </nav>
        <div className="local-note">
          <span className="local-dot" />
          <strong>On your machine.</strong>
          <p>
            Your code stays here.
            <br />
            No account required.
          </p>
        </div>
        <div className="sidebar-footer">
          See what your AI actually built.
          <br />
          <span>Open source · MIT</span>
        </div>
      </aside>
      <main className="workspace">
        <div className="topbar">
          <span>
            <span className="muted">Workspace</span> <span className="crumb">/</span> {screen}
          </span>
          <span className="local-badge">
            <span className="local-dot" /> LOCAL ANALYSIS
          </span>
        </div>
        <div className="content">
          <header className="page-header">
            <div>
              <p className="eyebrow">{data.name.toUpperCase()} / PROJECT INTELLIGENCE</p>
              <h1>{headings[screen][0]}</h1>
              <p className="subtitle">{headings[screen][1]}</p>
            </div>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => {
                void rescan();
              }}
            >
              <span aria-hidden="true">↻</span> {busy ? 'Scanning…' : 'Scan project'}
            </button>
          </header>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <div className="scan-line">
            <span className="local-dot" /> Scanned {new Date(model.createdAt).toLocaleString()}{' '}
            <span>·</span> {model.files.length} files analyzed <span>·</span>{' '}
            {model.diagnostics.length
              ? `${model.diagnostics.length} analysis limits`
              : 'Local scan complete'}
          </div>
          {screen === 'Overview' && (
            <>
              <section className="overview-grid" aria-label="Project summary">
                <article className="health-card">
                  <div>
                    <p className="card-label">PROJECT HEALTH</p>
                    <div className="health-number">
                      {model.health}
                      <span>/100</span>
                    </div>
                    <p>
                      {critical
                        ? 'Review critical findings first.'
                        : warnings
                          ? 'A few things to review.'
                          : 'No critical patterns detected.'}
                    </p>
                    <button className="text-button" onClick={() => setScreen('Findings')}>
                      See the findings <span>↗</span>
                    </button>
                  </div>
                  <div
                    className="health-ring"
                    style={{ background: `conic-gradient(#66854b ${model.health}%, #e4e9dc 0)` }}
                  >
                    <span>{model.health >= 80 ? '↗' : '!'}</span>
                  </div>
                  <div className="formula">100 − 15 per critical − 5 per warning − 1 per info</div>
                </article>
                <article className="stat-card">
                  <span className="stat-icon">⌘</span>
                  <p className="card-label">FEATURES</p>
                  <strong>{model.features.length}</strong>
                  <p>
                    {model.pages.length} pages · {model.apis.length} APIs
                  </p>
                </article>
                <article className="stat-card">
                  <span className={`stat-icon ${critical ? 'warm' : ''}`}>⚑</span>
                  <p className="card-label">NEEDS ATTENTION</p>
                  <strong>{critical + warnings}</strong>
                  <p>
                    <span className="critical-text">{critical} critical</span> · {warnings} warnings
                  </p>
                </article>
                <article className="trend-card">
                  <p className="card-label">HEALTH OVER TIME</p>
                  <Trend history={data.history} />
                  <p>
                    {data.history.length} local snapshots{' '}
                    <button className="text-button" onClick={() => setScreen('History')}>
                      View history ↗
                    </button>
                  </p>
                </article>
              </section>
              <div className="section-heading">
                <div>
                  <h2>
                    What your project does{' '}
                    <span className="count-badge">{model.features.length}</span>
                  </h2>
                  <p>Start with a function. See its files, data, and findings.</p>
                </div>
                <label className="search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="Find a feature"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find a feature…"
                  />
                </label>
              </div>
              <section className="feature-grid" aria-label="Features">
                {features.map((feature, index) => {
                  const count = model.findings.filter((item) =>
                    feature.files.includes(item.file),
                  ).length;
                  return (
                    <button
                      key={feature.id}
                      className="feature-card"
                      onClick={() => setSelected(feature)}
                    >
                      <div className="feature-card-top">
                        <span className="feature-icon">{String(index + 1).padStart(2, '0')}</span>
                        <span aria-hidden="true">↗</span>
                      </div>
                      <h3>{feature.name}</h3>
                      <code>{feature.entry}</code>
                      <p>
                        {feature.description ||
                          `${feature.files.length} connected files${feature.tables.length ? ` and ${feature.tables.length} data tables` : ''}.`}
                      </p>
                      <div className="feature-footer">
                        <span>
                          {feature.apis.length} APIs <span className="separator">·</span>{' '}
                          {feature.tables.length} tables
                        </span>
                        <span className={count ? 'finding-count' : 'clear-count'}>
                          {count ? `${count} findings` : 'No findings'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </section>
              {features.length === 0 && (
                <div className="empty">No matching features. Try another search.</div>
              )}
              <div className="note">
                <span>◉</span>
                <p>
                  <strong>Clarity, not a security certificate.</strong> Overseer checks known
                  patterns. Dynamic imports, external services, and custom access rules may need a
                  closer look.
                </p>
              </div>
            </>
          )}
          {screen === 'Feature map' && (
            <FeatureMap features={model.features} select={setSelected} />
          )}
          {screen === 'Findings' && (
            <>
              <div className="finding-toolbar">
                <div className="filters" aria-label="Filter severity">
                  {['all', 'critical', 'warning', 'info'].map((item) => (
                    <button
                      key={item}
                      aria-pressed={level === item}
                      className={level === item ? 'selected' : ''}
                      onClick={() => setLevel(item)}
                    >
                      {item === 'all' ? 'All findings' : item}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <input
                    aria-label="Search findings"
                    placeholder="Search findings…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>
              <div className="findings-list">
                {findings.map((item) => (
                  <FindingCard key={item.id} finding={item} />
                ))}
              </div>
              {!findings.length && (
                <div className="empty">
                  <h2>No matching findings.</h2>
                  <p>Known-pattern checks do not prove that a project is secure.</p>
                </div>
              )}
            </>
          )}
          {screen === 'History' && (
            <>
              <section className="history-chart">
                <div>
                  <p className="card-label">PROJECT HEALTH</p>
                  <h2>
                    {model.health}
                    <small>/100 today</small>
                  </h2>
                  <p>Snapshots are saved after scans and comparisons.</p>
                </div>
                <Trend history={data.history} />
              </section>
              <div className="table-wrap">
                <table>
                  <caption>Recent snapshots</caption>
                  <thead>
                    <tr>
                      <th>Scanned</th>
                      <th>Health</th>
                      <th>Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.history]
                      .reverse()
                      .slice(0, 30)
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{new Date(item.createdAt).toLocaleString()}</td>
                          <td>
                            <strong>{item.health}</strong> / 100
                          </td>
                          <td>{item.findings}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                For a shareable session report, run <code>overseer diff</code> in your project
                folder.
              </p>
            </>
          )}
          {model.diagnostics.length > 0 && (
            <details className="limits">
              <summary>Analysis limits ({model.diagnostics.length})</summary>
              <ul>
                {model.diagnostics.map((item, index) => (
                  <li key={`${item.file}:${index}`}>
                    <code>{item.file}</code>: {item.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <footer className="page-footer">
            <span>Built to help you ask better questions.</span>
            <span>Overseer · Local by default</span>
          </footer>
        </div>
      </main>
      <dialog
        ref={dialog}
        onClose={() => setSelected(null)}
        className="feature-dialog"
        aria-labelledby="feature-title"
      >
        {selected && (
          <>
            <header>
              <div>
                <p className="eyebrow">FEATURE DETAILS</p>
                <h2 id="feature-title">{selected.name}</h2>
                <code>{selected.entry}</code>
              </div>
              <button
                className="button"
                aria-label="Close feature details"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </header>
            <p>
              {selected.description || 'Files connected through imports and literal API requests.'}
            </p>
            <h3>Data this feature uses</h3>
            {selected.tables.length ? (
              <ul>
                {selected.tables.map((table) => (
                  <li key={table.name}>
                    <strong>{table.name}</strong> —{' '}
                    {table.access === 'write' ? 'changes data' : 'reads data'}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No table access was detected.</p>
            )}
            <h3>Connected files ({selected.files.length})</h3>
            <ul className="file-list">
              {selected.files.map((file) => (
                <li key={file}>
                  <code>{file}</code>
                </li>
              ))}
            </ul>
            <h3>Findings</h3>
            {model.findings
              .filter((item) => selected.files.includes(item.file))
              .map((item) => (
                <FindingCard key={item.id} finding={item} />
              ))}
            {!model.findings.some((item) => selected.files.includes(item.file)) && (
              <p>No known patterns were found in this feature.</p>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
