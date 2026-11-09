# otto-nation.github.io

Home of `@otto-nation/brand` (tokens, fonts, marks, primitives, page chrome),
the org landing `site/`, `fixtures/tarball-consumer/` (packed-tarball proof),
and `bin/fanout-consumers` (version-bump PRs for listed consumers).

```
npm test        # typechecks packages/brand and runs its node --test suite
npm run build   # builds site/; the brand package ships source
```

## UI and styling

Read `packages/brand/DESIGN.md` before UI or styling work. Start at Do's and
Don'ts and Components. `packages/brand/src/tokens.css` owns every hex (except
the three documented in `src/marks/icon.svg`).

Do not hand-edit DESIGN.md front matter or `<!-- generated:* -->` regions.
Regenerate with `npm run design:generate -w packages/brand`.
