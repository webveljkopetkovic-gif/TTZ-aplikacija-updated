/** Poruka greške ispod polja, crvena (#B42A18). `id` se vezuje preko aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-semibold text-danger">
      {message}
    </p>
  )
}
