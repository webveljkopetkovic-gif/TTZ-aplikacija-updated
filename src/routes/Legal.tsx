import { Link } from 'react-router-dom'

function LegalPage({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-[640px] px-6 py-10">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-4 text-muted">
        Tekst je u pripremi. Pre lansiranja ga pregleda pravnik (zdravstveni podaci su posebna
        kategorija po Zakonu o zaštiti podataka o ličnosti).
      </p>
      <Link to="/" className="mt-6 inline-block font-bold text-brand-text underline">
        Nazad na početnu
      </Link>
    </main>
  )
}

export const Privacy = () => <LegalPage title="Politika privatnosti" />
export const Terms = () => <LegalPage title="Uslovi korišćenja" />
