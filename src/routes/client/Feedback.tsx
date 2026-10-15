import { Link } from 'react-router-dom'
import { useMyFeedbacks } from '@/api/feedback'
import { useMyChannels } from '@/api/client'
import { ErrorNote, Loading, Panel, Screen, ScreenHeader } from '@/components/client/ui'
import { Chip } from '@/components/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { cn } from '@/lib/cn'
import {
  daysWord,
  feedbackBlurb,
  feedbackKicker,
  feedbackTitle,
  heroState,
  replyDeadline,
  statusLabel,
} from '@/lib/feedbackView'
import { firstName } from '@/lib/labels'

const dateTime = (d: Date) =>
  new Intl.DateTimeFormat('sr-Latn', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)

function ChannelChip({ on, children }: { on: boolean; children: string }) {
  return <Chip tone={on ? 'lime' : 'outline'}>{on ? `✓ ${children}` : children}</Chip>
}

/** Feedback na 10 dana (design/Feedback na 10 dana.png): sledeći feedback, podsetnik i istorija sa odgovorima. */
export default function Feedback() {
  const my = useMyProgram()
  const feedbacks = useMyFeedbacks(my.program?.id)
  const channels = useMyChannels(my.userId)
  const list = feedbacks.data ?? []
  const hero = heroState(list, my.day)
  const name = firstName(my.profile?.full_name)

  return (
    <Screen>
      <ScreenHeader
        title="Feedback"
        subtitle="Na svakih 10 dana · tim ti odgovara porukom"
        back="/app/danas"
      />
      {feedbacks.isPending && <Loading />}
      {feedbacks.isError && <ErrorNote>Feedback se nije učitao. Osveži stranicu.</ErrorNote>}

      <div className="mt-5 flex flex-col gap-4">
        {hero.kind !== 'none' && (
          <section className="rounded-card-lg bg-brand p-6 text-ink">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-extrabold tracking-wide">
                {feedbackKicker(hero.feedback.due_day, list)}
              </p>
              {hero.kind === 'upcoming' && (
                <p className="text-sm font-extrabold">
                  {hero.daysLeft === 0 ? 'danas' : `za ${hero.daysLeft} ${daysWord(hero.daysLeft)}`}
                </p>
              )}
            </div>

            {hero.kind === 'upcoming' && (
              <>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                  Javljaš se na dan {hero.feedback.due_day}
                </h2>
                <p className="mt-3 text-lg">
                  Stiže ti podsetnik. Za 2 minuta odgovoriš kako se osećaš, kakva je energija ujutru
                  i šta ti smeta u ishrani{my.withTraining ? ' i kod vežbi' : ''}.
                </p>
              </>
            )}
            {hero.kind === 'open' && (
              <>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                  {hero.feedback.status === 'late'
                    ? `Čekamo te: feedback za dan ${hero.feedback.due_day}`
                    : `Vreme je za feedback, ${name}`}
                </h2>
                <p className="mt-3 text-lg">
                  Treba ti samo 2 minuta. Olgica{my.withTraining ? ' i Ognjen' : ''} na osnovu njega
                  prilagođavaju plan.
                </p>
              </>
            )}
            {hero.kind === 'waiting' && (
              <>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">Hvala, poslato je!</h2>
                <p className="mt-3 text-lg">
                  Tim odgovara porukom
                  {replyDeadline(hero.feedback.submitted_at)
                    ? ` do ${dateTime(replyDeadline(hero.feedback.submitted_at)!)}`
                    : ' u roku od 48 sati'}
                  .
                </p>
              </>
            )}
            {hero.kind === 'answered' && (
              <>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">Tim ti je odgovorio</h2>
                <p className="mt-3 whitespace-pre-line text-lg">
                  {hero.feedback.feedback_replies.at(-1)?.body}
                </p>
              </>
            )}

            <Link
              to={`/app/feedback/${hero.feedback.due_day}`}
              className="mt-5 inline-flex min-h-btn items-center justify-center rounded-full bg-ink px-7 py-3 text-lg font-extrabold text-brand"
            >
              {hero.kind === 'open'
                ? 'Popuni feedback'
                : hero.kind === 'upcoming'
                  ? 'Pogledaj pitanja'
                  : 'Pogledaj odgovore'}
            </Link>
          </section>
        )}

        {hero.kind === 'upcoming' && (
          <Panel>
            <h2 className="text-lg font-extrabold">
              Na dan {hero.feedback.due_day} podsetnik stiže na
            </h2>
            <div className="mt-4 rounded-card bg-bg p-4">
              <p className="font-extrabold text-brand-text">WhatsApp · TTZ</p>
              <p className="mt-1">
                {name}, prošlo je {hero.feedback.due_day} dana. Popuni feedback za 2 minuta da
                Olgica{my.withTraining ? ' i Ognjen' : ''} prilagode plan.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ChannelChip on={channels.data?.includes('whatsapp') ?? false}>WhatsApp</ChannelChip>
              <ChannelChip on={channels.data?.includes('email') ?? false}>Email</ChannelChip>
              <ChannelChip on={channels.data?.includes('app') ?? false}>Aplikacija</ChannelChip>
            </div>
          </Panel>
        )}

        <Panel className="px-5 py-2">
          <ul>
            {list.map((f) => {
              const done = f.status === 'submitted' || f.status === 'answered'
              return (
                <li key={f.id} className="border-b border-line last:border-0">
                  <Link
                    to={`/app/feedback/${f.due_day}`}
                    className="flex min-h-[80px] items-center gap-4 py-3"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold',
                        done
                          ? 'bg-brand'
                          : f.status === 'scheduled'
                            ? 'border-2 border-dashed border-muted/50'
                            : 'bg-ink text-white',
                      )}
                    >
                      {done ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-extrabold">
                        {feedbackTitle(f.due_day, list)}
                      </span>
                      <span className="block text-muted">{feedbackBlurb(f.due_day, list)}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-right',
                        f.status === 'late'
                          ? 'font-extrabold text-danger'
                          : f.status === 'open' || done
                            ? 'font-extrabold'
                            : 'text-muted',
                      )}
                    >
                      {statusLabel(f.status, f.due_day - my.day)}
                    </span>
                  </Link>
                </li>
              )
            })}
            {feedbacks.isSuccess && list.length === 0 && (
              <li className="py-4 text-muted">Feedback se zakazuje kad počneš program.</li>
            )}
          </ul>
        </Panel>
      </div>
    </Screen>
  )
}
