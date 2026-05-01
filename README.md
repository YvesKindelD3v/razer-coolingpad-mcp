# razer-coolingpad-mcp

> **Give your AI agent a physical presence.**  
> Emotions, states, and workflows — expressed through light and motion.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/Protocol-MCP-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org)

---

## The Idea

Your agent thinks, decides, acts — but it's invisible. A blinking cursor. A loading spinner. You have no idea what's happening unless you read the logs.

This changes that.

With a Razer Laptop Cooling Pad and this MCP server, your agent gets a **physical signal channel**:

- **Emotions** — calm blue breathing when idle, excited yellow wave when something good happens, red when it fails
- **States** — cyan wave while thinking, green while executing, amber while waiting for you
- **Workload** — fan speed rises with compute load, LEDs shift from blue to orange to red
- **Progress** — 18 LEDs light up one by one as a task completes
- **Temperature** — real-time heatmap that tells you if your GPU is cooking

It's not a gimmick. It's **ambient awareness**. You glance at the pad and know what your agent is doing — without context-switching to a terminal.

## Who This Is For

- **Agent engineers** building local AI systems (Claude Code, OpenClaw, custom MCP clients)
- **Developers** who run long-running tasks and want physical feedback
- **Anyone** who believes agents deserve more than a blinking cursor

## How It Works

This is an [MCP server](https://modelcontextprotocol.io) — the standard protocol for connecting AI models to external tools. Any MCP-compatible client can use it.

```
┌──────────────┐     stdio/MCP     ┌──────────────────┐     USB HID     ┌─────────────┐
│  Your Agent  │ ◄──────────────► │  razer-coolingpad │ ◄──────────────► │  Cooling Pad │
│ (Claude, etc)│                   │     MCP Server    │                  │  (RC30-0488) │
└──────────────┘                   └──────────────────┘                   └─────────────┘
```

The agent calls tools like `set_emotion("focused")` or `set_agent_state("thinking")` — the server translates that into LED patterns and fan speeds via USB HID.

## Quick Start

### Prerequisites

- Linux with Node.js 18+
- Razer Laptop Cooling Pad connected via USB
- [udev rules configured](https://github.com/YvesKindelD3v/razer-coolingpad-linux#usb-permissions-udev) for non-root HID access

### Install

```bash
git clone https://github.com/YvesKindelD3v/razer-coolingpad-mcp.git
cd razer-coolingpad-mcp
npm install
npm run build
```

### Connect to Claude Code

Add to your Claude Code MCP config (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "razer-cooling-pad": {
      "command": "node",
      "args": ["/path/to/razer-coolingpad-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Code. Your agent now has 17 new tools for physical expression.

### Connect to Any MCP Client

```bash
node dist/index.js
```

The server communicates over stdio using the MCP protocol. Pipe it into any MCP-compatible client.

## Available Tools

### Semantic (high-level — the ones agents should use)

| Tool | What It Does |
|------|-------------|
| `set_emotion` | Express emotion: `happy`, `calm`, `focused`, `alert`, `error`, `sad`, `angry`, `excited`, `neutral` |
| `set_agent_state` | Signal state: `idle`, `thinking`, `acting`, `success`, `error`, `waiting`, `listening`, `speaking` |
| `set_workload` | Adapt to load: `idle`, `light`, `moderate`, `heavy`, `critical` |
| `show_progress` | Progress bar (0–100%) across 18 LEDs |
| `show_temperature` | Heatmap + optional smart fan control |
| `show_level_meter` | VU-meter (green → yellow → red) |

### Visual (direct LED control)

| Tool | What It Does |
|------|-------------|
| `set_led_effect` | Raw effect: `static`, `breathing`, `wave`, `spectrum`, `off` |
| `set_led_color` | Single color for all LEDs |
| `set_custom_leds` | Individual color per LED (18 RGB values) |
| `set_brightness` | LED brightness (0–100%) |
| `set_gradient` | Smooth gradient between two colors |
| `show_rainbow` | Rainbow across 18 LEDs |
| `show_split` | Two colors, left/right halves |

### Hardware

| Tool | What It Does |
|------|-------------|
| `set_fan_speed` | Fan 0–100% (500–3200 RPM) |
| `get_fan_speed` | Read current speed |
| `get_device_info` | Firmware, serial, device mode |
| `get_patterns_info` | List all available patterns |

## Emotion Patterns

When your agent calls `set_emotion("focused")`, this happens:

| Emotion | LED Effect | Color | Brightness |
|---------|-----------|-------|------------|
| `neutral` | Spectrum cycling | — | 50% |
| `happy` | Static | Green | 100% |
| `excited` | Wave | Yellow | 100% |
| `calm` | Breathing | Blue | 70% |
| `focused` | Static | Cyan | 78% |
| `alert` | Breathing | Amber | 100% |
| `error` | Static | Red | 100% |
| `sad` | Breathing | Purple | 39% |
| `angry` | Wave | Red | 100% |

## Agent State Patterns

States combine LED feedback with automatic fan control:

| State | LED | Fan | Meaning |
|-------|-----|-----|---------|
| `idle` | Blue breathing | 20% | Standing by |
| `thinking` | Cyan wave | 40% | Processing |
| `acting` | Green static | 60% | Executing |
| `success` | Bright green | 30% | Done |
| `error` | Red static | 30% | Failed |
| `waiting` | Amber breathing | 25% | Needs input |
| `listening` | Blue pulse | 25% | Receiving |
| `speaking` | Green wave | 35% | Generating |

## Workflow Example

Here's how an agent might use this during a build task:

```typescript
// Agent starts working
await mcp.call("set_agent_state", { state: "thinking" });
// Cyan wave, fan at 40%

// Running a heavy compile
await mcp.call("set_workload", { level: "heavy" });
// Fan at 75%, LEDs orange

// Showing progress
for (let i = 0; i <= 100; i += 10) {
  await mcp.call("show_progress", { percent: i });
  await sleep(1000);
}

// Build succeeded
await mcp.call("set_emotion", { emotion: "happy" });
// Bright green, full brightness

// Back to idle
await mcp.call("set_agent_state", { state: "idle" });
// Gentle blue pulse, fan quiet
```

## Architecture

```
src/
├── index.ts        # MCP server — tool definitions and routing
├── razer-hid.ts    # USB HID protocol implementation
├── patterns.ts     # Emotion, state, and workload → LED/fan mappings
├── types.ts        # Constants, interfaces, protocol definitions
└── cli.ts          # Standalone CLI for testing without MCP

examples/
├── claude-code.md  # Integration guide for Claude Code
└── workflow.ts     # Example: agent workflow with pad feedback
```

## Building from Source

```bash
npm install
npm run build          # TypeScript → dist/
npm run dev            # Development with tsx (hot reload)
npm run test:device    # Quick hardware connectivity test
```

## Requirements

- **Hardware**: Razer Laptop Cooling Pad (RC30-0488, PID `0x0F43`)
- **OS**: Linux (tested on Ubuntu 24.04)
- **Runtime**: Node.js 18+
- **Driver**: Depends on [razer-coolingpad-linux](https://github.com/YvesKindelD3v/razer-coolingpad-linux) for HID protocol layer

## Related

- **[razer-coolingpad-linux](https://github.com/YvesKindelD3v/razer-coolingpad-linux)** — The underlying Linux driver (pure HID, no MCP dependency)
- **[Model Context Protocol](https://modelcontextprotocol.io)** — The protocol standard this server implements
- **[OpenRazer](https://github.com/openrazer/openrazer)** — Linux kernel driver for Razer devices (doesn't support this pad yet)

## License

[MIT](LICENSE) — Yves Kindel
