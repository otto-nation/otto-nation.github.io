# otto-nation.github.io

Home of `@otto-nation/brand`, the design package every otto-nation property
consumes: tokens, fonts, marks, primitives, and page chrome.

`packages/brand/` holds the package and the two bins a consumer runs in CI:
`otto-brand-check` reads its configuration before a build, `otto-brand-verify`
reads the built export after one. Neither substitutes for the other — a correct
configuration can still produce a page that builds clean and renders wrong. See
its README for consumer setup.

`site/` is the org landing page at https://otto-nation.github.io/ and the
package's first consumer. `.github/workflows/pages.yml` builds and deploys it on
every push to `main` touching `site/` or `packages/brand/`.

`fixtures/tarball-consumer/` is the second consumer, and it sits outside the
workspaces on purpose: CI installs the packed tarball into it, so the build is
proved against what `npm pack` shipped rather than against a workspace symlink
into this tree.

    npm install
    npm test        # typechecks packages/brand and runs its node --test suite
    npm run build   # builds site/; the brand package ships source and has no build step

A `brand-v*` tag releases the package: `.github/workflows/brand-release.yml`
packs it, proves the tarball builds a real consumer in `fixtures/tarball-consumer/`,
and attaches that same tarball to a GitHub release. There is still no list of
downstream consumers, so a version bump reaches one by hand.
