import { Eyebrow, InstallBlock, Nav } from '@otto-nation/brand';

export default function Page() {
  return (
    <div className="py-7">
      <Nav product="fixture" links={[{ label: 'github', href: 'https://github.com/otto-nation' }]} />
      <Eyebrow>TARBALL SMOKE TEST</Eyebrow>
      <InstallBlock shell="zsh" commands={['echo one', 'echo two']} />
    </div>
  );
}
