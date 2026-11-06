# Codemark

Before your wallet signs, Codemark checks that the contract or account upgrade in front of you was published by the team you think, and that the team has not withdrawn it.

In February 2025 Bybit's Safe signers approved a SafeTx that delegatecalled an attacker contract after the Safe{Wallet} frontend was replaced. On October 29, 2026 a Binance hot wallet was 7702-delegated to sweeper code. At signing time a wallet has 20 bytes and no answer to "who published this, and do they still stand behind it?"

Built at ETHGlobal Mumbai. ENSv2 on Sepolia holds the signing identity, Arkiv (testnet Rabdi) is the public index, and a MetaMask Snap shows the result at signing time.

Codemark answers "who published this", not "is it safe". It does not assess what code does.

## How it works

### The name tree

A publisher is an ENS name. Under it, each signing key gets its own registry (in ENSv2, a registry is a contract that holds the subnames of one name, so every name can have its own). Each release is a name inside a key's registry.

```
acmeswap.eth                    owned by the team Safe ("root"); text record codemark.keys = "ci-1,delegates"
└─ PubRegistry                  root: all roles. sec: may remove names
   ├─ ci-1  -> KeyRegistry      root: all roles. CI key: may add names. sec: may remove names
   │   ├─ router-3-1-0          resolver: address = router contract, text record "codemark"
   │   ├─ a-1f2e3d4c5b6a        forward name for the same artifact, same resolver
   │   └─ web-3-1-0             contenthash = IPFS CID of a frontend build
   └─ delegates -> KeyRegistry  only root may add names. sec: may remove names
       └─ delegate-1-0-0        address = an EIP-7702 delegate
```

A Safe is a multisig smart-contract wallet. Here it is the root and needs no custom contract. An EIP-7702 delegation lets an ordinary account point at contract code and run it, so a signature that sets a delegate can hand the account to whoever wrote that code. The `delegates` key exists so that code of that kind can only be published by root.

Everything on chain is stock ENSv2: registries are `UserRegistry` proxies and release resolvers are `PermissionedResolver` proxies. Both are deployed through `VerifiableFactory`, a CREATE2 factory (CREATE2 gives a contract an address derived from its deployer, salt and code) that can later confirm a given address is one of its proxies and which implementation it runs. ABIs come from contracts-v2 commit `07e55a05`, the source behind the Sepolia deployment. There is no Codemark Solidity.

Which deployment: Sepolia holds two ENSv2 deployments. Codemark uses the one the canonical Universal Resolver (`0xeEeE…EeEe`) reads: its `ROOT_REGISTRY()` is `0xb458…c43f`, whose `eth` subregistry is `0xd4eb…a8b4`. The code reads the root from the Universal Resolver on every check and stops if it changes (`packages/lib/shared/ens/deployment.ts`, asserted by `tests/deployment.live.test.ts`). The same deployment is shown by [explorer.ens.domains](https://explorer.ens.domains).

### What each signer can do

| Signer | Holds | Can | Cannot |
|---|---|---|---|
| root (team Safe) | every role on the publisher and key registries | create keys, publish delegates, pull, migrate | nothing is out of its reach; a stolen root is total, as with a stolen GitHub org |
| ci (release pipeline, hot key) | `ROLE_REGISTRAR` on one key registry | add release names | remove or overwrite names, publish delegates, change a release's records after publishing |
| sec (hardware key) | `ROLE_UNREGISTER` | cut a key, write incident rows | publish anything |

Roles come from ENSv2's access-control scheme (EAC): "may add" and "may remove" are separate permissions.

### Publish, pull, cut

- **Publish.** The CI key deploys one resolver for the release and registers two names for it, the version name and the forward name `a-<first 12 hex of keccak(artifact)>`. The resolver is created with its records and with setter roles for root only, so the CI key cannot change the records afterwards. The CI key also writes an Arkiv row.
- **Pull** withdraws one release. In one Safe batch, root unregisters both names of the release and reserves both labels again, so the CI key cannot simply re-register them. A reserved label can only be promoted by root, and a promoted label is marked and fails the check.
- **Cut** withdraws a key. The sec key unregisters the key's label in `PubRegistry` in one Sepolia transaction. Every release under that key stops resolving, because ENSv2 resolution walks registries from the root. An incident row on Arkiv records the reason. Root then runs `migrate` to mount a new key and republish the good releases.

### What the checker proves

The checker (`packages/lib/shared/check`) runs every read against one pinned Sepolia block. For an address it establishes, in order:

1. Candidate names. Either the publishers the user pinned (looked up directly in ENS, no index) or rows found in Arkiv by artifact.
2. Any Arkiv row counts only if its creator is the account that holds the registrar role on the named key registry in ENS, and that registry is the one the publisher's registry links today. Other rows are dropped.
3. The name is exactly `<label>.<key>.<publisher>`, the Universal Resolver resolves it with no inherited parent answer, and its address and `codemark` text record match the target. The target's code hash matches the recorded one, and for an EIP-1967 proxy so do the implementation slot and implementation code hash.
4. The records cannot have been changed by the CI key. The resolver must be a genuine `VerifiableFactory` proxy running `PermissionedResolverImpl`, its logs since creation must show no record, role or upgrade changes, and root must be the only holder of its roles. Anything else is MISMATCH.
5. Age. The name's registration block is checked from logs. Age is measured from that block, and a delegate must be older than a threshold (24 hours in production, configurable) to pass.
6. Incidents. A pull or cut counts only if the sec key's role is confirmed on chain and the transaction really contains the unregister event.

The result is one verdict per publisher: VERIFIED, VERIFIED-unproven (Arkiv unreachable, so the proof blocks are unknown), KEY REVOKED, PULLED (with the reason), MISMATCH, or none. Severity follows trust. For delegations and delegatecall targets, anything but a pinned, proven VERIFIED that is old enough is critical, which makes MetaMask show its double confirmation. Pins are explicit (a typed name or a curated list), never automatic.

### Where ENSv2 is load-bearing

- **Hierarchical registries.** A key is a subtree, so one `unregister` ends every name below it. ENSv1 is flat: deleting `ci-1.acme.eth` leaves `router.ci-1.acme.eth` resolving.
- **EAC roles.** Create-only CI key, remove-only security key, root-only delegates and reservations.
- **Expiry.** A key's 90-day TTL bounds everything below it.
- **PermissionedResolver via VerifiableFactory.** One resolver per release with root-only setters, which is what makes the "records are immutable to the CI key" proof possible.
- **Universal Resolver `findResolver`.** An offset other than 0 means the name has no resolver of its own (unregistered, pulled, or under a cut key) and is rejected.
- **Token versions.** Token ids change on every register and role change, so releases are keyed by labelhash and the current id is read from the registry.

Without ENSv2 the publisher identity users already know disappears, and a key cannot be a revocable subtree.

## Arkiv's role

Arkiv is an untrusted, searchable index. ENS can say whether a name is valid but cannot be searched by address. Arkiv adds discovery (which publisher claims an unknown address), withdrawal reasons (a pulled release otherwise looks never published), and the two proof block numbers per release. Rows are never trusted: each one is re-checked against ENS before it can change a verdict, and a missing or flooded index never turns anything green. Schemas, query examples and the trust model are in [arkiv/README.md](arkiv/README.md).

## Repository layout

| Path | What |
|---|---|
| `packages/lib/shared` | checker, ENSv2 addresses/ABIs/reads, record codec, calldata decoding, Arkiv row types. Runs in browser and Snap |
| `packages/cli` | publisher tool; the only place that signs ENS or Arkiv transactions |
| `packages/snap` | MetaMask Snap (`onTransaction`, `onSignature`) |
| `packages/web` | lookup site and demo 7702 wallet page (Vite, React) |
| `packages/demo` | Anvil fork, seed and attack scripts, live-run script. Nothing here ships |
| `arkiv/` | Arkiv prize documentation |
| `.github/actions/codemark-publish` | composite GitHub Action wrapping `publish` |

## Run it

Prerequisites: [Bun](https://bun.sh) 1.4.2 or newer, and [Foundry](https://getfoundry.sh) (for `anvil`). Run everything below from `packages/`.

```sh
cd packages
bun install
```

### Demo fork

```sh
bun run demo:fork      # Anvil forking Sepolia on :8545
bun run demo:seed      # second shell; about a minute; builds acmeswap.eth and three releases
bun run demo:attack    # same fork; publishes five forged releases the checker must report as MISMATCH
bun run --cwd demo warp   # optional: move fork time forward (default 24 h) for the delegate age rule
bun run --cwd demo abi:check   # check the ABIs against live Sepolia
```

`demo:seed` writes `packages/demo/state/seed.json`. See `packages/demo/CONTEXT.md` for its env variables. Arkiv rows are only written if `SEED_ARKIV=1` and `ARKIV_ACCESS_KEY` are set.

### Tests

```sh
bun tests              # shared and cli tests
bun run --cwd demo tests   # spikes; starts its own Anvil on :18545
bun fmt-lint && bun typecheck
```

Checker tests run against an Anvil fork, not mocks, because the deployed contracts differ from the repository head.

### Web

```sh
bun web:dev            # http://localhost:3020
bun web:build
```

### Snap in MetaMask Flask

The Snap needs [MetaMask Flask](https://metamask.io/flask/), the developer build, because network access for Snaps is only allowed for allowlisted Snaps in stable MetaMask.

1. `bun snap:build` (set `CODEMARK_SITE_ORIGIN` first if the web site is not on localhost:3020; only that origin and localhost:3020 may pin publishers).
2. `bun snap:serve` serves the Snap on http://localhost:8080.
3. In Flask, install `local:http://localhost:8080`, then sign a transaction. The Snap decodes the call, checks the targets and shows the verdict.

### CLI

Secrets come from the environment (`CODEMARK_ROOT_KEY`, `CODEMARK_SEC_KEY`, `CODEMARK_CI_KEY`, `CODEMARK_SAFE`, `SEPOLIA_RPC_URL`, `ARKIV_ACCESS_KEY`). A command that needs a signer it was not given fails before sending anything. Every command also takes `--rpc <url>`.

```sh
bun cli init acmeswap --sec 0x... --years 1                       # register the name, deploy the Safe and PubRegistry
bun cli add-key acmeswap.eth ci-1 --ci 0x... --ttl-days 90        # mount a key (--root-only for a key with no CI grant, such as delegates)
bun cli publish acmeswap.eth ci-1 --component router --version 3.1.0 --target 0x... --commit <40-hex>   # --kind delegate for 7702 delegates
bun cli pull acmeswap.eth ci-1 router-3-1-0 --reason "wrong constructor args"
bun cli cut acmeswap.eth ci-1 --reason "CI key leaked"
bun cli migrate acmeswap.eth ci-1 ci-2 --ci 0x...                 # mount ci-2, republish live releases of ci-1
bun cli verify 0x... --pin acmeswap.eth --role delegation         # --role call|delegatecall|delegation|approval-spender|permit-spender
```

`verify` also takes `--no-index`, `--block`, `--min-age <seconds>` and `--json`, and exits 0 for no warning, 1 for a warning and 2 for critical.

### GitHub Action

`.github/workflows/release.example.yml` publishes on a `router-v*` tag push:

```yaml
- uses: ./.github/actions/codemark-publish
  with:
    publisher: acmeswap.eth
    key: ci-1
    component: router
    version: ${{ steps.deployed.outputs.version }}
    target: ${{ steps.deployed.outputs.address }}
    ci-key: ${{ secrets.CODEMARK_CI_KEY }}
    arkiv-access-key: ${{ secrets.ARKIV_ACCESS_KEY }}   # row is skipped when empty
```

Outputs are `name` and `forward-name`. The CI key only has `ROLE_REGISTRAR` on one key registry.

## Live on Sepolia

Transaction hashes are added after the live run.

## Security model and known limits

| Attacker | Outcome |
|---|---|
| Phishing clone with its own contract or delegate | UNKNOWN, or "vouched for" by a lookalike publisher; critical for delegations and delegatecall targets |
| Forged or spam Arkiv rows | Fail the creator and on-chain checks. Flooding yields "index flooded", never green; pinned lookups skip the index |
| Stolen CI key | Can publish non-delegate releases until cut. Cannot alter passing releases, publish delegates or revive pulled labels. Can grief by reserving labels, which root clears |
| Stolen sec key | Can pull, cut or clear reservations: a visible denial of service. Cannot publish |
| Stolen root | Total. Use a multisig |
| Arkiv down | Pinned lookups still work; open discovery returns UNKNOWN; never a false green |

Limits:

- The Snap runs only in MetaMask Flask. The live demo link is the demo wallet page, which runs the same checker.
- Both sides must adopt it: teams must publish and wallets must run the check. Dapps cannot request arbitrary 7702 delegations, so wallet teams call the checker before their "upgrade account" prompt.
- Lookalikes are reduced by pinning, not removed.
- A pull or cut is final for the label: a pulled label cannot be reused, and a cut key is never renewed, only replaced with `migrate`.
- A cut withdraws that key's good releases too until `migrate` republishes them.
- The sec key's emergency `unregister` leaves a window before root reserves the label in which a CI key can re-register it; the checker treats a release registered after a pull incident as MISMATCH.
- A key that lapses makes its releases UNKNOWN.
- Beacon proxies, diamonds and factory-made contracts are "not attested".
- Mainnet is out of scope: Sepolia runs contracts-v2 commit `07e55a05`, mainnet a different one.
- Privacy: Arkiv sees the queried artifact and client IP, and the RPC sees the checked name. There is no read-privacy claim.
- Codemark does not assess code behaviour.

## Partners and prize tracks

- **ENS, Best Use of ENSv2 (Sepolia).** Publisher identity, scoped keys, subtree revocation and expiry all come from ENSv2 registries, EAC roles, PermissionedResolver and the Universal Resolver, with no custom contracts. See "Where ENSv2 is load-bearing".
- **Arkiv, Build on Arkiv.** Two entity types on Rabdi (`codemark.release.v1`, `codemark.incident.v1`) provide discovery, withdrawal reasons and proof block numbers; the checker reads them with the SDK and re-verifies every row against ENS. See [arkiv/README.md](arkiv/README.md).
