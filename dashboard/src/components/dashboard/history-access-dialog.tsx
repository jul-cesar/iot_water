import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface HistoryAccessDialogProps {
  open: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (username: string, password: string) => void
}

const inputClassName =
  "h-8 w-full border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"

export function HistoryAccessDialog({
  open,
  error,
  onOpenChange,
  onSubmit,
}: HistoryAccessDialogProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(username, password)
    setPassword("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acceso al historial</DialogTitle>
          <DialogDescription>
            Ingrese la cuenta autorizada para consultar y exportar mediciones.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-1">
            <span>Usuario</span>
            <input
              className={inputClassName}
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span>Contraseña</span>
            <input
              className={inputClassName}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(error)}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit">Ingresar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
