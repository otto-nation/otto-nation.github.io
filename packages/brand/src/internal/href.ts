// Not exported from the barrel: internal to the package.
//
// A consumer with a basePath (otto-workbench sets '/otto-workbench') has
// next/link prefix every internal href. An href that already names its own
// destination is resolved inside the wrong site when it goes through Link, so
// it renders as a plain anchor instead, and only site-local hrefs keep Link.
// Structural, not incidental: a caller cannot get it wrong by passing the
// wrong prop.
//
// Two shapes leave the deployment:
//
//   - a scheme — 'https:', 'mailto:', 'tel:'. RFC 3986 defines a scheme as
//     [a-z][a-z0-9+.-]* and declares it case-insensitive, so 'HTTPS://' and
//     'MailTo:' are the same links as their lowercase forms and have to be
//     treated the same way.
//   - protocol-relative, '//host/path'. It carries no scheme but it does carry
//     an authority, so the host — not this site — decides where it lands. A
//     basePath prefix would turn it into '/otto-workbench//host/path', a path
//     on this site. Included for exactly the reason a scheme is.
//
// Everything else is site-local and keeps Link: '/docs', 'docs/page',
// '#anchor', '?q=1'.
//
// One owner for the predicate, because Button and Nav both ask the question
// and a divergent answer between them is a cross-deployment link resolving
// into the wrong site.
export function leavesThisDeployment(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}
