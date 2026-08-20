# otto-nation.github.io

Home of `@otto-nation/brand`, the design package every otto-nation property
consumes: tokens, fonts, marks, primitives, and page chrome.

`packages/brand/` holds the package, plus the `otto-brand-check` bin a consumer runs
in CI. See its README for consumer setup.

    npm install
    npm test        # typechecks packages/brand and runs its node --test suite

That is the whole repo today. The org landing site at
https://otto-nation.github.io/ is not here yet: the root `package.json` reserves a
`site` workspace, and `npm run build` builds every workspace that has a build
script — no workspace does yet, and the brand package never will, so it is a no-op
until `site/` lands.

A `brand-v*` tag releases the package: `.github/workflows/brand-release.yml`
packs it, proves the tarball builds a real consumer in `fixtures/tarball-consumer/`,
and attaches that same tarball to a GitHub release. There is still no list of
downstream consumers, so a version bump reaches one by hand.
