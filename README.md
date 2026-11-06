<img src="packages/web/public/logo.svg" width="72" alt="" />

# Codemark

[![CI](https://github.com/marsian83/codemark/actions/workflows/ci.yml/badge.svg)](https://github.com/marsian83/codemark/actions/workflows/ci.yml)

**Know who published a contract before you sign it.**

Codemark checks that the contract or account upgrade you are about to approve was released by the team you think, under their ENS name, and that the team still stands behind it.

**Try it at [codemark.hetairoi.xyz](https://codemark.hetairoi.xyz).** Paste a Sepolia contract address or pick one of the demo contracts. You don't need a wallet.

## Why it matters

A wallet shows you 20 bytes and asks you to sign. In February 2025, Bybit's Safe signers approved a transaction that handed their wallet to an attacker's contract, because the web page that built the transaction had been swapped. Nothing on the signing screen could say "this is not code your team released".

Account upgrades (EIP-7702) raise the stakes: one signature lets a contract control your whole account.

## What you see

- **A verdict before you sign:** Verified, Released recently, Not verified, or Don't sign, with the reason in plain words.
- **The trust path behind it:** publisher, release key, release, record, age. The first step that fails is the one marked in red, so you know why.
- **Withdrawals that reach every wallet:** if a team's release key leaks, one transaction withdraws everything that key released, and every check after that shows it.

Codemark tells you who published something and whether they still stand behind it. It does not assess what the code does.

## Four ways to use it

| You are | Use | What you need |
|---|---|---|
| Anyone about to sign | The lookup site at [codemark.hetairoi.xyz](https://codemark.hetairoi.xyz) | A browser. No wallet, no sign-up |
| A MetaMask user | The Codemark Snap, which checks every transaction before MetaMask asks you to confirm | [MetaMask Flask](https://metamask.io/flask/) for now |
| Running an AI agent that spends | The Codemark MCP server, which tells your agent to proceed, ask you or refuse before it signs | Bun and an MCP-capable agent. It holds no keys |
| A team shipping contracts | The CLI and the GitHub Action, which publish each release under your ENS name | Sepolia ETH. `init` registers the name and sets up the team Safe for you |

## Get started

The full guide, with every command explained, is at [codemark.hetairoi.xyz/app/docs](https://codemark.hetairoi.xyz/app/docs). The short version:

**Check a contract.** Open [codemark.hetairoi.xyz/app](https://codemark.hetairoi.xyz/app), paste an address, and read the verdict. Pin the publishers you trust; only they can mark a contract as verified.

**Check every transaction in MetaMask.** Install [MetaMask Flask](https://metamask.io/flask/) in a separate browser profile, open [Check](https://codemark.hetairoi.xyz/app) and select Install the Snap. It installs `npm:@marsian/codemark-snap`.

**Protect an agent that spends.** Nobody reads the signing screen when an agent signs, so a web page can hand it a lookalike router or an attacker's account upgrade. The MCP server checks the contracts behind each approval, swap and account upgrade first. Get a pin with `bunx @marsian/codemark-mcp pin pwnmeswap.eth`, then add the server to your agent:

```json
{
  "mcpServers": {
    "codemark": {
      "command": "bunx",
      "args": ["@marsian/codemark-mcp"],
      "env": { "CODEMARK_PINS": "pwnmeswap.eth=0x8a8d97f3F4d1235c62aE61cDB3644f574162d204" }
    }
  }
}
```

**Publish your releases.** You need [Bun](https://bun.sh) 1.4.2 or newer and three keys: a root key that owns the team Safe, a security key that can only withdraw things, and a CI key that can only add releases. Put them in `.env` in the folder you run the CLI from (`CODEMARK_ROOT_KEY`, `CODEMARK_SEC_KEY`, `CODEMARK_CI_KEY`), then:

```sh
bunx @marsian/codemark-cli init pwnmeswap --years 1                        # register pwnmeswap.eth, deploy the Safe and its registry
bunx @marsian/codemark-cli add-key pwnmeswap.eth ci-1 --ci 0x...           # let your CI address publish under ci-1
bunx @marsian/codemark-cli publish pwnmeswap.eth ci-1 --component router --version 3.1.0 --target 0x...   # release a deployed contract
bunx @marsian/codemark-cli verify 0x... --pin pwnmeswap.eth                # check it, the same way the site and the Snap do
```

There is nothing to install: `bunx` fetches the CLI when you run it.

If something goes wrong, `pull` withdraws one release and `cut` withdraws everything a key released, in one transaction each. The [CLI](#cli) section below lists every flag.

Built at ETHGlobal Mumbai on ENSv2 (Sepolia) and Arkiv (Rabdi testnet). Everything on chain is stock ENSv2; there is no custom Solidity.

## How it works

The rest of this page is for people who want the details: how releases are laid out in ENS, what each key can do, and exactly what a check proves.

### The name tree

A publisher is an ENS name. Under it, each signing key gets its own registry (in ENSv2, a registry is a contract that holds the subnames of one name, so every name can have its own). Each release is a name inside a key's registry.

```
pwnmeswap.eth                    owned by the team Safe ("root"); text record codemark.keys = "ci-1,delegates"
└─ PubRegistry                  root: all roles. sec: may remove names
   ├─ ci-1  -> KeyRegistry      root: all roles. CI key: may add names. sec: may remove names
   │   ├─ router-3-1-0          resolver: address = router contract, text record "codemark"
   │   ├─ a-1f2e3d4c5b6a        forward name for the same artifact, same resolver
   │   └─ web-3-1-0             contenthash = IPFS CID of a frontend build
   └─ delegates -> KeyRegistry  only root may add names. sec: may remove names
       └─ delegate-1-0-0        address = an EIP-7702 delegate
```

A Safe is a multisig smart-contract wallet. Here it is the root and needs no custom contract. An EIP-7702 delegation lets an ordinary account point at contract code and run it, so a signature that sets a delegate can hand the account to whoever wrote that code. The `delegates` key exists so that code of that kind can only be published by root. The same goes for anything that runs with the signer's authority: a Safe module, guard or fallback handler, a delegatecall target, a proxy upgrade or an ERC-7579 module only passes if it was published as a delegate.

Everything on chain is stock ENSv2: registries are `UserRegistry` proxies and release resolvers are `PermissionedResolver` proxies. Both are deployed through `VerifiableFactory`, a CREATE2 factory (CREATE2 gives a contract an address derived from its deployer, salt and code) that can later confirm a given address is one of its proxies and which implementation it runs. ABIs come from contracts-v2 commit `07e55a05`, the source behind the Sepolia deployment. There is no Codemark Solidity.

### Which ENSv2 deployment

Sepolia has two ENSv2 deployments side by side. If you compare addresses with another reference and see root registry `0x9703…a9ce` with ETHRegistry `0x657e…e09e`, that is the other one. Codemark uses the deployment that the canonical Universal Resolver at `0xeEeE…EeEe` actually reads, because that is what wallets, ENS libraries and [explorer.ens.domains](https://explorer.ens.domains) resolve against:

| Contract | Address |
|---|---|
| Root registry, from `ROOT_REGISTRY()` | [`0xb458d6a3a77919449d03e7a6903c26827c1ec43f`](https://sepolia.etherscan.io/address/0xb458d6a3a77919449d03e7a6903c26827c1ec43f) |
| `eth` registry | [`0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4`](https://sepolia.etherscan.io/address/0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4) |
| VerifiableFactory | [`0xda70306c98e97ece36f997a21368e53298572991`](https://sepolia.etherscan.io/address/0xda70306c98e97ece36f997a21368e53298572991) |

At block 12,078,510 the resolver's `ROOT_REGISTRY()` returned `0xB458…c43f`. You can read it yourself on [Etherscan](https://sepolia.etherscan.io/address/0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe#readProxyContract), or run `bun test tests/deployment.live.test.ts` in `packages/lib/shared`. The checker reads it again at the start of every check and refuses to run if it ever changes (`packages/lib/shared/ens/deployment.ts`), so a redeployment can't silently send checks to the wrong contracts. The `pwnmeswap.eth` releases under [Live on Sepolia](#live-on-sepolia) all resolve through this deployment. ABIs come from contracts-v2 commit `07e55a05`, the source behind it.

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

Every name that comes in, a typed pin, a publisher or a key, is normalized with ENSIP-15 (`normalize` from `viem/ens`, in `lib/shared/names.ts`) before any lookup. Every label of a release name, including names read from Arkiv rows, must already be normalized and plain `[a-z0-9-]`. A lookalike that mixes scripts, such as `pwnmeswаp.eth` with a Cyrillic `а`, is rejected outright (`tests/names.test.ts`).

The result is one verdict per publisher: VERIFIED, VERIFIED-unproven (Arkiv unreachable, so the proof blocks are unknown), KEY REVOKED, PULLED (with the reason), MISMATCH, or none. Severity follows trust. For delegations and delegatecall targets, anything but a pinned, proven VERIFIED that is old enough is critical, which makes MetaMask show its double confirmation. Pins are explicit (a typed name or a curated list), never automatic.

### Where ENSv2 is load-bearing

- **Hierarchical registries.** A key is a subtree, so one `unregister` ends every name below it. ENSv1 is flat: deleting `ci-1.pwnmeswap.eth` leaves `router.ci-1.pwnmeswap.eth` resolving.
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
| `packages/mcp` | MCP server for agents: read-only, holds no keys, returns proceed, ask_user or refuse |
| `packages/web` | landing page at `/`, lookup site and demo 7702 wallet page under `/app` (Vite, React) |
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
bun run demo:seed      # second shell; about a minute; builds pwnmeswap.eth and three releases
bun run demo:attack    # same fork; publishes five forged releases the checker must report as MISMATCH
bun run --cwd demo warp   # optional: move fork time forward (default 24 h) for the delegate age rule
bun run --cwd demo abi:check   # check the ABIs against live Sepolia
```

`demo:seed` writes `packages/demo/state/seed.json`. See `packages/demo/CONTEXT.md` for its env variables. Arkiv rows are only written if `SEED_ARKIV=1` is set.

### Tests

```sh
bun tests              # shared, cli, mcp and web tests
bun run --cwd demo tests   # spikes; starts its own Anvil on :18545
bun fmt-lint && bun typecheck
```

Most tests need nothing but Bun: calldata decoding, record and name parsing, row validation, severity, checker limits, the CLI operations, and the plain-language verdicts (`packages/lib/shared/tests/explain.test.ts` walks every combination of verdict, role, pin, proof and age and checks that nothing unsafe ever reads as verified). The checker's end-to-end tests run against an Anvil fork of Sepolia rather than mocks, because the deployed contracts differ from the repository head; they skip themselves when no fork is running. `deployment.live.test.ts` and `check.live.test.ts` read live Sepolia and are skipped with `CODEMARK_LIVE_TESTS=0`.

CI (`.github/workflows/ci.yml`) runs on every push: the typecheck, lint and all offline tests in one job, and the live Sepolia tests in another, including the check that the canonical Universal Resolver still reads the deployment above. It needs no secrets.

### Web

```sh
bun web:dev            # http://localhost:3020
bun web:build
```

The site is static: it reads Sepolia and Arkiv straight from the browser, so any static host works. Serve `index.html` for every path under `/app` so the client-side routes load. The account-upgrade demo page checks live Sepolia and signs with a throwaway key made in the browser. It never sends the upgrade, so it needs no gas or server. Set `VITE_DEMO_DELEGATE` and `VITE_DEMO_SWEEPER` at build time to show its two preset contracts.

The site keeps working when an RPC rate limits or goes down. It tries `VITE_SEPOLIA_RPC_URL` first if you set one, then several public Sepolia RPCs in a random order per visitor, and it reruns a check that couldn't finish. With `VITE_ARKIV_ACCESS_KEY` set, it falls back to Arkiv's public endpoint if the key stops working. Both values are public in the built site, so restrict them to your domain where the provider allows it.

### Snap in MetaMask Flask

The Snap needs [MetaMask Flask](https://metamask.io/flask/), the developer build, because network access for Snaps is only allowed for allowlisted Snaps in stable MetaMask. The deployed site installs the published `npm:@marsian/codemark-snap`; the local site (`bun web:dev`) installs `local:http://localhost:8080`, and `VITE_SNAP_ID` overrides either.

1. `bun snap:build`. Only https://codemark.hetairoi.xyz and http://localhost:3020 may pin publishers in the Snap; set `CODEMARK_SITE_ORIGIN` to allow one more origin.
2. `bun snap:serve` serves the Snap on http://localhost:8080.
3. In Flask, install it from the local site, then sign a transaction. The Snap decodes the call, checks the targets and shows the verdict.

To release a new version, bump `version` in `packages/snap/package.json`, run `bun snap:build` and `bun run --cwd snap manifest` so the manifest checksum matches, then `bun publish` from `packages/snap`.

### CLI

Run it with `bunx @marsian/codemark-cli <command>`. From a clone, `bun cli` in `packages/` runs the same commands.

Secrets come from the environment or a `.env` file (`CODEMARK_ROOT_KEY`, `CODEMARK_SEC_KEY`, `CODEMARK_CI_KEY`, `CODEMARK_SAFE`, `SEPOLIA_RPC_URL`, `ARKIV_ACCESS_KEY`). The published CLI reads `.env` in the current folder; `bun cli` reads the one at the repository root. Set `CODEMARK_ENV_FILE` to use another file. A command that needs a signer it was not given fails before sending anything. Every command also takes `--rpc <url>`.

```sh
bunx @marsian/codemark-cli init pwnmeswap --sec 0x... --years 1                       # register pwnmeswap.eth, deploy the Safe and PubRegistry
bunx @marsian/codemark-cli add-key pwnmeswap.eth ci-1 --ci 0x... --ttl-days 90        # mount a key (--root-only for a key with no CI grant, such as delegates)
bunx @marsian/codemark-cli publish pwnmeswap.eth ci-1 --component router --version 3.1.0 --target 0x... --commit <40-hex>   # --kind delegate for 7702 delegates, Safe modules and other delegatecall targets
bunx @marsian/codemark-cli pull pwnmeswap.eth ci-1 router-3-1-0 --reason "wrong constructor args"
bunx @marsian/codemark-cli cut pwnmeswap.eth ci-1 --reason "CI key leaked"
bunx @marsian/codemark-cli migrate pwnmeswap.eth ci-1 ci-2 --ci 0x...                 # mount ci-2, republish live releases of ci-1
bunx @marsian/codemark-cli verify 0x... --pin pwnmeswap.eth --role delegation         # --role call|delegatecall|delegation|approval-spender|permit-spender
```

`publish --commit` is optional; the GitHub Action fills it with the commit being built. Releases with `--kind delegate` are signed by root rather than the CI key and get no Arkiv row, because delegates only count when their publisher is pinned.

`init` does the whole `.eth` registration itself: it mints and approves MockUSDC, commits and then registers through the ENSv2 `ETHRegistrar` with the Safe as owner (`packages/cli/ops/init.ts`).

`verify` also takes `--no-index`, `--block`, `--min-age <seconds>` and `--json`, and exits 0 for no warning, 1 for a warning and 2 for critical.

To release the CLI or the MCP server to npm, run `bun run --cwd cli build` or `bun run --cwd mcp build`, then `bun publish` from `packages/cli/npm` or `packages/mcp/npm`.

### GitHub Action

`.github/workflows/release.example.yml` publishes on a `router-v*` tag push. From your own repository, reference the action by path and pin it to a commit:

```yaml
- uses: marsian83/codemark/.github/actions/codemark-publish@<commit>
  with:
    publisher: pwnmeswap.eth
    key: ci-1
    component: router
    version: ${{ steps.deployed.outputs.version }}
    target: ${{ steps.deployed.outputs.address }}
    ci-key: ${{ secrets.CODEMARK_CI_KEY }}
    arkiv-access-key: ${{ secrets.ARKIV_ACCESS_KEY }}   # optional; lifts the public endpoint's rate limit
```

Outputs are `name` and `forward-name`. The CI key only has `ROLE_REGISTRAR` on one key registry.

## Live on Sepolia

`pwnmeswap.eth` is registered on the canonical ENSv2 Sepolia deployment, owned by a 1-of-1 Safe ([`0x5A0b…A9b0`](https://sepolia.etherscan.io/address/0x5A0bb1DC428466707EfA52E6A5f55bE33652A9b0)). Browse it on [explorer.ens.domains](https://explorer.ens.domains/pwnmeswap.eth).

| Step | Name | Transactions |
|---|---|---|
| Publisher registry, `.eth` commit and register | [pwnmeswap.eth](https://explorer.ens.domains/pwnmeswap.eth) | [`0x3a586172…`](https://sepolia.etherscan.io/tx/0x3a586172d6336290fc8f0443e3499742e337959cf96270f8cbdf27fd379c6a5b) [`0xd866bc54…`](https://sepolia.etherscan.io/tx/0xd866bc54042bceea42b11745fb5d70dbd7239a6079a3f4d818baeef972662550) [`0x30170433…`](https://sepolia.etherscan.io/tx/0x30170433292da4b1e36b13d9580755cdc9e8c49a145f04bd33bffdb7050c51f4) |
| CI key (`ROLE_REGISTRAR` for the CI address) | [ci-1.pwnmeswap.eth](https://explorer.ens.domains/ci-1.pwnmeswap.eth) | [`0x01e6b9b0…`](https://sepolia.etherscan.io/tx/0x01e6b9b066511186654f750aec7381833ede52b85d91bb876322ff65564163a7) [`0x1265ff6f…`](https://sepolia.etherscan.io/tx/0x1265ff6f3f33014b2a9f5d222a474d539611682a6f932a2dae2184b6ab378b02) |
| Root-only delegates key | [delegates.pwnmeswap.eth](https://explorer.ens.domains/delegates.pwnmeswap.eth) | [`0xc6d15084…`](https://sepolia.etherscan.io/tx/0xc6d1508408db5c26b599c85376d098a2db4b4cf475694387c1124a33f70e3a69) [`0x67a669c3…`](https://sepolia.etherscan.io/tx/0x67a669c321d3e33c43f1980f7d1a2a1e36675981cf5177bf414f24283992b5d9) |
| Router 3.1.0, published by CI | [router-3-1-0.ci-1.pwnmeswap.eth](https://explorer.ens.domains/router-3-1-0.ci-1.pwnmeswap.eth) | [`0xe1b956a1…`](https://sepolia.etherscan.io/tx/0xe1b956a1edb7759ef33cb21263856d4a8a2bfa037885cd5183b016cb6fc18e72) [`0x2ae77cae…`](https://sepolia.etherscan.io/tx/0x2ae77cae1701bdb694a7d45c789e6c71147a0c31a400d257e7e68fe024618da7) |
| Portal 2.0.0 (proxy, implementation pinned) | [portal-2-0-0.ci-1.pwnmeswap.eth](https://explorer.ens.domains/portal-2-0-0.ci-1.pwnmeswap.eth) | [`0x3ca5b578…`](https://sepolia.etherscan.io/tx/0x3ca5b578a0d452580ac1dfd93457331b3ff39bc918c5b09683c2af9feea9fd7b) [`0x1e67f392…`](https://sepolia.etherscan.io/tx/0x1e67f39296a1cef481394448c03127295b33b16fbcbc21079c328b58bb5adcd8) |
| EIP-7702 delegate 1.0.0, published by root | [delegate-1-0-0.delegates.pwnmeswap.eth](https://explorer.ens.domains/delegate-1-0-0.delegates.pwnmeswap.eth) | [`0x5213f6c6…`](https://sepolia.etherscan.io/tx/0x5213f6c61d071f60dcb0f4d30094f37e456aa84b32078e526f39e7061ee984aa) [`0x911e9e58…`](https://sepolia.etherscan.io/tx/0x911e9e5814f348602df662f76f5a7a780cddfacff337b9f2da6e5a4fffe9e5fa) |

The router and portal rows are indexed on Arkiv's Rabdi testnet; the delegate has none, because delegates are only trusted when pinned. Check any of the three targets with `codemark verify <address> --pin pwnmeswap.eth`, or on the lookup page.

To see the records without any Codemark code, ask the canonical Universal Resolver through plain viem (save it as a `.ts` file in `packages/lib/shared`, where viem is installed, and run it with `bun`). The address sits under the Sepolia coin type (ENSIP-11), and the `codemark` text record holds the code hash:

```ts
import { createPublicClient, http, toCoinType } from "viem";
import { sepolia } from "viem/chains";

const client = createPublicClient({ chain: sepolia, transport: http("https://sepolia.gateway.tenderly.co") });
const name = "router-3-1-0.ci-1.pwnmeswap.eth";
await client.getEnsAddress({ name, coinType: toCoinType(sepolia.id) }); // 0x3bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e
await client.getEnsText({ name, key: "codemark" }); // v1;k=contract;n=router;c=11155111;h=0xe7f9…71de;v=3.1.0
```

Plain resolution cannot tell you whether the records could have been rewritten, whether the key is still trusted, or how old the release is. The checker adds those.

## Security model and known limits

| Attacker | Outcome |
|---|---|
| Phishing clone with its own contract or delegate | UNKNOWN, or "vouched for" by a lookalike publisher; critical for delegations and delegatecall targets |
| Forged or spam Arkiv rows | Fail the creator and on-chain checks. Flooding yields "index flooded", never green; pinned lookups skip the index |
| Stolen CI key | Can publish non-delegate releases until cut. Cannot alter passing releases, publish delegates or revive pulled labels. Can grief by reserving labels, which root clears |
| Stolen sec key | Can pull, cut or clear reservations: a visible denial of service. Cannot publish |
| Stolen root | Total. Use a multisig |
| Arkiv down | Pinned lookups still resolve on-chain, but without the indexed proof blocks a release is VERIFIED-unproven: a warning, critical for delegations. Open discovery returns UNKNOWN; never a false green |

Limits:

- The Snap runs only in MetaMask Flask. Without it, the lookup site runs the same checker in your browser.
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
- The MCP server protects an honest agent that was handed a bad address. A hijacked agent can skip the check; stopping that takes enforcement in the signer. It does not check amounts or recipients, so a plain transfer returns `ask_user`.

## Partners and prize tracks

- **ENS, Best Use of ENSv2 (Sepolia).** Publisher identity, scoped keys, subtree revocation and expiry all come from ENSv2 registries, EAC roles, PermissionedResolver and the Universal Resolver, with no custom contracts. See "Where ENSv2 is load-bearing".
- **Arkiv, Build on Arkiv.** Two entity types on Rabdi (`codemark.release.v1`, `codemark.incident.v1`) provide discovery, withdrawal reasons and proof block numbers; the checker reads them with the SDK and re-verifies every row against ENS. See [arkiv/README.md](arkiv/README.md).
