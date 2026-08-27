import { describe, it, expect, beforeEach } from "vitest";
import { monitoring } from "./monitoring";
import { perfTracer } from "./perf-tracer";

describe("Production Observability & Monitoring Suite", () => {
  beforeEach(() => {
    monitoring.clearErrors();
  });

  describe("MonitoringService", () => {
    it("records scorer console breadcrumbs accurately", () => {
      monitoring.logScorerAction("Ball Scored (6 Runs)", "match_123", { runs: 6, batter: "Babar" });
      monitoring.logScorerAction("Wicket Bowled", "match_123", { batter: "Rizwan" });

      const err = monitoring.captureException(new Error("Test Mutation Failure"), { matchId: "match_123" });
      expect(err.message).toBe("Test Mutation Failure");
      expect(err.breadcrumbs.length).toBeGreaterThanOrEqual(2);
      expect(err.breadcrumbs.some((b) => b.message.includes("Ball Scored"))).toBe(true);
    });

    it("captures runtime exception with full context", () => {
      monitoring.setUser({ email: "scorer@wasacricket.com", role: "scorer" });
      const report = monitoring.captureException(new Error("Network timeout on Firestore push"));
      expect(report.id).toMatch(/^err_/);
      expect(report.userContext?.email).toBe("scorer@wasacricket.com");
      expect(report.userContext?.role).toBe("scorer");
    });
  });

  describe("PerfTracerService", () => {
    it("traces async execution duration accurately", async () => {
      const result = await perfTracer.traceAsync("testFetch", async () => {
        return 42;
      });
      expect(result).toBe(42);
      const metrics = perfTracer.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[metrics.length - 1].name).toBe("testFetch");
      expect(metrics[metrics.length - 1].durationMs).toBeGreaterThanOrEqual(0);
    });

    it("records manual timer durations", () => {
      const timer = perfTracer.startTimer("firestoreSnapshotLatency");
      const metric = timer.stop();
      expect(metric.name).toBe("firestoreSnapshotLatency");
      expect(metric.status).toBe("fast");
    });
  });
});
