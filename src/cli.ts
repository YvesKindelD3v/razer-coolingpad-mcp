#!/usr/bin/env tsx
/**
 * CLI for quick Razer Cooling Pad commands.
 *
 * Usage:
 *   node dist/cli.js state <idle|thinking|acting|speaking|...>
 *   node dist/cli.js emotion <happy|calm|error|...>
 *   node dist/cli.js fan <0-100>
 *   node dist/cli.js progress <0-100>
 *   node dist/cli.js color <hex|name>
 *   node dist/cli.js off
 *
 * Opens HID, sends command, closes immediately.
 * Designed to be called from other processes (e.g. Python bot via subprocess).
 */

import { RazerCoolingPad } from "./razer-hid.js";
import {
  AGENT_STATE_PATTERNS,
  EMOTION_PATTERNS,
  COLOR,
  progressBar,
  levelMeter,
} from "./patterns.js";
import type { AgentState, Emotion, EffectName } from "./types.js";

function parseColor(color: string): { r: number; g: number; b: number } {
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
  return { r: 255, g: 255, b: 255 };
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    process.stderr.write("Usage: cli.js <state|emotion|fan|progress|color|off> <value>\n");
    process.exit(1);
  }

  const dev = new RazerCoolingPad();
  dev.open();

  try {
    switch (cmd) {
      case "state": {
        const state = args[0] as AgentState;
        const p = AGENT_STATE_PATTERNS[state];
        if (!p) { process.stderr.write(`Unknown state: ${state}\n`); process.exit(1); }
        await dev.setFanSpeed(p.fanPercent);
        await dev.setBrightness(p.brightness);
        await dev.setEffect(p.effect, { color: p.color });
        process.stdout.write(`${state}\n`);
        break;
      }
      case "emotion": {
        const emotion = args[0] as Emotion;
        const p = EMOTION_PATTERNS[emotion];
        if (!p) { process.stderr.write(`Unknown emotion: ${emotion}\n`); process.exit(1); }
        await dev.setBrightness(p.brightness);
        await dev.setEffect(p.effect, { color: p.color });
        process.stdout.write(`${emotion}\n`);
        break;
      }
      case "fan": {
        const pct = parseInt(args[0] ?? "30");
        await dev.setFanSpeed(pct);
        process.stdout.write(`fan:${pct}\n`);
        break;
      }
      case "progress": {
        const pct = parseInt(args[0] ?? "50");
        await dev.setCustomFrame(progressBar(pct));
        process.stdout.write(`progress:${pct}\n`);
        break;
      }
      case "level": {
        const pct = parseInt(args[0] ?? "50");
        await dev.setCustomFrame(levelMeter(pct));
        process.stdout.write(`level:${pct}\n`);
        break;
      }
      case "color": {
        const rgb = parseColor(args[0] ?? "#00ff44");
        await dev.setColor(rgb);
        await dev.setEffect("STATIC", { color: rgb });
        process.stdout.write(`color:${args[0]}\n`);
        break;
      }
      case "off":
        await dev.setEffect("OFF");
        await dev.setFanSpeed(0);
        process.stdout.write("off\n");
        break;
      default:
        process.stderr.write(`Unknown command: ${cmd}\n`);
        process.exit(1);
    }
  } finally {
    dev.close();
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err}\n`);
  process.exit(1);
});
