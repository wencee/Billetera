import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Último recurso: si algo explota, mostrar el error y un botón para recargar en vez de una pantalla negra. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[app] error no controlado', error, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col justify-center bg-bg px-6" style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}>
        <h1 className="text-title2">Algo salió mal</h1>
        <p className="mt-2 text-body text-label-2">Tus datos están a salvo en el teléfono. Probá recargar la app.</p>
        <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-fill p-3 text-caption1">{this.state.error.message}</pre>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-tint py-3 text-body font-semibold text-white">
          Recargar
        </button>
      </div>
    )
  }
}
