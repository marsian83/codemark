# How Codemark works

How releases are laid out in ENS, what each key can do, and exactly what a check proves. The [README](../README.md) has the short version.

## The name tree

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

Everything on chain is stock ENSv2: registries are `UserRegistry` proxies and release resolvers are `PermissionedResolver` proxies. Both are deployed through `VerifiableFactory`, a CREATE2 factory (CREATE2 gives a contract an address derived from its deployer, salt and code) that can later confirm a given address is one of its proxies and which implementation it runs. There is no Codemark Solidity.

## Which ENSv2 deployment

Sepolia has two ENSv2 deployments side by side. If you compare addresses with another reference and see root registry `0x9703…a9ce` with ETHRegistry `0x657e…e09e`, that is the other one. Codemark uses the deployment that the canonical Universal Resolver at `0xeEeE…EeEe` actually reads, because that is what wallets, ENS libraries and [explorer.ens.domains](https://explorer.ens.domains) resolve against:

| Contract | Address |
|---|---|
| Root registry, from `ROOT_REGISTRY()` | [`0xb458d6a3a77919449d03e7a6903c26827c1ec43f`](https://sepolia.etherscan.io/address/0xb458d6a3a77919449d03e7a6903c26827c1ec43f) |
| `eth` registry | [`0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4`](https://sepolia.etherscan.io/address/0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4) |
| VerifiableFactory | [`0xda70306c98e97ece36f997a21368e53298572991`](https://sepolia.etherscan.io/address/0xda70306c98e97ece36f997a21368e53298572991) |

At block 12,078,510 the resolver's `ROOT_REGISTRY()` returned `0xB458…c43f`. You can read it yourself on [Etherscan](https://sepolia.etherscan.io/address/0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe#readProxyContract), or run `bun test tests/deployment.live.test.ts` in `packages/lib/shared`. The checker reads it again at the start of every check and refuses to run if it ever changes (`packages/lib/shared/ens/deployment.ts`), so a redeployment can't silently send checks to the wrong contracts. The `pwnmeswap.eth` releases under [Live on Sepolia](../README.md#live-on-sepolia) all resolve through this deployment. ABIs come from contracts-v2 commit `07e55a05`, the source behind it.

## What each signer can do

| Signer | Holds | Can | Cannot |
|---|---|---|---|
| root (team Safe) | every role on the publisher and key registries | create keys, publish delegates, pull, migrate | nothing is out of its reach; a stolen root is total, as with a stolen GitHub org |
| ci (release pipeline, hot key) | `ROLE_REGISTRAR` on one key registry | add release names | remove or overwrite names, publish delegates, change a release's records after publishing |
| sec (hardware key) | `ROLE_UNREGISTER` | cut a key, write incident rows | publish anything |

Roles come from ENSv2's access-control scheme (EAC): "may add" and "may remove" are separate permissions.

## Publish, pull, cut

- **Publish.** The CI key deploys one resolver for the release and registers two names for it, the version name and the forward name `a-<first 12 hex of keccak(artifact)>`. The resolver is created with its records and with setter roles for root only, so the CI key cannot change the records afterwards. The CI key also writes an Arkiv row.
- **Pull** withdraws one release. In one Safe batch, root unregisters both names of the release and reserves both labels again, so the CI key cannot simply re-register them. A reserved label can only be promoted by root, and a promoted label is marked and fails the check.
- **Cut** withdraws a key. The sec key unregisters the key's label in `PubRegistry` in one Sepolia transaction. Every release under that key stops resolving, because ENSv2 resolution walks registries from the root. An incident row on Arkiv records the reason. Root then runs `migrate` to mount a new key and republish the good releases.

## What the checker proves

The checker (`packages/lib/shared/check`) runs every read against one pinned Sepolia block. For an address it establishes, in order:

1. Candidate names. Either the publishers the user pinned (looked up directly in ENS, no index) or rows found in Arkiv by artifact.
2. Any Arkiv row counts only if its creator is the account that holds the registrar role on the named key registry in ENS, and that registry is the one the publisher's registry links today. Other rows are dropped.
3. The name is exactly `<label>.<key>.<publisher>`, the Universal Resolver resolves it with no inherited parent answer, and its address and `codemark` text record match the target. The target's code hash matches the recorded one, and for an EIP-1967 proxy so do the implementation slot and implementation code hash.
4. The records cannot have been changed by the CI key. The resolver must be a genuine `VerifiableFactory` proxy running `PermissionedResolverImpl`, its logs since creation must show no record, role or upgrade changes, and root must be the only holder of its roles. Anything else is MISMATCH.
5. Age. The name's registration block is checked from logs. Age is measured from that block, and a delegate must be older than a threshold (24 hours in production, configurable) to pass.
6. Incidents. A pull or cut counts only if the sec key's role is confirmed on chain and the transaction really contains the unregister event.

Every name that comes in, a typed pin, a publisher or a key, is normalized with ENSIP-15 (`normalize` from `viem/ens`, in `lib/shared/names.ts`) before any lookup. Every label of a release name, including names read from Arkiv rows, must already be normalized and plain `[a-z0-9-]`. A lookalike that mixes scripts, such as `pwnmeswаp.eth` with a Cyrillic `а`, is rejected outright (`tests/names.test.ts`).

The result is one verdict per publisher: VERIFIED, VERIFIED-unproven (Arkiv unreachable, so the proof blocks are unknown), KEY REVOKED, PULLED (with the reason), MISMATCH, or none. Severity follows trust. For delegations and delegatecall targets, anything but a pinned, proven VERIFIED that is old enough is critical, which makes MetaMask show its double confirmation. Pins are explicit (a typed name or a curated list), never automatic.
