# otto-nation.github.io

Home of `@otto-nation/brand`, the design package every otto-nation property
consumes: tokens, fonts, marks, primitives, and page chrome.

- `packages/brand/` — the package, plus the `otto-brand-check` bin a consumer runs
  in CI. See its README for consumer setup.
- `docs/design/2026-08-18-brand-package.md` — the design this was built from.

    npm install
    npm test        # typechecks packages/brand and runs its node --test suite

That is the whole repo today. The org landing site at
https://otto-nation.github.io/ is not here yet: the root `package.json` reserves a
`site` workspace and a `build` script that static-exports it, and neither resolves
until that directory lands. There is no release automation and no list of
downstream consumers — a version bump reaches a consumer by hand.
