import {
  Button,
  CardGrid,
  Footer,
  GrecaDivider,
  Hero,
  Nav,
  type CardItem,
} from '@otto-nation/brand';

const PROPERTY_CARDS: CardItem[] = [
  {
    title: 'otto-workbench',
    href: 'https://otto-nation.github.io/otto-workbench/',
    body: 'Manages your machine — shell, git, brew packages, editors, and AI coding tools, through one component framework.',
    meta: 'bin · git · task · zsh',
  },
  {
    title: 'otto-stack',
    href: 'https://github.com/otto-nation/otto-stack',
    body: 'Manages your services — the containers, config, and wiring a local stack needs to come up the same way twice.',
    meta: 'compose · config · services',
  },
  {
    title: 'homebrew-tap',
    href: 'https://github.com/otto-nation/homebrew-tap',
    body: 'Distributes both. One tap, one install command, no clone-and-bootstrap step.',
    meta: 'brew tap otto-nation/tap',
  },
];

export default function Home() {
  return (
    <>
      <Nav
        product="otto-nation"
        links={[
          { label: 'workbench', href: 'https://otto-nation.github.io/otto-workbench/' },
          { label: 'github', href: 'https://github.com/otto-nation' },
        ]}
      />
      <main className="flex-1">
        <Hero
          eyebrow="ONE TOOLCHAIN"
          headline={
            <>
              Your machine.
              <br />
              Your stack.
            </>
          }
          lede="otto-nation is three properties that assume each other: a workbench that manages your machine, a stack that manages your services, and a tap that installs both."
          actions={
            <>
              <Button href="https://otto-nation.github.io/otto-workbench/">Get started</Button>
              <Button href="https://github.com/otto-nation" variant="outline">
                GitHub
              </Button>
            </>
          }
        />
        <GrecaDivider />
        <section className="px-6 py-7">
          <CardGrid columns={3} items={PROPERTY_CARDS} />
        </section>
      </main>
      <Footer />
    </>
  );
}
