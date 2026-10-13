import { useState, type ReactNode } from 'react'
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChoiceChip,
  FileIcon,
  FolderIcon,
  GridIcon,
  Input,
  LeafIcon,
  Segmented,
  Sidebar,
  TabBar,
  Toggle,
} from '@/components/ui'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

export default function DevUi() {
  const [sex, setSex] = useState<'female' | 'male'>('female')
  const [on, setOn] = useState(true)
  const [picked, setPicked] = useState(['Umor'])
  const toggle = (s: string) =>
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))

  return (
    <div className="flex min-h-screen">
      <Sidebar
        title="Konzola tima"
        user={{ name: 'Olgica', role: 'Ishrana i suplementi', tone: 'olgica' }}
        items={[
          { to: '/dev/ui', label: 'Pregled', icon: <GridIcon /> },
          { to: '/dev/dosijei', label: 'Dosijei', icon: <FileIcon />, count: 24 },
          { to: '/dev/sabloni', label: 'Šabloni planova', icon: <LeafIcon /> },
          { to: '/dev/video', label: 'Video materijali', icon: <FolderIcon /> },
        ]}
      />
      <main className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8 pb-40 lg:px-10">
        <h1 className="text-4xl font-extrabold">
          UI komponente <span className="text-brand-text">TTZ</span>
        </h1>

        <Section title="Dugmad">
          <div className="flex flex-wrap gap-3">
            <Button>Nastavi</Button>
            <Button variant="black">Počni anketu</Button>
            <Button variant="soft">Google</Button>
            <Button variant="outline">Izmeni</Button>
            <Button disabled>Onemogućeno</Button>
          </div>
          <Button block>Prijavi se</Button>
        </Section>

        <Section title="Kartice i čipovi">
          <Card>
            <p className="font-bold">Suplementi danas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>Vitamin D3 · doručak</Chip>
              <Chip tone="lime">Gorušica</Chip>
              <Chip tone="black">Koleno</Chip>
              <Chip tone="outline">2. krug</Chip>
            </div>
          </Card>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Simptomi">
            {['Umor', 'Nadutost', 'Glavobolja'].map((s) => (
              <ChoiceChip key={s} selected={picked.includes(s)} onClick={() => toggle(s)}>
                {s}
              </ChoiceChip>
            ))}
          </div>
        </Section>

        <Section title="Polja">
          <Input label="Ime i prezime" required defaultValue="Ana Marković" />
          <Input
            label="Telefon (WhatsApp)"
            hint="Telefon nam treba za WhatsApp poruke. Ne zovemo."
          />
          <Input
            label="Lozinka"
            type="password"
            defaultValue="lozinka123"
            error="Pogrešan email ili lozinka. Pokušaj ponovo."
          />
        </Section>

        <Section title="Izbor i prekidač">
          <Segmented
            label="Pol"
            value={sex}
            onChange={setSex}
            options={[
              { value: 'female', label: 'Žena' },
              { value: 'male', label: 'Muškarac' },
            ]}
          />
          <div className="flex items-center gap-3">
            <Toggle checked={on} onChange={setOn} label="Podsetnik za obroke" />
            <span>Podsetnik za obroke</span>
          </div>
        </Section>

        <Section title="Avatari">
          <div className="flex items-center gap-3">
            <Avatar name="Ana" />
            <Avatar name="Olgica" tone="olgica" />
            <Avatar name="Ognjen" tone="ognjen" />
            <Avatar name="Olgica" tone="olgica" size="lg" />
          </div>
        </Section>

        <p className="text-sm text-muted lg:hidden">Donja navigacija je ispod (do 1024px).</p>
        <p className="hidden text-sm text-muted lg:block">Sidebar je levo (od 1024px).</p>
      </main>
      <div className="fixed inset-x-0 bottom-0">
        <TabBar />
      </div>
    </div>
  )
}
