/**
 * Firebase Real-Time Listener Latency & Performance Measurement Tracer.
 * Measures Firestore snapshot latency, scoring mutation roundtrips, and stream lag.
 */

export interface LatencyMetric {
  name: string;
  durationMs: number;
  timestamp: number;
  status: "fast" | "acceptable" | "slow";
  metadata?: Record<string, any>;
}

class PerfTracerService {
  private metrics: LatencyMetric[] = [];
  private maxStored = 50;

  /**
   * Measure execution time of an asynchronous function (e.g. mutation, query, snapshot).
   */
  public async traceAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.record(name, duration, metadata);
      return result;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      this.record(name, duration, { ...metadata, error: String(err) });
      throw err;
    }
  }

  /**
   * Start a manual timer for streaming / onSnapshot latency calculations.
   */
  public startTimer(name: string, metadata?: Record<string, any>) {
    const start = performance.now();
    return {
      stop: () => {
        const duration = Math.round(performance.now() - start);
        return this.record(name, duration, metadata);
      },
    };
  }

  private record(name: string, durationMs: number, metadata?: Record<string, any>): LatencyMetric {
    const status: LatencyMetric["status"] =
      durationMs < 350 ? "fast" : durationMs < 1200 ? "acceptable" : "slow";

    const metric: LatencyMetric = {
      name,
      durationMs,
      timestamp: Date.now(),
      status,
      metadata,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxStored) {
      this.metrics.shift();
    }

    if (status === "slow") {
      console.warn(`⏱️ [WasaPerfTracer] SLOW OPERATION: ${name} took ${durationMs}ms`, metadata);
    }

    return metric;
  }

  public getMetrics(): LatencyMetric[] {
    return [...this.metrics];
  }

  public getAverageLatency(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((acc, m) => acc + m.durationMs, 0);
    return Math.round(total / this.metrics.length);
  }
}

export const perfTracer = new PerfTracerService();
