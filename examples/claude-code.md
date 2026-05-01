# Integration: Claude Code

Connect the Razer Cooling Pad MCP server to Claude Code so your AI agent can physically express itself.

## Setup

### 1. Build the server

```bash
cd razer-coolingpad-mcp
npm install
npm run build
```

### 2. Add to Claude Code settings

Open `~/.claude/settings.json` and add under `mcpServers`:

```json
{
  "mcpServers": {
    "razer-cooling-pad": {
      "command": "node",
      "args": ["/absolute/path/to/razer-coolingpad-mcp/dist/index.js"]
    }
  }
}
```

### 3. Restart Claude Code

The agent now has 17 new tools available. It can call them naturally:

```
"Set my emotion to focused"     → set_emotion({emotion: "focused"})
"I'm thinking about this..."    → set_agent_state({state: "thinking"})
"Show me GPU temperature"       → show_temperature({celsius: 72, source: "gpu"})
```

## Usage in CLAUDE.md

You can instruct your agent to use the pad in your project's `CLAUDE.md`:

```markdown
## Cooling Pad Integration

When working on this project:
- Set state to "thinking" before complex analysis
- Set state to "acting" during file writes
- Show progress during multi-step tasks
- Set emotion "happy" on successful test runs
- Set emotion "error" on failures
- Use workload levels during heavy compilation
```

## Example: Autonomous Behavior

A more advanced pattern — let the agent decide when to use the pad:

```markdown
## Agent Presence

You have access to a physical cooling pad (razer-cooling-pad MCP).
Use it naturally to express your current state:

- You're idle → gentle blue breathing
- You're analyzing → cyan wave
- Something went wrong → brief red flash, then back to work
- Task complete → green pulse

Don't announce what you're doing with the pad.
Just use it like a person uses facial expressions — automatically.
```

## Tips

- The pad responds in ~50ms — fast enough for real-time state tracking
- Fan speed adjusts automatically with `set_agent_state` — no manual tuning needed
- Custom frames (18 LEDs) can show progress bars, meters, or custom visualizations
- Brightness auto-adjusts with emotions — sad is dim, excited is bright
