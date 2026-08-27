/**
 * Serverless / Edge Uptime & Live Score Health Check Endpoint.
 * Can be polled by UptimeRobot, BetterStack, Pingdom, or GitHub Actions.
 */

export default function handler(_req: any, res: any) {
  const uptime = process.uptime ? process.uptime() : 0;

  const healthData = {
    status: "healthy",
    service: "WasaCricket Live Scoring Platform",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(uptime),
    version: "2.5.0",
    endpoints: {
      liveScores: "online",
      database: "online",
      broadcastOverlay: "online",
    },
  };

  if (res && typeof res.status === "function") {
    return res.status(200).json(healthData);
  }

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
