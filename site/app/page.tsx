import {
  Button,
  CardGrid,
  Footer,
  GrecaDivider,
  Hero,
  Nav,
  type CardItem,
} from '@otto-nation/brand';

const WORKBENCH_URL = 'https://otto-nation.github.io/otto-workbench/';
const GITHUB_URL = 'https://github.com/otto-nation';

const PROPERTY_CARDS: CardItem[] = [
  {
    title: 'otto-workbench',
    href: WORKBENCH_URL,
    body: 'Manages your machine — shell, git, brew packages, editors, and AI coding tools, through one component framework.',
    meta: 'bin · git · task · zsh',
  },
  {
    title: 'otto-stack',
    href: `${GITHUB_URL}/otto-stack`,
    body: 'Manages your services — the containers, config, and wiring a local stack needs to come up the same way twice.',
    meta: 'compose · config · services',
  },
  {
    title: 'homebrew-tap',
    href: `${GITHUB_URL}/homebrew-tap`,
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
          { label: 'workbench', href: WORKBENCH_URL },
          { label: 'github', href: GITHUB_URL },
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
              <Button href={WORKBENCH_URL}>Get started</Button>
              <Button href={GITHUB_URL} variant="outline">
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
