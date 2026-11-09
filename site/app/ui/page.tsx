import {
  ActionButton,
  SectionLabel,
  StatusGlyph,
  Tag,
  type ActionButtonVariant,
  type StatusGlyphStatus,
} from '@otto-nation/brand';

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

const ACTION_VARIANTS: ActionButtonVariant[] = ['solid', 'outline', 'ghost'];
const ACTION_STATES = [
  { state: 'rest', dense: false, disabled: false },
  { state: 'dense', dense: true, disabled: false },
  { state: 'disabled', dense: false, disabled: true },
] as const;

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
      <section data-specimen="section-label">
        <SectionLabel>Open</SectionLabel>
      </section>
      <section data-specimen="section-label-count">
        <SectionLabel count={3}>Open</SectionLabel>
      </section>
      {ACTION_VARIANTS.map((variant) =>
        ACTION_STATES.map(({ state, dense, disabled }) => (
          <section
            key={`${variant}-${state}`}
            data-specimen={`action-${variant}-${state}`}
          >
            <ActionButton variant={variant} dense={dense} disabled={disabled}>
              Action
            </ActionButton>
          </section>
        )),
      )}
    </main>
  );
}
