# Contributing

Contributions welcome — especially from other agent engineers who want to extend the physical feedback vocabulary.

## Getting Started

1. Fork and clone
2. `npm install`
3. Connect Razer Laptop Cooling Pad via USB
4. Set up [udev rules](https://github.com/YvesKindelD3v/razer-coolingpad-linux#usb-permissions-udev)
5. `npm run dev` — starts MCP server in development mode

## Development

```bash
npm run dev          # Hot-reload development server
npm run build        # Compile TypeScript → dist/
npm run test:device  # Quick hardware connectivity check
```

## Architecture

```
src/
├── index.ts       # MCP tool definitions and routing
├── razer-hid.ts   # HID protocol layer (packet builder, device class)
├── patterns.ts    # Semantic mappings (emotions → LED, states → fan+LED)
├── types.ts       # Protocol constants and TypeScript types
└── cli.ts         # Standalone CLI for testing
```

### Adding a New Emotion

1. Define the pattern in `src/patterns.ts` under `EMOTION_PATTERNS`
2. Add the type to `Emotion` in `src/types.ts`
3. The MCP tool picks it up automatically via the zod enum

### Adding a New Visualization

1. Create a function in `src/patterns.ts` that returns `RGB[]` (18 elements)
2. Register a new MCP tool in `src/index.ts`
3. Document it in the README

## Ideas for Contributions

- **New emotions** — anticipation, surprise, boredom, confusion
- **Animations** — time-based patterns (breathing speed, wave speed as parameters)
- **Multi-agent** — split the 18 LEDs between multiple agents
- **Sound reactive** — VU meter from microphone input
- **System metrics** — CPU/GPU/RAM as real-time visualizations
- **macOS support** — test and document HID access on macOS

## Commit Messages

Conventional commits:

```
feat: add anticipation emotion pattern
fix: correct wave direction mapping
docs: add OpenClaw integration example
```

## Code Style

- TypeScript (strict mode)
- ESM modules
- No classes where functions suffice
- Keep patterns declarative — data, not logic

## License

By contributing, you agree that your contributions will be licensed under MIT.
