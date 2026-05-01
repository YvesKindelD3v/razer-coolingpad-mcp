#!/usr/bin/env tsx
/**
 * Quick test: verify device communication works.
 * Run: npx tsx src/test-device.ts
 */

import { RazerCoolingPad } from "./razer-hid.js";
import { COLOR, progressBar, levelMeter, rainbow } from "./patterns.js";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dev = new RazerCoolingPad();

  console.log("Opening device...");
  dev.open();

  console.log("\n--- Device Info ---");
  const info = await dev.getDeviceInfo();
  console.log(`  Firmware: ${info.firmwareString}`);
  console.log(`  Serial:   ${info.serial}`);
  console.log(`  Mode:     ${info.deviceMode}`);

  console.log("\n--- Fan Test ---");
  console.log("  Setting fan to 50%...");
  await dev.setFanSpeed(50);
  await sleep(3000);

  console.log("  Setting fan to 25%...");
  await dev.setFanSpeed(25);
  await sleep(2000);

  console.log("\n--- LED Effect Test ---");
  console.log("  Static red...");
  await dev.setEffect("STATIC", { color: COLOR.RED });
  await sleep(2000);

  console.log("  Breathing blue...");
  await dev.setEffect("BREATHING", { color: COLOR.BLUE });
  await sleep(3000);

  console.log("  Wave left...");
  await dev.setEffect("WAVE", { direction: 1 });
  await sleep(3000);

  console.log("\n--- Custom Frame Test ---");
  console.log("  Progress bar 66%...");
  await dev.setCustomFrame(progressBar(66));
  await sleep(3000);

  console.log("  Level meter 80%...");
  await dev.setCustomFrame(levelMeter(80));
  await sleep(3000);

  console.log("  Rainbow...");
  await dev.setCustomFrame(rainbow());
  await sleep(3000);

  console.log("\n--- Restore ---");
  await dev.setEffect("SPECTRUM");
  await dev.setBrightness(255);
  await dev.setFanSpeed(22);

  dev.close();
  console.log("\nDone!");
}

main().catch(console.error);
