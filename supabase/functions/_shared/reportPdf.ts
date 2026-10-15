/**
 * Završni izveštaj kao PDF (PLAN.md 4.7). Font je Outfit (ugrađen, sa č, ć, š, ž, đ). Pravi se na serveru,
 * čuva u bucket `reports` i klijent ga preuzima sa ekrana „Kraj programa“.
 */
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { change, formatChange, resultsSummary, wrapText, type ProgramResults } from './programResults.ts'

const BRAND = rgb(0.671, 0.976, 0.173) // #ABF92C
const INK = rgb(0.082, 0.082, 0.082) // #151515
const MUTED = rgb(0.369, 0.369, 0.4) // #5E5E66
const CARD = rgb(0.953, 0.953, 0.937) // #F3F3EF
const GREEN_TEXT = rgb(0.227, 0.42, 0) // #3A6B00

const PAGE = { width: 595, height: 842, margin: 48 }

export const RECOMMENDATION_LABEL: Record<string, string> = {
  continue: 'Nastavak programa još 30 dana sa novim planom',
  nutrition_only: 'Nastavak samo sa ishranom i suplementima',
  end: 'Za sada završavaš program',
}

export type ReportInput = {
  clientName: string
  planName: string
  focus: string | null
  withTraining: boolean
  results: ProgramResults
  nutritionNote: string
  trainingNote: string
  recommendation: string | null
  /** Datum objave, već formatiran (npr. „3. 11. 2026.“). */
  date: string
}

const fontFile = (name: string) => Deno.readFile(new URL(`./fonts/${name}`, import.meta.url))

export async function buildReportPdf(input: ReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(`Završni izveštaj · ${input.clientName}`)
  doc.setAuthor('TTZ – Tvoj tim zdravlja')
  const regular = await doc.embedFont(await fontFile('Outfit_400Regular.ttf'), { subset: true })
  const bold = await doc.embedFont(await fontFile('Outfit_800ExtraBold.ttf'), { subset: true })

  // znak koji font nema (npr. emoji) zamenjuje se, da PDF ne pukne
  const safe = (font: PDFFont, text: string) => {
    const set = new Set(font.getCharacterSet())
    return [...text].map((c) => (c === '\n' || set.has(c.codePointAt(0)!) ? c : '?')).join('')
  }

  let page: PDFPage = doc.addPage([PAGE.width, PAGE.height])
  let y = PAGE.height - PAGE.margin
  const contentWidth = PAGE.width - PAGE.margin * 2

  const ensure = (height: number) => {
    if (y - height < PAGE.margin + 24) {
      page = doc.addPage([PAGE.width, PAGE.height])
      y = PAGE.height - PAGE.margin
    }
  }
  const text = (
    value: string,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; x?: number },
  ) => {
    const font = opts.font ?? regular
    page.drawText(safe(font, value), {
      x: opts.x ?? PAGE.margin,
      y,
      size: opts.size ?? 11,
      font,
      color: opts.color ?? INK,
    })
  }
  const paragraph = (value: string, size = 11, color = INK) => {
    const lineHeight = size * 1.45
    for (const line of wrapText(safe(regular, value), (s) => regular.widthOfTextAtSize(s, size), contentWidth)) {
      ensure(lineHeight)
      y -= lineHeight
      text(line, { size, color })
    }
  }
  const heading = (value: string, color = INK) => {
    ensure(40)
    y -= 34
    text(value, { font: bold, size: 15, color })
    y -= 4
  }

  // zaglavlje
  page.drawRectangle({ x: 0, y: PAGE.height - 150, width: PAGE.width, height: 150, color: BRAND })
  y = PAGE.height - 56
  text('TTZ · TVOJ TIM ZDRAVLJA', { font: bold, size: 10 })
  y -= 42
  text('Završni izveštaj', { font: bold, size: 30 })
  y -= 26
  text(`${input.clientName} · ${input.planName}${input.focus ? ` · ${input.focus}` : ''}`, { size: 12 })
  y = PAGE.height - 150 - 8

  paragraph(resultsSummary(input.results, input.withTraining), 12, MUTED)

  // tri glavna rezultata
  const r = input.results
  const stats = [
    { label: 'Težina', value: formatChange(change(r.start_weight_kg, r.end_weight_kg), 'kg') },
    { label: 'Struk', value: formatChange(change(r.start_waist_cm, r.end_waist_cm), 'cm') },
    { label: 'Plan praćen', value: `${r.followed_days}/${r.duration_days} d` },
  ]
  ensure(86)
  const gap = 12
  const boxWidth = (contentWidth - gap * 2) / 3
  const boxTop = y - 16
  stats.forEach((s, i) => {
    const x = PAGE.margin + i * (boxWidth + gap)
    page.drawRectangle({ x, y: boxTop - 62, width: boxWidth, height: 62, color: CARD })
    page.drawText(safe(regular, s.label), { x: x + 14, y: boxTop - 22, size: 10, font: regular, color: MUTED })
    page.drawText(safe(bold, s.value), { x: x + 14, y: boxTop - 48, size: 20, font: bold, color: INK })
  })
  y = boxTop - 62

  const from = (a: number | null, b: number | null, unit: string) =>
    typeof a === 'number' && typeof b === 'number'
      ? `${String(a).replace('.', ',')} → ${String(b).replace('.', ',')} ${unit}`
      : null
  const detail = [from(r.start_weight_kg, r.end_weight_kg, 'kg'), from(r.start_waist_cm, r.end_waist_cm, 'cm')]
    .filter(Boolean)
    .join('   ·   ')
  if (detail) {
    y -= 8
    paragraph(`Dan 1 → poslednje merenje: ${detail}`, 10, MUTED)
  }

  heading('Olgica · ishrana i suplementi', GREEN_TEXT)
  paragraph(input.nutritionNote || '—')

  if (input.withTraining) {
    heading('Ognjen · vežbe')
    paragraph(input.trainingNote || '—')
  }

  if (input.recommendation) {
    heading('Predlog za dalje')
    paragraph(RECOMMENDATION_LABEL[input.recommendation] ?? input.recommendation)
  }

  // podnožje na svakoj strani
  doc.getPages().forEach((p, i, all) => {
    p.drawText(safe(regular, `TTZ – Tvoj tim zdravlja · ${input.date} · strana ${i + 1}/${all.length}`), {
      x: PAGE.margin,
      y: 28,
      size: 9,
      font: regular,
      color: MUTED,
    })
  })

  return await doc.save()
}
