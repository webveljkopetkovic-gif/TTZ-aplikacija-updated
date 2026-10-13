import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatRsd, useProducts, type Product } from '@/api/products'
import { Avatar, Chip } from '@/components/ui'
import { cn } from '@/lib/cn'

/** Tekst koji se na mobilnom i web dizajnu malo razlikuje. */
const Resp = ({ m, d }: { m: string; d: string }) => (
  <>
    <span className="lg:hidden">{m}</span>
    <span className="hidden lg:inline">{d}</span>
  </>
)

const Logo = () => (
  <Link to="/" aria-label="TTZ · Tvoj tim zdravlja" className="block leading-none">
    <span className="block text-4xl font-extrabold italic tracking-tight">TTZ</span>
    <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
      Tvoj tim zdravlja
    </span>
  </Link>
)

function CtaLink({
  to,
  children,
  tone = 'lime',
  className,
}: {
  to: string
  children: ReactNode
  tone?: 'lime' | 'black' | 'outline'
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex min-h-btn items-center justify-center gap-2 rounded-full px-6 py-3 font-bold',
        tone === 'lime' && 'bg-brand text-ink',
        tone === 'black' && 'bg-ink text-white',
        tone === 'outline' && 'border border-line bg-bg text-ink',
        className,
      )}
    >
      {children}
    </Link>
  )
}

const Arrow = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    aria-hidden="true"
  >
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
)

/** Fotografija iz public/team/<ime>.jpg; dok je nema, avatar sa inicijalom. */
function TeamPhoto({ name, file, className }: { name: string; file: string; className?: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) {
    return (
      <span
        className={cn(
          'flex items-center justify-center bg-card text-6xl font-extrabold text-muted',
          className,
        )}
        role="img"
        aria-label={name}
      >
        {name[0]}
      </span>
    )
  }
  return (
    <img
      src={`/team/${file}`}
      alt={name}
      onError={() => setMissing(true)}
      className={cn('object-cover object-top', className)}
    />
  )
}

function Header() {
  return (
    <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-5">
      <Logo />
      <nav aria-label="Glavna navigacija" className="flex items-center gap-2">
        <div className="mr-4 hidden items-center gap-6 text-sm font-semibold lg:flex">
          <a href="#kako-radi">Kako radi</a>
          <a href="#tim">Tim</a>
          <a href="#planovi">Planovi</a>
        </div>
        <CtaLink to="/prijava" tone="outline" className="px-5 py-2 text-sm">
          Prijava
        </CtaLink>
        <CtaLink to="/anketa/1" className="hidden px-5 py-2 text-sm lg:inline-flex">
          Popuni anketu
        </CtaLink>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-[1100px] gap-10 px-6 pb-14 pt-2 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="mb-5 hidden flex-wrap gap-2 lg:flex">
          <Chip>Insulinska rezistencija</Chip>
          <Chip>Štitna žlezda</Chip>
          <Chip>Višak kilograma</Chip>
        </p>
        <Chip className="mb-5 lg:hidden">
          <span aria-hidden="true" className="mr-2 inline-block h-4 w-4 rounded-full bg-brand" />
          Ishrana · suplementi · vežbe
        </Chip>

        <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-tight lg:text-6xl">
          <span className="lg:hidden">
            Tvoje zdravlje. <mark className="rounded-xl bg-brand px-2 text-ink">Tvoj tim.</mark>
          </span>
          <span className="hidden lg:inline">
            Plan ishrane, suplemenata i vežbi{' '}
            <span className="text-brand-text">napravljen za tebe.</span>
          </span>
        </h1>

        <p className="mt-6 max-w-[520px] text-lg text-muted">
          <Resp
            m="Nutricionistkinja i trener prave plan prema tvojim nalazima i navikama. Bez brojanja kalorija i vaganja namirnica."
            d="Nutricionistkinja i trener prave tvoj plan na osnovu ankete i nalaza. Pratiš ga dan po dan, a na svakih 10 dana šalješ feedback — tim ti odgovara porukom."
          />
        </p>

        <div className="mt-8 flex flex-col items-start gap-4 lg:flex-row lg:items-center">
          <CtaLink
            to="/anketa/1"
            tone="black"
            className="w-full justify-between py-4 text-lg lg:hidden"
          >
            Popuni anketu · 5 min
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-ink">
              <Arrow />
            </span>
          </CtaLink>
          <CtaLink to="/anketa/1" className="hidden px-7 py-4 lg:inline-flex">
            Popuni anketu <Arrow />
          </CtaLink>
          <CtaLink to="#planovi" tone="outline" className="hidden px-7 py-4 lg:inline-flex">
            Pogledaj planove
          </CtaLink>
          <a href="#kako-radi" className="self-center font-bold underline lg:hidden">
            Kako funkcioniše ↓
          </a>
        </div>

        <p className="mt-6 hidden items-center gap-2 text-sm font-bold text-brand-text lg:flex">
          <span aria-hidden="true">⊘</span> Bez brojanja kalorija i vaganja namirnica
        </p>
      </div>

      <div id="tim" className="scroll-mt-6">
        {/* mobilni: dve kartice */}
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          <div className="flex items-center gap-3 rounded-card bg-card p-3">
            <Avatar name="Olgica" tone="olgica" />
            <div>
              <p className="font-extrabold">Olgica</p>
              <p className="text-sm text-muted">Ishrana i suplementi</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-card bg-card p-3">
            <Avatar name="Ognjen" tone="ognjen" />
            <div>
              <p className="font-extrabold">Ognjen</p>
              <p className="text-sm text-muted">Vežbe</p>
            </div>
          </div>
        </div>
        {/* web: velike fotografije sa natpisima */}
        <div className="relative hidden h-[460px] lg:block">
          <figure className="absolute left-0 top-0 w-[270px] overflow-hidden rounded-[28px]">
            <TeamPhoto name="Olgica" file="olgica.jpg" className="h-[400px] w-full" />
            <figcaption className="absolute inset-x-3 bottom-3 rounded-2xl bg-brand p-3 text-ink">
              <span className="block font-extrabold">Olgica</span>
              <span className="block text-xs font-bold">Nutricionista · ishrana i suplementi</span>
            </figcaption>
          </figure>
          <figure className="absolute right-0 top-14 w-[270px] overflow-hidden rounded-[28px]">
            <TeamPhoto name="Ognjen" file="ognjen.jpg" className="h-[400px] w-full" />
            <figcaption className="absolute inset-x-3 bottom-3 rounded-2xl bg-ink p-3 text-white">
              <span className="block font-extrabold">Ognjen</span>
              <span className="block text-xs font-bold">Trener · vežbe po nivou</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  { title: 'Bez vaganja', icon: '⊘' },
  { title: 'Plan po nalazima', icon: '✓' },
  { title: 'Odgovor porukom', icon: '✉' },
]

const AUDIENCE = [
  { title: 'Insulinska rezistencija', text: 'Stabilan šećer bez gladovanja', tone: 'lime' },
  { title: 'Štitna žlezda', text: 'Ishrana i suplementi uz tvoju terapiju', tone: 'black' },
  { title: 'Višak kilograma', text: 'Bez dijete koja se ne može izdržati', tone: 'card' },
  { title: 'Varenje i energija', text: 'Manje nadutosti, više snage ujutru', tone: 'card' },
] as const

function MobileExtras() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 pb-14 lg:hidden">
      <ul className="grid grid-cols-3 gap-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex flex-col gap-4 rounded-card bg-card p-4">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-line"
            >
              {f.icon}
            </span>
            <span className="font-extrabold leading-snug">{f.title}</span>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-sm font-extrabold uppercase tracking-widest text-brand-text">
        Za koga je
      </p>
      <h2 className="mt-2 text-3xl font-extrabold leading-tight">
        Plan podrške za ono što te muči
      </h2>
      <ul className="mt-5 grid grid-cols-2 gap-3">
        {AUDIENCE.map((a) => (
          <li
            key={a.title}
            className={cn(
              'rounded-card p-5',
              a.tone === 'lime' && 'bg-brand text-ink',
              a.tone === 'black' && 'bg-ink text-white',
              a.tone === 'card' && 'border border-line bg-card',
            )}
          >
            <p className="font-extrabold leading-snug">{a.title}</p>
            <p className={cn('mt-6 text-sm', a.tone === 'black' ? 'text-white/70' : 'text-muted')}>
              {a.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

const STEPS = [
  {
    title: 'Popuni anketu',
    m: 'Zdravlje, navike i nalazi. Traje 5 minuta.',
    d: 'Zdravstveno stanje, navike, nalazi i iskustvo sa vežbanjem. Email i telefon su obavezni.',
  },
  {
    title: 'Tim pravi tvoj plan',
    m: 'Olgica ishranu za 14 dana i suplemente, Ognjen vežbe za tvoj nivo.',
    d: 'Olgica plan ishrane od 14 dana i suplemente — bez merenja grama i kalorija. Ognjen video vežbe za tvoj nivo.',
  },
  {
    title: 'Pratiš dan po dan',
    m: 'Sve je u aplikaciji. Pitanja ti asistent rešava odmah.',
    d: 'Obroci, suplementi i vežbe u aplikaciji. Pitanja rešava asistent odmah, tim potvrđuje.',
  },
  {
    title: 'Feedback na 10 dana',
    m: 'Tim ti odgovara na WhatsApp i email i prilagođava plan.',
    d: 'Podsetnik stiže na WhatsApp i email. Tim ti odgovara porukom i prilagođava plan.',
  },
]

function HowItWorks() {
  return (
    <section id="kako-radi" className="mx-auto w-full max-w-[1100px] scroll-mt-6 px-6 pb-14">
      <p className="text-sm font-extrabold uppercase tracking-widest text-brand-text lg:hidden">
        Kako funkcioniše
      </p>
      <h2 className="mt-2 text-3xl font-extrabold leading-tight lg:mt-0 lg:text-4xl">
        <Resp m="Četiri koraka, a ostalo radi tim" d="Kako funkcioniše" />
      </h2>
      <ol className="mt-6 grid gap-4 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 lg:flex-col lg:rounded-card-lg lg:bg-card lg:p-6">
            <span
              aria-hidden="true"
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-extrabold',
                i === 0 ? 'bg-brand' : 'bg-ink text-white lg:bg-line lg:text-ink',
              )}
            >
              {i + 1}
            </span>
            <div>
              <h3 className="text-lg font-extrabold">{s.title}</h3>
              <p className="mt-1 text-muted">
                <Resp m={s.m} d={s.d} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

const APP_FEATURES = [
  'Plan ishrane za 14 dana, sa zamenama',
  'Suplementi i pregled nalaza',
  'Video vežbe za tvoj nivo',
  'Feedback i odgovor tima na 10 dana',
  'Pitanja u bilo koje doba dana',
]

function InTheApp() {
  return (
    <section className="mx-auto w-full max-w-[1100px] px-6 pb-14 lg:hidden">
      <div className="rounded-[32px] bg-ink p-6 text-white">
        <p className="text-sm font-extrabold uppercase tracking-widest text-brand">U aplikaciji</p>
        <h2 className="mt-3 text-3xl font-extrabold leading-tight">
          Sve na jednom mestu, na telefonu i računaru
        </h2>
        <ul className="mt-6 flex flex-col gap-4">
          {APP_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 font-bold">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-ink"
              >
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const PLAN_POINTS: Record<Product['kind'], { m: string; items: string[] }> = {
  nutrition: {
    m: 'Plan ishrane 14 dana, protokol suplemenata, pregled nalaza i feedback na 10 dana.',
    items: [
      'Plan ishrane 14 dana, bez vaganja i brojanja kalorija',
      'Protokol suplemenata i pregled nalaza',
      'Feedback na 10 dana sa odgovorom tima',
      'Pitanja i zamene obroka preko asistenta',
    ],
  },
  nutrition_training: {
    m: 'Sve iz osnovnog plana i Ognjenove video vežbe: početni, srednji ili napredni nivo.',
    items: [
      'Sve iz osnovnog plana',
      'Ognjenove video vežbe: početni, srednji, napredni',
      'Uvod, glavni deo i istezanje u svakom treningu',
      'Zamena vežbe ako ti ne prija',
    ],
  },
}

function Plans() {
  const products = useProducts()
  const list = products.data ?? []

  return (
    <section id="planovi" className="mx-auto w-full max-w-[1100px] scroll-mt-6 px-6 pb-14">
      <p className="text-sm font-extrabold uppercase tracking-widest text-brand-text lg:hidden">
        Planovi
      </p>
      <h2 className="mt-2 text-3xl font-extrabold leading-tight lg:mt-0 lg:text-4xl">
        <Resp m="Izaberi kako želiš da počneš" d="Planovi" />
      </h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {products.isPending && <p className="text-muted">Učitavanje planova…</p>}
        {products.isError && (
          <p role="alert" className="font-bold text-danger">
            Planovi se nisu učitali. Osveži stranicu.
          </p>
        )}
        {list.map((p) => {
          const featured = p.kind === 'nutrition_training'
          const points = PLAN_POINTS[p.kind]
          return (
            <article
              key={p.id}
              className={cn(
                'relative flex flex-col rounded-card-lg bg-card p-6',
                featured ? 'border-2 border-chart bg-bg lg:bg-card' : 'border border-line',
              )}
            >
              {featured && (
                <Chip tone="lime" className="absolute -top-3 right-6 text-xs uppercase">
                  Preporuka
                </Chip>
              )}
              <h3 className="text-xl font-extrabold">{p.name}</h3>
              <p className={cn('mt-4 text-4xl font-extrabold', featured && 'text-brand-text')}>
                {formatRsd(p.price_rsd)}
              </p>
              <p className="mt-3 text-muted lg:hidden">{points.m}</p>
              <ul className="mt-5 hidden flex-col gap-2 lg:mb-6 lg:flex">
                {points.items.map((item) => (
                  <li key={item} className="text-sm">
                    {item}
                  </li>
                ))}
              </ul>
              <CtaLink
                to="/anketa/1"
                tone={featured ? 'lime' : 'outline'}
                className={cn('mt-6 w-full lg:mt-auto', featured ? '' : 'lg:mt-6')}
              >
                <Resp m="Počni anketu" d="Izaberi" />
              </CtaLink>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-[1100px] px-6 pb-14">
      <div className="flex flex-col gap-6 rounded-[32px] bg-brand p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="max-w-[560px] text-3xl font-extrabold leading-tight lg:text-4xl">
            Počni anketom. Ostalo radi tvoj tim.
          </h2>
          <p className="mt-3 font-bold">
            5 minuta · posle uplate dobijaš pristup aplikaciji na telefonu i računaru
          </p>
        </div>
        <CtaLink to="/anketa/1" tone="black" className="self-start lg:self-center">
          Popuni anketu
        </CtaLink>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1100px] border-t border-line px-6 py-8 text-sm text-muted">
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
        <p>© TTZ – Tvoj tim zdravlja</p>
        <p className="flex flex-wrap gap-x-4">
          <Link to="/privatnost" className="underline">
            Politika privatnosti
          </Link>
          <Link to="/uslovi" className="underline">
            Uslovi korišćenja
          </Link>
        </p>
        <p>Plan podrške ne zamenjuje lekarsku terapiju.</p>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="bg-bg">
      <Header />
      <main>
        <Hero />
        <MobileExtras />
        <HowItWorks />
        <InTheApp />
        <Plans />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
