import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

interface ConfirmOptions {
  message: string
  confirmLabel?: string
  danger?: boolean
}

interface PromptOptions {
  message: string
  placeholder?: string
  initial?: string
  confirmLabel?: string
}

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
}

const DialogContext = createContext<DialogApi | null>(null)

export function useDialog(): DialogApi {
  const api = useContext(DialogContext)
  if (!api) throw new Error('useDialog usato fuori da <DialogProvider>')
  return api
}

type DialogState =
  | { kind: 'none' }
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (v: string | null) => void }

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({ kind: 'none' })
  const [text, setText] = useState('')

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ kind: 'confirm', options, resolve })),
    [],
  )

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setText(options.initial ?? '')
        setState({ kind: 'prompt', options, resolve })
      }),
    [],
  )

  function dismiss() {
    if (state.kind === 'confirm') state.resolve(false)
    if (state.kind === 'prompt') state.resolve(null)
    setState({ kind: 'none' })
  }

  function accept() {
    if (state.kind === 'confirm') state.resolve(true)
    if (state.kind === 'prompt') {
      const value = text.trim()
      if (!value) return
      state.resolve(value)
    }
    setState({ kind: 'none' })
  }

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {state.kind !== 'none' && (
        <div className="dialog-backdrop" onClick={dismiss}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="dialog-msg">{state.options.message}</p>

            {state.kind === 'prompt' && (
              <input
                className="dialog-input"
                autoFocus
                value={text}
                placeholder={state.options.placeholder}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') accept()
                }}
              />
            )}

            <div className="dialog-actions">
              <button type="button" className="dialog-btn" onClick={dismiss}>
                Annulla
              </button>
              <button
                type="button"
                className={`dialog-btn primary${
                  state.kind === 'confirm' && state.options.danger ? ' danger' : ''
                }`}
                disabled={state.kind === 'prompt' && text.trim() === ''}
                onClick={accept}
              >
                {state.kind === 'confirm'
                  ? (state.options.confirmLabel ?? 'OK')
                  : (state.options.confirmLabel ?? 'Aggiungi')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
