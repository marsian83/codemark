# Codemark on Arkiv

Chain: Arkiv testnet Rabdi (chain id 7794095). SDK: `@arkiv-network/sdk` 1.0.1.

## What we store

Two entity types, both created `readonly` and `permissionlessExtension` and never transferred.

| Schema | Written by | Purpose | Expiry |
|---|---|---|---|
| `codemark.release.v1` | CI key | Says which publisher and key registry claim an artifact, and records the two Sepolia block numbers (`resolverBlock`, `regBlock`) the checker needs to scan logs for the immutability proof. | `min(release expiry, now + 182 days)` |
| `codemark.incident.v1` | security key | Records a `pull` (one release) or `cut` (a whole key) with a human-readable reason (at most 280 bytes), the Sepolia transaction, and its block. | maximum lifetime |

The SDK caps a lifetime at 7,884,000 blocks (about 182.5 days). A monitor calls `extendEntity` before expiry; because rows are created with `permissionlessExtension`, anyone can extend them. The Arkiv column `key` is reserved, so the key label is stored as `keyLabel`. Releases are identified by `labelhash`, not token id, since the token id changes when a label is re-registered.

Columns are in `packages/lib/shared/arkiv/schemas.ts`. Indexed (filterable): `artifact` and `keyRegistry` on releases; `keyRegistry` and `artifact` on incidents.

## Why Arkiv

ENS answers "is this name's record valid right now", but cannot be searched by address or artifact.

1. Discovery: given an unknown address, query `artifact` to find which publisher claims it, then check that claim in ENS. Without an index the wallet can only check publishers the user already pinned.
2. Withdrawal reasons: a pulled or cut release stops resolving in ENS and looks the same as one never published. The incident row says it was withdrawn and why.
3. Proof block numbers: the immutability proof scans resolver logs from `resolverBlock`. Release rows carry it, so the scan does not start at genesis.

## Query examples

```ts
import { createArkivReader, createArkivSource } from "@codemark/shared/arkiv";

const source = createArkivSource(createArkivReader(process.env.ARKIV_ACCESS_KEY));
const { rows, indexFlooded } = await source.findReleases(
  "eip155:11155111:0x...",
  { maxPages: 3 },
);
const incidents = await source.findIncidentsByKeyRegistry("0x...");
```

Raw SDK form:

```ts
client.select().from(Releases).where(eq("artifact", str(id)))
  .orderBy(asc("$key")).limit(100).offset(0).fetch();
```

Each returned row carries `entityKey`, `creator` (`$creator`), `owner`, creation flags, `createdBlock`, `expiresBlock` and the block the query ran at. Pages hold 100 rows. If the page cap is reached with a full last page, `indexFlooded` is true and the checker must not treat the missing rows as absent. Rows that do not match the schema or fail zod validation are dropped and counted in `malformed`.

## Trust model

Rows are untrusted. Anyone can create an entity with these column values.

- The checker accepts a release row only if `$creator` is the CI key holding the registrar role on the named key registry in ENS, and an incident row only if `$creator` holds the unregister role on the publisher registry. `$creator` does not change when ownership is transferred, so handing a forged row to a trusted address does not help.
- Every claim in a row is re-derived from ENS at one pinned Sepolia block before a verdict is shown. A row can add candidates to look at or explain a withdrawal; it cannot make an artifact verified.
- If Arkiv is unreachable, the pinned path still works, other releases become `VERIFIED-unproven` or `UNKNOWN`, and nothing is shown as verified on the strength of a missing row.
- Leak: Arkiv sees the queried artifact and the client IP.

## Access

Reads work against the public Rabdi endpoint without a key but are heavily rate limited. Writes need a funded account (tGLM from hub.arkiv.network/faucet). An access key from hub.arkiv.network/access-keys raises the rate limit.

## Tests

```
cd packages/lib/shared && bun test tests/arkiv
```

Live tests run when `ARKIV_ACCESS_KEY` is set and skip otherwise.
