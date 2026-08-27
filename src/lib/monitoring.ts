/**
 * Production Observability, Sentry-compatible Error Tracking & Scorer Console Logger.
 * Captures scoring mutations, unhandled promise rejections, network errors, and runtime crashes.
 */

export interface Breadcrumb {
  timestamp: number;
  category: "scoring" | "auth" | "navigation" | "network" | "ui";
  message: string;
  level: "info" | "warning" | "error";
  data?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userContext?: {
    uid?: string;
    email?: string;
    role?: string;
    tournamentId?: string;
  };
  breadcrumbs: Breadcrumb[];
  metadata?: Record<string, any>;
}

class MonitoringService {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private userContext: ErrorReport["userContext"] = {};
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    // Capture Global Window Errors
    window.addEventListener("error", (event) => {
      this.captureException(event.error || new Error(event.message), {
        source: "window.onerror",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Capture Unhandled Promise Rejections
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureException(error, {
        source: "window.unhandledrejection",
      });
    });

    this.addBreadcrumb({
      category: "ui",
      message: "Monitoring service initialized",
      level: "info",
    });
  }

  public setUser(user: { uid?: string; email?: string; role?: string; tournamentId?: string }) {
    this.userContext = { ...this.userContext, ...user };
  }

  public clearUser() {
    this.userContext = {};
  }

  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">) {
    const entry: Breadcrumb = {
      timestamp: Date.now(),
      ...breadcrumb,
    };
    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Log live scorer console actions for rapid debugging of scoring glitches
   */
  public logScorerAction(action: string, matchId: string, details?: Record<string, any>) {
    this.addBreadcrumb({
      category: "scoring",
      message: `[Scorer] ${action} (Match: ${matchId})`,
      level: "info",
      data: details,
    });
  }

  /**
   * Capture an exception with complete runtime stack, breadcrumbs, and user context
   */
  public captureException(error: Error | unknown, metadata?: Record<string, any>): ErrorReport {
    const err = error instanceof Error ? error : new Error(String(error));
    const report: ErrorReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      message: err.message,
      stack: err.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      userContext: this.userContext,
      breadcrumbs: [...this.breadcrumbs],
      metadata,
    };

    console.error(`🚨 [WasaMonitoring] Exception Captured [${report.id}]:`, err.message, {
      metadata,
      breadcrumbs: report.breadcrumbs,
    });

    // In production, dispatch to backend error endpoint / Sentry ingestion
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("wasa_error_reports");
        const reports: ErrorReport[] = stored ? JSON.parse(stored) : [];
        reports.push(report);
        sessionStorage.setItem("wasa_error_reports", JSON.stringify(reports.slice(-20)));
      } catch {}
    }

    return report;
  }

  public getRecentErrors(): ErrorReport[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem("wasa_error_reports");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public clearErrors() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("wasa_error_reports");
    }
  }
}

export const monitoring = new MonitoringService();
