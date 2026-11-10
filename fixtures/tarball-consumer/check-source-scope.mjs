// Fails when Tailwind scans any file of the installed brand package outside src/.
//
// Tailwind keeps automatic source detection on beside an @source line. A glob
// whose fixed head is the package root (`.../brand/**/*.tsx`) registers the
// whole package as a source directory, so README.md and DESIGN.md prose is read
// as class candidates; a class-shaped example there compiles to CSS `next dev`
// refuses. The production build drops such a rule after a warning, so the built
// CSS cannot show the defect. The scanned-file list can: @tailwindcss/postcss
// reports every file it scanned as a dependency message.
//
// Run from the fixture after installing the packed tarball (a real directory,
// not the workspace symlink, which Tailwind does not walk the same way).
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const from = 'app/global.css';
const result = await postcss([tailwind({ optimize: false })]).process(readFileSync(from, 'utf8'), { from });
const scanned = result.messages
  .filter((message) => message.type === 'dependency')
  .map((message) => message.file)
  .filter((file) => file.includes('/node_modules/@otto-nation/brand/'));

if (!scanned.some((file) => file.includes('/@otto-nation/brand/src/'))) {
  console.error('Tailwind scanned no brand components; the @source line no longer reaches src/');
  process.exit(1);
}
const outside = scanned.filter((file) => !file.includes('/@otto-nation/brand/src/'));
if (outside.length > 0) {
  console.error(`Tailwind scanned brand files outside src/:\n  ${outside.join('\n  ')}`);
  process.exit(1);
}
