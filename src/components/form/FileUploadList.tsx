import { useRef } from 'react'
import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'

export interface UploadItem {
  id: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'done' | 'error'
  error?: string
}

export const LAB_FILE_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.heic,application/pdf,image/jpeg,image/png,image/heic'

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

function kindOf(item: UploadItem): string {
  return item.type === 'application/pdf' || /\.pdf$/i.test(item.name) ? 'PDF' : 'Slika'
}

/** Lista nalaza sa dugmetom „Dodaj nalaz“. Samo prikaz: slanje i provere radi roditelj. */
export function FileUploadList({
  items,
  onAdd,
  onRemove,
  error,
  disabled,
  addLabel = 'Dodaj nalaz',
}: {
  items: UploadItem[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  error?: string
  disabled?: boolean
  addLabel?: string
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex items-center gap-4 rounded-[22px] bg-card p-4',
              item.status === 'error' && 'border border-danger',
            )}
          >
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-line"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 3h8l4 4v14H6z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold">{item.name}</span>
              <span
                className={cn(
                  'block text-sm',
                  item.status === 'error' ? 'text-danger' : 'text-muted',
                )}
              >
                {item.status === 'uploading' && 'Šalje se…'}
                {item.status === 'done' && `${kindOf(item)} · ${formatFileSize(item.size)}`}
                {item.status === 'error' && (item.error ?? 'Slanje nije uspelo')}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Ukloni ${item.name}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <input
        ref={input}
        type="file"
        multiple
        accept={LAB_FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        data-testid="lab-file-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onAdd(files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="mt-3 flex min-h-[64px] w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-muted/50 text-base font-bold disabled:opacity-50"
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          +
        </span>
        {addLabel}
      </button>
      <FieldError id="lab-files-error" message={error} />
    </div>
  )
}
