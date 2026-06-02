import { useEffect } from 'react'

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        onConfirm()
      } else if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onConfirm, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="panel max-w-md p-6">
        <p className="mb-4 text-slate-700">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Tidak (N / Esc)
          </button>
          <button type="button" onClick={onConfirm} className="btn-primary">
            Ya (Y / Enter)
          </button>
        </div>
      </div>
    </div>
  )
}
