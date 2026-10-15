import { Link } from 'react-router-dom'
import { Panel, Screen, ScreenHeader } from '@/components/client/ui'
import { Avatar } from '@/components/ui'
import { useMyProgram } from '@/hooks/useMyProgram'

/** Tvoj tim (design/Tvoj tim.png): Olgica i Ognjen, bez poziva, sve ide porukom. */
export default function Team() {
  const my = useMyProgram()
  return (
    <Screen>
      <ScreenHeader title="Tvoj tim" subtitle="Bez poziva · sve ide porukom" back="/app/danas" />

      <div className="mt-5 flex flex-col gap-4">
        <Panel>
          <div className="flex items-center gap-4">
            <Avatar name="Olgica" tone="olgica" size="lg" />
            <div>
              <h2 className="text-2xl font-extrabold">Olgica</h2>
              <p className="text-muted">Ishrana i suplementi</p>
            </div>
          </div>
          <p className="mt-4">
            Pravi tvoj plan ishrane i protokol suplemenata, pregleda nalaze i odgovara na feedback
            na 10 dana.
          </p>
        </Panel>

        {my.withTraining && (
          <Panel>
            <div className="flex items-center gap-4">
              <Avatar name="Ognjen" tone="ognjen" size="lg" />
              <div>
                <h2 className="text-2xl font-extrabold">Ognjen</h2>
                <p className="text-muted">Vežbe</p>
              </div>
            </div>
            <p className="mt-4">Bira video treninge za tvoj nivo i prati kako ti prijaju.</p>
          </Panel>
        )}

        <Panel className="bg-line/60">
          <p className="font-extrabold">Kako stižemo do tebe</p>
          <p className="mt-1">
            Odgovor na feedback stiže u roku od 48 sati, na WhatsApp i email. Pitanja možeš da
            postaviš u{' '}
            <Link to="/app/pitanja" className="font-bold text-brand-text underline">
              Pitanjima
            </Link>
            .
          </p>
        </Panel>
      </div>
    </Screen>
  )
}
