import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive/70" />
          <p className="text-sm font-medium text-destructive">
            {this.props.fallbackTitle ?? "组件发生错误"}
          </p>
          {this.state.error && (
            <p className="text-xs text-muted-foreground max-w-xs break-words">
              {this.state.error.message}
            </p>
          )}
          <Button size="sm" variant="outline" onClick={this.handleReset} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            重试
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
