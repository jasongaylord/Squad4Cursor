# hello-squad

Minimal consumer fixture for Squad4Cursor smoke tests.

## Setup

From the Squad4Cursor repo root:

```bash
npm install
npm run build
node packages/cli/dist/cli-entry.js init --preset default --path samples/hello-squad
node packages/cli/dist/cli-entry.js doctor --path samples/hello-squad
```

Or with a linked CLI:

```bash
cd samples/hello-squad
s4c init --preset default
s4c doctor
```

Then open this folder in Cursor and try `/squad-status` or ask the team for a status report.
