import {
  ActionButton,
  AppCard,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  ListRow,
  SectionLabel,
  SegmentedControl,
  StateMessage,
  StatusGlyph,
  Tag,
  type ActionButtonVariant,
  type AppCardVariant,
  type SegmentedOption,
  type StateMessageKind,
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

const SEGMENTED_OPTIONS: SegmentedOption[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

const LIST_ROWS = [
  { state: 'rest', selected: false, dense: false },
  { state: 'dense', selected: false, dense: true },
  { state: 'selected', selected: true, dense: false },
] as const;

const CARD_VARIANTS: AppCardVariant[] = ['card', 'popover'];
const INPUT_STATES = [
  { state: 'rest', dense: false, disabled: false },
  { state: 'dense', dense: true, disabled: false },
  { state: 'disabled', dense: false, disabled: true },
] as const;

const STATE_MESSAGES: {
  kind: StateMessageKind;
  children?: string;
  action?: boolean;
}[] = [
  { kind: 'empty', children: 'No pull requests' },
  { kind: 'loading' },
  { kind: 'stale', children: 'stale 2m ago' },
  { kind: 'error', children: 'Could not load pull requests', action: true },
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
      <section data-specimen="button-page-solid">
        <Button>Page solid</Button>
      </section>
      <section data-specimen="button-page-outline">
        <Button variant="outline">Page outline</Button>
      </section>
      <section data-specimen="button-page-link">
        <Button href="/ui">Page link</Button>
      </section>
      <section data-specimen="button-page-ondark">
        <Button onDark>Page onDark</Button>
      </section>
      <section data-specimen="button-page-danger">
        <Button variant="danger">Delete</Button>
      </section>
      {ACTION_VARIANTS.map((variant) =>
        ACTION_STATES.map(({ state, dense, disabled }) => (
          <section
            key={`app-${variant}-${state}`}
            data-specimen={`button-app-${variant}-${state}`}
          >
            <Button size="app" variant={variant} dense={dense} disabled={disabled}>
              App
            </Button>
          </section>
        )),
      )}
      <section data-specimen="button-app-danger-rest">
        <Button size="app" variant="danger">
          Delete
        </Button>
      </section>
      <section data-specimen="button-app-danger-disabled">
        <Button size="app" variant="danger" disabled>
          Delete
        </Button>
      </section>
      <section data-specimen="segmented">
        <SegmentedControl
          options={SEGMENTED_OPTIONS}
          value="open"
          label="Status"
        />
      </section>
      <section data-specimen="segmented-dense">
        <SegmentedControl
          options={SEGMENTED_OPTIONS}
          value="open"
          label="Status"
          dense
        />
      </section>
      {LIST_ROWS.map(({ state, selected, dense }) => (
        <section key={state} data-specimen={`list-row-${state}`}>
          <ListRow selected={selected} dense={dense}>
            otto-nation/brand
          </ListRow>
        </section>
      ))}
      {CARD_VARIANTS.map((variant) => (
        <section key={variant} data-specimen={`app-card-${variant}`}>
          <AppCard variant={variant}>{`${variant} body`}</AppCard>
        </section>
      ))}
      <section data-specimen="app-card-title">
        <AppCard title="Pane">Card body</AppCard>
      </section>
      {INPUT_STATES.map(({ state, dense, disabled }) => (
        <section key={state} data-specimen={`input-${state}`}>
          <Input dense={dense} disabled={disabled} defaultValue="branch" />
        </section>
      ))}
      <section data-specimen="input-invalid">
        <Input aria-invalid="true" defaultValue="branch" />
      </section>
      <section data-specimen="field-hint">
        <Field id="spec-title" label="Title" hint="A short name">
          {(p) => <Input {...p} />}
        </Field>
      </section>
      <section data-specimen="field-error">
        <Field id="spec-notes" label="Title" hint="A short name" error="Required">
          {(p) => <Textarea {...p} />}
        </Field>
      </section>
      <section data-specimen="textarea-rest">
        <Textarea defaultValue="notes" />
      </section>
      <section data-specimen="textarea-disabled">
        <Textarea disabled defaultValue="notes" />
      </section>
      <section data-specimen="textarea-invalid">
        <Textarea aria-invalid="true" defaultValue="notes" />
      </section>
      <section data-specimen="select-rest">
        <Select defaultValue="open">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </Select>
      </section>
      <section data-specimen="select-dense">
        <Select dense defaultValue="open">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </Select>
      </section>
      <section data-specimen="select-disabled">
        <Select disabled defaultValue="open">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </Select>
      </section>
      {STATE_MESSAGES.map(({ kind, children, action }) => (
        <section key={kind} data-specimen={`state-${kind}`}>
          <StateMessage
            kind={kind}
            action={
              action ? (
                <ActionButton variant="outline">Retry</ActionButton>
              ) : undefined
            }
          >
            {children}
          </StateMessage>
        </section>
      ))}
    </main>
  );
}
