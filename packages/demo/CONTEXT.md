# demo

Everything the demo needs that is not product code. Nothing here ships.

## Run the seeded fork

```
cd packages
bun run demo:fork              # Anvil on :8545 forking Sepolia (latest, or FORK_BLOCK), chain id 11155111
bun run demo:seed              # in a second shell; ~1 min; writes demo/state/seed.json
```

Anvil is taken from `ANVIL_BIN` (default `~/.foundry/bin/anvil`). The public RPC is not an archive node: a fork pinned to a block older than about an hour cannot read any state it has not cached yet, so `FORK_BLOCK` is only safe with an archive `SEPOLIA_RPC_URL`; by default the fork starts at the latest block and `seed.json` records it. Seed against a fresh fork each time (`pwnmeswap` must be available); `bun scripts/seed.ts <label>` seeds another name on the same fork. Env (all optional): `ANVIL_RPC_URL`, `SEPOLIA_RPC_URL`, `FORK_BLOCK`, `CODEMARK_{ROOT,SEC,CI}_KEY` (default: keys derived from `keccak("codemark-demo-<role>")`, because Anvil's default accounts carry 7702 code on Sepolia and cannot receive ERC-1155 tokens), `SEED_ARKIV=1` with `ARKIV_ACCESS_KEY` to also write Arkiv rows (off by default so fork releases never reach the public index).

Seed builds `pwnmeswap.eth` with the CLI's own functions (`cli/ops/*`): a 1-of-1 root Safe owned by the root key, publisher resolver and `PubRegistry`, `ci-1` (CI key holds `ROLE_REGISTRAR`) and `delegates` (root only) key registries, and three releases, each with its forward name `a-<12 hex>` on the same resolver:

- `router-3-1-0.ci-1` → Uniswap SwapRouter02 on Sepolia (plain contract).
- `portal-2-0-0.ci-1` → OP Sepolia `OptimismPortal` EIP-1967 proxy, record carries `i`/`ih`.
- `delegate-1-0-0.delegates` → MetaMask `EIP7702StatelessDeleGator` (stock 7702 delegate), published by root.

## seed.json

Top-level keys: `chainId`, `rpcUrl`, `forkBlock`, `seededAtBlock`, `deployment` (addresses.ts), `accounts` (`root` = the Safe, `owner` = its owner EOA, `sec`, `ci`), `publisher` (init result: `name`, `pubRegistry`, `resolver`, `tokenId`, blocks, `txs`), `keys` (`ci-1`, `delegates`: `keyRegistry`, `tokenId`, `regBlock`, `linkBlock`, `expiry`, `txs`), `releases` (`router`, `portal`, `delegate`: `name`, `label`, `labelhash`, `forwardLabel`, `forwardName`, `artifact`, `record`, `recordFields`, `keyRegistry`, `resolver`, `resolverBlock`, `regBlock`, `forwardRegBlock`, `tokenId`, `forwardTokenId`, `expiry`, `txs`), `targets`. Bigints are decimal strings.

The release and forward registrations are mined in one block (`regBlock == forwardRegBlock`) so one Arkiv `regBlock` covers both names. On the fork this uses `evm_setAutomine(false)`; on Sepolia the CLI sends both with consecutive nonces and they usually, not always, share a block.

## Live Sepolia

`bun run live --check` (from `demo/`, reads `codemark/.env`) prints each key's balance against the gas measured on a fork (2x, at least 1 gwei) and whether the label is free; it sends nothing. `bun run live [label]` then deploys the Safe (writing `CODEMARK_SAFE` to `.env`), registers `<label>.eth`, mounts `ci-1` and `delegates`, and publishes router, portal and delegate, saving each step to `state/live.json` so a re-run resumes. Pointed at an Anvil fork (`SEPOLIA_RPC_URL=http://127.0.0.1:8549`) it warps time for the commitment and writes `state/live.fork.json` instead.

## Other scripts

- `tests/spikes.test.ts` (`bun test` in `demo/`): plan spikes 1 and 2. It starts its own Anvil on port 18545 (`SPIKE_PORT`) and stops it afterwards, so it never touches the seeded fork; `SPIKE_RPC_URL` points it at an existing fork instead (it then snapshots and reverts). Skips if Anvil cannot start.
- `scripts/attack.ts` (after seed, same fork): publishes five releases under `ci-1` that the checker must call MISMATCH and writes `state/attack.json` (`forkBlock`, `attackedAtBlock`, `publisher`, `key`, `keyRegistry`, `cases.{fakeResolver, grantWriteRevoke, upgradeAndRestore, forgedImplementationSlot, codehashMismatch}`, each `name`, `label`, `target`, `record`, `resolver`, `resolverBlock`, `regBlock`, `expected`, `why`, `txs`, or `error` if that case could not be built). Only the version name is registered for these: their forward names collide with the seeded releases of the same artifacts. `forgedImplementationSlot` rewrites the EIP-1967 slot of the OP Sepolia `SystemConfig` proxy on the fork.
- `scripts/genAbi.ts` regenerates `lib/shared/ens/abi.generated.ts` from the vendored deployment artifacts; `scripts/abiCheck.ts` calls view functions on live Sepolia.
- `STATE_DIR` redirects `seed.json`/`attack.json` (round-2 work used `state/r2` on port 8549 so the :8545 fork other agents test against stays untouched).
- `warp.ts` moves fork time forward (default 24 h) for the delegate age rule.
