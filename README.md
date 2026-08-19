# otto-nation.github.io

The org landing site at https://otto-nation.github.io/ and `@otto-nation/brand`,
the design package every otto-nation property consumes.

- `packages/brand/` — tokens, fonts, marks, primitives, page chrome. See its README
  for consumer setup.
- `site/` — the landing page, composed entirely from package exports. It is the
  second consumer, and that is deliberate: it is what proves the API is not
  over-fitted to otto-workbench.
- `consumers.yml` — repos that receive an automated version-bump PR on release.

    npm install
    npm test                  # every workspace
    npm run build             # static-export the landing site to site/out

Design: `docs/design/2026-08-18-brand-package.md`.
