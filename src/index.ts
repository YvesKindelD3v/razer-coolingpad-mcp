#!/usr/bin/env node
/**
 * MCP Server for Razer Laptop Cooling Pad (PID 0x0F43)
 *
 * Exposes fan control, LED effects, per-LED custom frames, and
 * semantic patterns (emotions, workload, agent states) as MCP tools.
 *
 * Usage:
 *   npx tsx src/index.ts           # development
 *   node dist/index.js             # production (after tsc)
 *
 * Linux prerequisites (Ubuntu 24 LTS):
 *   - OpenRazer installed (provides kernel driver)
 *   - udev rule for HID access:
 *     SUBSYSTEM=="usb", ATTR{idVendor}=="1532", ATTR{idProduct}=="0f43", MODE="0666"
 *   - Or run with sudo
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RazerCoolingPad } from "./razer-hid.js";
import {
  COLOR,
  EMOTION_PATTERNS,
  AGENT_STATE_PATTERNS,
  WORKLOAD_PATTERNS,
  SMART_FAN_CURVES,
  interpolateFanCurve,
  progressBar,
  levelMeter,
  rainbow,
  chaser,
  split,
  temperatureHeatmap,
} from "./patterns.js";
import type { RGB, Emotion, AgentState, WorkloadLevel, EffectName } from "./types.js";
import { NUM_LEDS } from "./types.js";

// ─── Device Singleton ────────────────────────────────────────────

let device: RazerCoolingPad | null = null;

function getDevice(): RazerCoolingPad {
  if (!device || !device.isOpen) {
    device = new RazerCoolingPad();
    device.open();
  }
  return device;
}

function tryClose(): void {
  device?.close();
  device = null;
}

// ─── Helper ──────────────────────────────────────────────────────

function parseColor(color: string): RGB {
  // Accept hex (#ff0000), named colors, or r,g,b
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  const upper = color.toUpperCase().replace(/\s/g, "_");
  if (upper in COLOR) return COLOR[upper as keyof typeof COLOR];
  const parts = color.split(",").map((s) => parseInt(s.trim()));
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
    return { r: parts[0]!, g: parts[1]!, b: parts[2]! };
  }
  throw new Error(
    `Invalid color: "${color}". Use hex (#ff0000), name (red), or r,g,b (255,0,0)`,
  );
}

function ok(message: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: message }] };
}

// ─── MCP Server ──────────────────────────────────────────────────

const server = new McpServer({
  name: "razer-cooling-pad",
  version: "0.1.0",
});

// ── Tool: set_fan_speed ──────────────────────────────────────────

server.tool(
  "set_fan_speed",
  "Set the cooling pad fan speed as a percentage (0-100). 0=off, 22=low, 44=medium, 64=high, 100=max.",
  { percent: z.number().min(0).max(100).describe("Fan speed percentage") },
  async ({ percent }) => {
    const dev = getDevice();
    const success = await dev.setFanSpeed(percent);
    const rpm = RazerCoolingPad.percentToRpm(percent);
    return ok(
      success
        ? `Fan speed set to ${percent}% (~${rpm} RPM)`
        : "Failed to set fan speed",
    );
  },
);

// ── Tool: get_fan_speed ──────────────────────────────────────────

server.tool(
  "get_fan_speed",
  "Read the current fan speed percentage from the cooling pad.",
  {},
  async () => {
    const dev = getDevice();
    const speed = await dev.getFanSpeed();
    return ok(speed !== null ? `Fan speed: ${speed}%` : "Could not read fan speed");
  },
);

// ── Tool: set_led_effect ─────────────────────────────────────────

server.tool(
  "set_led_effect",
  "Set the LED lighting effect. Effects: OFF, STATIC, BREATHING, WAVE, SPECTRUM, CUSTOM_FRAME.",
  {
    effect: z.enum(["OFF", "STATIC", "BREATHING", "WAVE", "SPECTRUM", "CUSTOM_FRAME"]).describe("Effect name"),
    color: z.string().optional().describe("Color for static/breathing (hex #ff0000, name, or r,g,b)"),
    direction: z.enum(["left", "right"]).optional().describe("Wave direction"),
  },
  async ({ effect, color, direction }) => {
    const dev = getDevice();
    const options: { color?: RGB; direction?: 1 | 2 } = {};
    if (color) options.color = parseColor(color);
    if (direction) options.direction = direction === "left" ? 1 : 2;
    const success = await dev.setEffect(effect as EffectName, options);
    return ok(success ? `Effect set to ${effect}` : "Failed to set effect");
  },
);

// ── Tool: set_led_color ──────────────────────────────────────────

server.tool(
  "set_led_color",
  "Set all LEDs to a single static color.",
  {
    color: z.string().describe("Color: hex (#ff0000), name (red, green, blue, cyan, ...), or r,g,b (255,0,0)"),
  },
  async ({ color }) => {
    const dev = getDevice();
    const rgb = parseColor(color);
    await dev.setColor(rgb);
    await dev.setEffect("STATIC", { color: rgb });
    return ok(`Color set to rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
  },
);

// ── Tool: set_brightness ─────────────────────────────────────────

server.tool(
  "set_brightness",
  "Set LED brightness (0-100 percent, mapped to 0-255 internally).",
  {
    percent: z.number().min(0).max(100).describe("Brightness percentage"),
  },
  async ({ percent }) => {
    const dev = getDevice();
    const val = Math.round((percent / 100) * 255);
    const success = await dev.setBrightness(val);
    return ok(success ? `Brightness set to ${percent}%` : "Failed");
  },
);

// ── Tool: set_custom_leds ────────────────────────────────────────

server.tool(
  "set_custom_leds",
  "Set individual colors for each of the 18 LEDs. Provide an array of 18 color strings.",
  {
    colors: z.array(z.string()).length(18).describe("Array of 18 colors (hex, name, or r,g,b)"),
  },
  async ({ colors }) => {
    const dev = getDevice();
    const leds = colors.map(parseColor);
    const success = await dev.setCustomFrame(leds);
    return ok(success ? "Custom LED frame applied (18 LEDs)" : "Failed");
  },
);

// ── Tool: set_emotion ────────────────────────────────────────────

server.tool(
  "set_emotion",
  "Express an emotion through the cooling pad LEDs. Emotions: neutral, happy, excited, calm, focused, alert, error, sad, angry.",
  {
    emotion: z.enum(["neutral", "happy", "excited", "calm", "focused", "alert", "error", "sad", "angry"]).describe("Emotion to express"),
  },
  async ({ emotion }) => {
    const dev = getDevice();
    const pattern = EMOTION_PATTERNS[emotion as Emotion];
    await dev.setBrightness(pattern.brightness);
    await dev.setEffect(pattern.effect, { color: pattern.color });
    return ok(`Emotion "${emotion}": ${pattern.description}`);
  },
);

// ── Tool: set_agent_state ────────────────────────────────────────

server.tool(
  "set_agent_state",
  "Set the cooling pad to reflect an AI agent's current state. Adjusts both LEDs and fan. States: idle, thinking, acting, success, error, waiting, listening, speaking.",
  {
    state: z.enum(["idle", "thinking", "acting", "success", "error", "waiting", "listening", "speaking"]).describe("Agent state"),
  },
  async ({ state }) => {
    const dev = getDevice();
    const pattern = AGENT_STATE_PATTERNS[state as AgentState];
    await dev.setFanSpeed(pattern.fanPercent);
    await dev.setBrightness(pattern.brightness);
    await dev.setEffect(pattern.effect, { color: pattern.color });
    return ok(
      `Agent state "${state}": ${pattern.description} (fan: ${pattern.fanPercent}%)`,
    );
  },
);

// ── Tool: set_workload ───────────────────────────────────────────

server.tool(
  "set_workload",
  "Adjust fan and LEDs based on workload level. Levels: idle, light, moderate, heavy, critical.",
  {
    level: z.enum(["idle", "light", "moderate", "heavy", "critical"]).describe("Workload level"),
  },
  async ({ level }) => {
    const dev = getDevice();
    const pattern = WORKLOAD_PATTERNS[level as WorkloadLevel];
    await dev.setFanSpeed(pattern.fanPercent);
    await dev.setEffect("STATIC", { color: pattern.ledColor });
    return ok(
      `Workload "${level}": fan ${pattern.fanPercent}%, ${pattern.description}`,
    );
  },
);

// ── Tool: show_progress ──────────────────────────────────────────

server.tool(
  "show_progress",
  "Display a progress bar on the 18 LEDs (0-100%). Useful for visualizing task completion.",
  {
    percent: z.number().min(0).max(100).describe("Progress percentage"),
    color: z.string().optional().describe("Fill color (default: Razer green)"),
  },
  async ({ percent, color }) => {
    const dev = getDevice();
    const fillColor = color ? parseColor(color) : COLOR.RAZER_GREEN;
    const leds = progressBar(percent, fillColor);
    await dev.setCustomFrame(leds);
    const filled = Math.round((percent / 100) * NUM_LEDS);
    return ok(`Progress: ${percent}% (${filled}/${NUM_LEDS} LEDs lit)`);
  },
);

// ── Tool: show_level_meter ───────────────────────────────────────

server.tool(
  "show_level_meter",
  "Display a VU-meter style level indicator (green→yellow→red). Great for CPU/GPU load visualization.",
  {
    percent: z.number().min(0).max(100).describe("Level percentage"),
  },
  async ({ percent }) => {
    const dev = getDevice();
    const leds = levelMeter(percent);
    await dev.setCustomFrame(leds);
    return ok(`Level meter: ${percent}%`);
  },
);

// ── Tool: show_temperature ───────────────────────────────────────

server.tool(
  "show_temperature",
  "Visualize a temperature on the LEDs (blue=cold, green=warm, red=hot) and optionally adjust fan using smart curves.",
  {
    celsius: z.number().describe("Temperature in Celsius"),
    source: z.enum(["cpu", "gpu"]).optional().describe("Temperature source for smart fan curve"),
    profile: z.enum(["quiet", "balanced", "performance"]).optional().describe("Fan curve profile"),
    adjust_fan: z.boolean().optional().describe("Also adjust fan speed based on temperature curve"),
  },
  async ({ celsius, source, profile, adjust_fan }) => {
    const dev = getDevice();
    const leds = temperatureHeatmap(celsius);
    await dev.setCustomFrame(leds);

    let fanMsg = "";
    if (adjust_fan && source && profile) {
      const curve = SMART_FAN_CURVES[source][profile];
      const fanPercent = interpolateFanCurve(curve, celsius);
      await dev.setFanSpeed(fanPercent);
      fanMsg = `, fan: ${fanPercent}%`;
    }

    return ok(`Temperature: ${celsius}°C${fanMsg}`);
  },
);

// ── Tool: show_rainbow ───────────────────────────────────────────

server.tool(
  "show_rainbow",
  "Display a rainbow pattern across all 18 LEDs.",
  {
    offset: z.number().optional().describe("Hue offset in degrees (0-360)"),
  },
  async ({ offset }) => {
    const dev = getDevice();
    const leds = rainbow(offset ?? 0);
    await dev.setCustomFrame(leds);
    return ok("Rainbow pattern applied");
  },
);

// ── Tool: show_split ─────────────────────────────────────────────

server.tool(
  "show_split",
  "Split the LEDs into two halves with different colors. Useful for showing two states at once.",
  {
    left_color: z.string().describe("Color for left half"),
    right_color: z.string().describe("Color for right half"),
  },
  async ({ left_color, right_color }) => {
    const dev = getDevice();
    const leds = split(parseColor(left_color), parseColor(right_color));
    await dev.setCustomFrame(leds);
    return ok("Split pattern applied");
  },
);

// ── Tool: set_gradient ───────────────────────────────────────────

server.tool(
  "set_gradient",
  "Display a smooth color gradient across all 18 LEDs from one color to another.",
  {
    from_color: z.string().describe("Start color"),
    to_color: z.string().describe("End color"),
  },
  async ({ from_color, to_color }) => {
    const dev = getDevice();
    await dev.setGradient(parseColor(from_color), parseColor(to_color));
    return ok("Gradient applied");
  },
);

// ── Tool: get_device_info ────────────────────────────────────────

server.tool(
  "get_device_info",
  "Get cooling pad device information (firmware version, serial number, device mode).",
  {},
  async () => {
    const dev = getDevice();
    const info = await dev.getDeviceInfo();
    return ok(JSON.stringify(info, null, 2));
  },
);

// ── Tool: get_patterns_info ──────────────────────────────────────

server.tool(
  "get_patterns_info",
  "List all available emotion, agent state, and workload patterns with descriptions.",
  {},
  async () => {
    const emotions = Object.entries(EMOTION_PATTERNS)
      .map(([k, v]) => `  ${k}: ${v.description}`)
      .join("\n");
    const states = Object.entries(AGENT_STATE_PATTERNS)
      .map(([k, v]) => `  ${k}: ${v.description} (fan: ${v.fanPercent}%)`)
      .join("\n");
    const workloads = Object.entries(WORKLOAD_PATTERNS)
      .map(([k, v]) => `  ${k}: fan ${v.fanPercent}%, ${v.description}`)
      .join("\n");

    return ok(
      `Emotions:\n${emotions}\n\nAgent States:\n${states}\n\nWorkload Levels:\n${workloads}`,
    );
  },
);

// ── Resources ────────────────────────────────────────────────────

server.resource(
  "device-info",
  "razer://cooling-pad/info",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: "Razer Laptop Cooling Pad",
        vid: "0x1532",
        pid: "0x0F43",
        leds: 18,
        matrix: "1x18",
        fan_range_percent: "0-100",
        fan_range_rpm: "500-3200",
        effects: ["OFF", "STATIC", "BREATHING", "WAVE", "SPECTRUM", "CUSTOM_FRAME"],
        protocol: "Razer HID Protocol (90-byte Feature Reports)",
      }, null, 2),
    }],
  }),
);

server.resource(
  "protocol-reference",
  "razer://cooling-pad/protocol",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: [
        "# Razer Cooling Pad HID Protocol Quick Reference",
        "",
        "## Packet Structure (90 bytes)",
        "[status][TID=0x1F][remaining(2)][proto][data_size][cmd_class][cmd_id][args(80)][crc][reserved]",
        "",
        "## Commands",
        "| Class | Cmd  | Name              | Args                          |",
        "|-------|------|-------------------|-------------------------------|",
        "| 0x00  | 0x81 | Get Firmware      | -                             |",
        "| 0x00  | 0x82 | Get Serial        | -                             |",
        "| 0x00  | 0x84 | Get Device Mode   | -                             |",
        "| 0x03  | 0x0A | Apply Frame       | [0x05]                        |",
        "| 0x03  | 0x0B | Set Custom Frame  | [row,row,col0,col17,R,G,B...] |",
        "| 0x0D  | 0x01 | Set Fan Speed     | [0x01, 0x05, speed%]          |",
        "| 0x0D  | 0x81 | Get Fan Speed     | [0x01, 0x05, 0x00]            |",
        "| 0x0F  | 0x02 | Set LED Effect    | [store,led,effect,...]        |",
        "| 0x0F  | 0x03 | Set LED Color     | [0x01, 0x05, R, G, B]         |",
        "| 0x0F  | 0x04 | Set Brightness    | [0x01, 0x05, brightness]      |",
        "| 0x0F  | 0x84 | Get Brightness    | [0x01, 0x05]                  |",
        "",
        "## CRC: XOR of bytes [2..87]",
      ].join("\n"),
    }],
  }),
);

// ─── Start Server ────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("Razer Cooling Pad MCP server running on stdio\n");

  process.on("SIGINT", () => {
    tryClose();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    tryClose();
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
