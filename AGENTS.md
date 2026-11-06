# Codemark

Release signing for contracts, frontends and account upgrades, built on ENSv2 (Sepolia) with Arkiv as the public index. See `README.md` for the product and `packages/lib/shared/check/CONTEXT.md` for the security boundary.

## Code comments and context files

- Write no code comments. If code needs a comment to be understood, it isn't self-documenting: rewrite it.
- A `CONTEXT.md` explains logic that is genuinely hard to follow from the code alone (a security boundary, a non-obvious workaround, a quirk of a deployed contract). Add one only for that, not for every folder. Read it before changing the files it covers, and update it when that logic changes.
- A `CONTEXT.h.md` is written by humans only. Never edit it, and treat its decisions as overriding everything else.

## Layout

`packages/` is the Bun workspace root. Every workspace is listed in `packages/package.json`, and shared dependency versions go in its `catalog`.

- `packages/lib/shared` (`@codemark/shared`): code that runs everywhere, including the browser and the Snap sandbox. ENSv2 addresses, ABIs and reads (`ens/`), the checker (`check/`), Arkiv row types (`arkiv/`), the record codec and name derivation. It must never import `bun`, `node:*`, the CLI or the demo; biome enforces it.
- `packages/cli` (`@codemark/cli`): the publisher's tool, run with Bun. `init`, `add-key`, `publish`, `cut`, `pull`, `verify`. The only place that signs ENS or Arkiv transactions.
- `packages/snap` (`@codemark/snap`): the MetaMask Snap. Built and served with `mm-snap`, not Vite. UI is `@metamask/snaps-sdk/jsx`, never React.
- `packages/mcp` (`@codemark/mcp`): the MCP server for agents, run with Bun. A read-only layer over the checker; it holds no keys and signs nothing.
- `packages/web` (`@codemark/web`): the landing page at `/` (`src/pages/landing`) and the app under `/app/*`: the lookup site and the account-upgrade demo page. Vite, React 19, Tailwind 4, react-router, react-query, Motion. Reads chain and Arkiv directly from the browser; there is no API server.
- `packages/demo` (`@codemark/demo`): Anvil fork, seed and attack scripts, fixtures. Nothing here ships.
- `arkiv/`: the files the Arkiv prize asks for, kept at the repository root.

Anything two workspaces use lives in `lib/shared`. Never copy code between workspaces: move it to `lib/shared` and import it from both.

## Rules

- Use `bun` for everything, never node, npm, npx or dotenv. Secrets come from the environment, parsed once with zod in each workspace's `env.ts`.
- `bun fmt-lint` (biome, tabs, double quotes) and `bun typecheck` from `packages/` must pass before a commit; husky runs biome on staged files.
- Tests are `bun test` files in a `tests/` folder next to the code. The checker's tests run against an Anvil fork, not mocks, because the deployed contracts differ from the repository head.
- Chain reads in the checker are pinned to one block number for the whole check.
- The checker never trusts an Arkiv row, a record value or a Snap RPC argument without the ENS steps in `check/CONTEXT.md`.
- No custom Solidity. Everything on chain is a stock ENSv2 `UserRegistry` or `PermissionedResolver` proxy deployed through `VerifiableFactory`.
