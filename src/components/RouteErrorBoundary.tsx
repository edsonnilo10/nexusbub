import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const isChunkError = (error: Error) =>
  error.name === "ChunkLoadError" ||
  /loading chunk|failed to fetch dynamically imported module/i.test(error.message);

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.PROD) {
      console.error("[RouteErrorBoundary]", error, info.componentStack);
    }
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  handleReload = () => window.location.reload();

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    const chunkError = isChunkError(this.state.error);

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>
              {chunkError ? "Nova versão disponível" : "Algo deu errado"}
            </CardTitle>
            <CardDescription>
              {chunkError
                ? "Detectamos uma atualização do sistema. Recarregue a página para continuar."
                : "Ocorreu um erro inesperado. Você pode tentar novamente ou voltar ao início."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {chunkError ? (
              <Button className="w-full" onClick={this.handleReload}>
                <RefreshCw className="h-4 w-4" /> Recarregar
              </Button>
            ) : (
              <>
                <Button className="w-full" onClick={this.handleReset}>
                  <RefreshCw className="h-4 w-4" /> Tentar novamente
                </Button>
                <Button variant="outline" className="w-full" onClick={this.handleGoHome}>
                  <Home className="h-4 w-4" /> Voltar ao início
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}
