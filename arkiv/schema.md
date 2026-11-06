# Schema

Chain: Arkiv testnet Rabdi (chain id 7794095). SDK: `@arkiv-network/sdk` 1.0.1. Definitions are in [`packages/lib/shared/arkiv/schemas.ts`](../packages/lib/shared/arkiv/schemas.ts).

## Entities

### `codemark.release.v1`

One row per published contract release. It says which publisher and key claim an address.

| Field | Queried | Meaning |
|---|---|---|
| `artifact` | Yes | `eip155:<chain>:<address>` of the contract |
| `keyRegistry` | Yes | The ENS registry of the key that published it |
| `publisher` | | The publisher's ENS name |
| `keyLabel` | | The key's label, such as `ci-1` |
| `name` | | The full release name |
| `labelhash` | | Identifies the release, because ENS token ids change |
| `resolverBlock`, `regBlock` | | Sepolia blocks where the proof's log scans start |
| `kind`, `version` | | Release type and version |

- **Written by:** the team's CI key, when it publishes.
- **Owner:** the CI key. Rows are created `readonly`, so nobody can edit them, and they are never transferred.
- **Expires:** `min(release expiry, now + 182 days)`. That cap is the SDK's maximum lifetime of 7,884,000 blocks.

### `codemark.incident.v1`

One row per withdrawal, which is a `pull` of one release or a `cut` of a whole key.

| Field | Queried | Meaning |
|---|---|---|
| `keyRegistry` | Yes | The affected key registry |
| `artifact` | Yes | The affected contract, for a pull |
| `name` | | The affected release, for a pull |
| `action` | | `pull` or `cut` |
| `reason` | | Why, in the publisher's words (at most 280 bytes) |
| `ensTx`, `block` | | The Sepolia transaction that did it, and its block |
| `linkBlock` | | The block that linked the key registry, for a cut |

- **Written by:** the team's security key.
- **Owner:** the security key. Rows are `readonly` and never transferred.
- **Expires:** the maximum lifetime, about 182 days.

Both types set `permissionlessExtension`, so anyone can keep a row alive.

## What's on Rabdi now

Read on 7 November 2026: 5 release rows created by the CI key and 1 incident row created by the security key, both below. See [how-you-use-arkiv.md](how-you-use-arkiv.md) for what they are.

| Key | Address |
|---|---|
| CI key (wrote the release rows) | `0x47Fccf73d86473357c74c8ae393C7099Cdc06934` |
| Security key (writes incident rows) | `0x703389487942788EC4AD8461A51e03a9F79F9186` |
