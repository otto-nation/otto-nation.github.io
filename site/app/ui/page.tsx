import { StatusGlyph, Tag, type StatusGlyphStatus } from '@otto-nation/brand';

export const metadata = {
  robots: { index: false, follow: false },
};

const STATUSES: { status: StatusGlyphStatus; label: string }[] = [
  { status: 'pass', label: 'Passed' },
  { status: 'fail', label: 'Failed' },
  { status: 'running', label: 'Running' },
  { status: 'warn', label: 'Warning' },
  { status: 'none', label: 'None' },
];

export default function UiPage() {
  return (
    <main>
      <h1 data-specimen="page">App UI specimens</h1>
      <section data-specimen="status-glyph">
        <ul>
          {STATUSES.map(({ status, label }) => (
            <li key={status} data-specimen={`status-${status}`}>
              <StatusGlyph status={status} label={label} />
            </li>
          ))}
          <li key="pass-sr" data-specimen="status-pass-sr">
            <StatusGlyph status="pass" label="Passed (visually hidden)" showLabel={false} />
          </li>
        </ul>
      </section>
      <section data-specimen="tag">
        <Tag>queued</Tag>
      </section>
    </main>
  );
}
