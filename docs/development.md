# Developing Codemark

## Repository layout

| Path | What |
|---|---|
| `packages/lib/shared` | checker, ENSv2 addresses/ABIs/reads, record codec, calldata decoding, Arkiv row types. Runs in browser and Snap |
| `packages/cli` | publisher tool; the only place that signs ENS or Arkiv transactions |
| `packages/snap` | MetaMask Snap (`onTransaction`, `onSignature`) |
| `packages/mcp` | MCP server for agents: read-only, holds no keys, returns proceed, ask_user or refuse |
| `packages/web` | landing page at `/`, lookup site under `/app`, demo with sample contracts and a 7702 wallet under `/demo` (Vite, React) |
| `packages/demo` | Anvil fork, seed and attack scripts, live-run script. Nothing here ships |
| `arkiv/` | How Codemark uses Arkiv: schema, why Arkiv, friction and reach |
| `.github/actions/codemark-publish` | composite GitHub Action wrapping `publish` |

## Run it

Prerequisites: [Bun](https://bun.sh) 1.4.2 or newer, and [Foundry](https://getfoundry.sh) (for `anvil`). Run everything below from `packages/`.

```sh
cd packages
bun install
```

## Demo fork

```sh
bun run demo:fork      # Anvil forking Sepolia on :8545
bun run demo:seed      # second shell; about a minute; builds pwnmeswap.eth and three releases
bun run demo:attack    # same fork; publishes five forged releases the checker must report as MISMATCH
bun run --cwd demo warp   # optional: move fork time forward (default 24 h) for the delegate age rule
bun run --cwd demo abi:check   # check the ABIs against live Sepolia
```

`demo:seed` writes `packages/demo/state/seed.json`. See `packages/demo/CONTEXT.md` for its env variables. Arkiv rows are only written if `SEED_ARKIV=1` is set.

## Tests

```sh
bun tests              # shared, cli, mcp, web and Snap tests
bun run --cwd demo tests   # spikes; starts its own Anvil on :18545
bun fmt-lint && bun typecheck
```

Most tests need nothing but Bun, and the Snap's also need Node: calldata decoding, record and name parsing, row validation, severity, checker limits, the CLI operations, and the plain-language verdicts (`packages/lib/shared/tests/explain.test.ts` walks every combination of verdict, role, pin, proof and age and checks that nothing unsafe ever reads as verified). The checker's end-to-end tests run against an Anvil fork of Sepolia rather than mocks, because the deployed contracts differ from the repository head; they skip themselves when no fork is running. `deployment.live.test.ts` and `check.live.test.ts` read live Sepolia and are skipped with `CODEMARK_LIVE_TESTS=0`.

CI (`.github/workflows/ci.yml`) runs on every push: the typecheck, lint and all offline tests in one job, and the live Sepolia tests in another, including the check that the canonical Universal Resolver still reads the deployment above. It needs no secrets.

## Web

```sh
bun web:dev            # http://localhost:3020
bun web:build
```

The site is static: it reads Sepolia and Arkiv straight from the browser, so any static host works. Serve `index.html` for every path under `/app` and `/demo` so the client-side routes load. The demo reads live Sepolia, trusts its sample team only inside the demo, and leaves your pins alone. Its account-upgrade page signs with a throwaway key made in the browser and never sends the upgrade, so it needs no gas or server. That page accepts a release after 1 hour so the whole flow can be shown, and says so; real checks wait 1 day.

The site keeps working when an RPC rate limits or goes down. It tries `VITE_SEPOLIA_RPC_URL` first if you set one, then several public Sepolia RPCs in a random order per visitor, and it reruns a check that couldn't finish. With `VITE_ARKIV_ACCESS_KEY` set, it falls back to Arkiv's public endpoint if the key stops working. Both values are public in the built site, so restrict them to your domain where the provider allows it.

## Snap in MetaMask Flask

The Snap needs [MetaMask Flask](https://metamask.io/flask/), the developer build, because network access for Snaps is only allowed for allowlisted Snaps in stable MetaMask. The site installs the published `npm:@marsian/codemark-snap`. To develop against a local Snap, set `VITE_SNAP_ID=local:http://localhost:8080`.

1. `bun snap:build`. Only https://codemark.hetairoi.xyz and http://localhost:3020 may pin publishers in the Snap; set `CODEMARK_SITE_ORIGIN` to allow one more origin.
2. `bun snap:serve` serves the Snap on http://localhost:8080.
3. In Flask, install it from the local site, then sign a transaction. The Snap decodes the call, checks the targets and shows the verdict.

MetaMask runs Snaps under SES lockdown, which freezes built-ins, so code can pass every plain test and still fail inside the wallet. `bun run --cwd snap tests` builds the Snap and runs the bundle under real lockdown with Node. It caught a bug in viem 2.54 and later, which is why viem is pinned and patched (`packages/patches/viem@2.57.16.patch`). Check that patch before you upgrade viem.

To release a new version, bump `version` in `packages/snap/package.json`, run `bun snap:build` and `bun run --cwd snap manifest` so the manifest checksum matches, then `bun publish` from `packages/snap`.

To release the CLI or the MCP server to npm, run `bun run --cwd cli build` or `bun run --cwd mcp build`, then `bun publish` from `packages/cli/npm` or `packages/mcp/npm`.
