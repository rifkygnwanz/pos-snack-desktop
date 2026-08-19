import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Uncaught error in React ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleCopyError = (): void => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.toString()}\n\nStack:\n${errorInfo?.componentStack || error?.stack || "No stack trace"}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 3000);
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-6 text-gray-900">
          <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl border border-gray-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Terjadi Kesalahan pada Aplikasi
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Aplikasi mengalami kendala tak terduga. Seluruh data transaksi & produk Anda tetap aman.
                </p>
              </div>
            </div>

            <div className="my-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="font-mono text-xs text-red-600 break-words font-semibold">
                {this.state.error?.toString() || "Unknown Error"}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-2 max-h-40 overflow-auto font-mono text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack.trim()}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={this.handleCopyError}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition shadow-sm"
              >
                {this.state.copied ? "✅ Berhasil Disalin" : "📋 Salin Detail Error"}
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl bg-snack-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-snack-700 active:scale-[0.98] transition shadow-md"
              >
                🔄 Muat Ulang Aplikasi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
