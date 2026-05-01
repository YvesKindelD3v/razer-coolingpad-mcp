/**
 * Example: Agent workflow with physical feedback
 *
 * This demonstrates how an agent might use the cooling pad
 * during a typical build-test-deploy workflow.
 *
 * Not meant to be run directly — it's a reference for
 * how to integrate pad feedback into your agent logic.
 */

// Simulated MCP client (replace with your actual MCP client)
interface McpClient {
  call(tool: string, args: Record<string, unknown>): Promise<void>;
}

async function buildWorkflow(mcp: McpClient) {
  // Agent starts analyzing the task
  await mcp.call("set_agent_state", { state: "thinking" });
  // → Cyan wave, fan at 40%

  // Found the files to modify
  await mcp.call("set_agent_state", { state: "acting" });
  // → Green static, fan at 60%

  // Show progress during multi-file edit
  const files = ["auth.ts", "routes.ts", "middleware.ts", "tests.ts"];
  for (let i = 0; i < files.length; i++) {
    const percent = Math.round(((i + 1) / files.length) * 100);
    await mcp.call("show_progress", { percent });
    // → LEDs fill up green, one by one
  }

  // Running tests — heavy workload
  await mcp.call("set_workload", { level: "heavy" });
  // → Fan at 75%, LEDs orange

  // Tests passed!
  await mcp.call("set_emotion", { emotion: "happy" });
  // → Bright green, full brightness

  // Waiting for user to confirm deploy
  await mcp.call("set_agent_state", { state: "waiting" });
  // → Amber breathing, fan at 25%

  // User confirmed — deploying
  await mcp.call("set_agent_state", { state: "acting" });
  await mcp.call("show_progress", { percent: 0 });

  // Simulate deploy progress
  for (let i = 0; i <= 100; i += 5) {
    await mcp.call("show_progress", { percent: i, color: "#00ff44" });
    await sleep(200);
  }

  // Done — back to idle
  await mcp.call("set_emotion", { emotion: "calm" });
  // → Slow blue breathing, fan quiet

  await sleep(3000);
  await mcp.call("set_agent_state", { state: "idle" });
  // → Gentle blue pulse, minimal fan
}

async function monitoringWorkflow(mcp: McpClient) {
  // Real-time GPU temperature monitoring
  // Read temp from system, display on pad

  const gpuTemp = 72; // from lm-sensors or nvidia-smi

  await mcp.call("show_temperature", {
    celsius: gpuTemp,
    source: "gpu",
    profile: "balanced",
    adjust_fan: true,
  });
  // → Heatmap on LEDs + fan auto-adjusts to temperature curve

  // Show CPU load as VU meter
  const cpuLoad = 65; // from /proc/stat
  await mcp.call("show_level_meter", { percent: cpuLoad });
  // → Green-yellow meter, 65% filled
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
