// Not exported from the barrel: internal to the package.
//
// A consumer with a basePath (otto-workbench sets '/otto-workbench') has
// next/link prefix every internal href. An absolute URL run through Link
// resolves inside the wrong site, so anything with a scheme is a plain anchor
// and only site-local hrefs keep Link. Structural, not incidental: a caller
// cannot get it wrong by passing the wrong prop.
//
// One owner for the predicate, because Button and Nav both ask the question
// and a divergent answer between them is a cross-deployment link resolving
// into the wrong site.
export function leavesThisDeployment(href: string): boolean {
  return /^[a-z]+:/.test(href);
}
