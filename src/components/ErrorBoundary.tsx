import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Bug, Copy } from "lucide-react";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ErrorBoundary");

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorId: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    logger.error("Unhandled UI error", { error: error.message, stack: error.stack, errorInfo, id: this.state.errorId });
  }

  handleReset = () => {
    logger.info("ErrorBoundary reset triggered", { id: this.state.errorId });
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: "" });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopy = async () => {
    const payload = JSON.stringify({
      id: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = payload;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-screen p-6 bg-background">
          <Card className="max-w-xl w-full border-destructive/30 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-lg">Something went wrong</CardTitle>
                  <CardDescription className="mt-1">
                    Paralock encountered an unexpected error. Error ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{this.state.errorId}</code>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm font-mono overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Bug className="h-4 w-4" />
                  <span className="font-sans font-medium">Error details</span>
                </div>
                {this.state.error?.message || "Unknown error"}
                {this.state.error?.stack && (
                  <div className="mt-2 text-xs opacity-70 line-clamp-6">{this.state.error.stack.slice(0, 600)}</div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Reliability safeguard: This error has been logged locally. You can copy details for debugging or reload to recover. Your device data is safe — pending ADB operations are aborted.
              </div>

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="secondary" className="gap-2">
                  Reload App
                </Button>
                <Button onClick={this.handleCopy} variant="outline" className="gap-2 ml-auto">
                  <Copy className="h-4 w-4" />
                  Copy Error
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, fallback?: React.ReactNode) {
  return function Wrapped(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
