# How we use Arkiv

## Filters

| We filter on | Because | Where you see it |
|---|---|---|
| `artifact` on releases | A signer starts with only an address and needs to find who claims it | The lookup page lists each publisher that claims the contract and marks which one you pinned |
| `keyRegistry` on releases | A publisher's page needs every release under a key | The publisher page's release table |
| `artifact` on incidents | A pulled release looks never-published in ENS | The verdict explains why it was withdrawn |
| `keyRegistry` on incidents | A cut affects everything under a key | The Key revoked verdict and its reason |

## Who can edit each entity

Nobody. Rows are created `readonly` and never transferred, because a release claim or a withdrawal reason shouldn't change after the fact. Anyone can extend a row through `permissionlessExtension`, so keeping the record alive doesn't depend on us.

Anyone can also create a row with these same columns. That's fine, because rows are untrusted: a release row counts only if `$creator` holds `ROLE_REGISTRAR` on the named key registry in ENS, and an incident row only if it holds `ROLE_UNREGISTER`. Forged rows are dropped.

## When entities expire

Release rows expire with the release, capped at about 182 days, so an old claim can't outlive the key behind it. Incident rows take the maximum lifetime, because the reason for a withdrawal should stay readable for as long as possible. We haven't built the monitor that would extend rows yet.

## What each feature changes for users

| Arkiv feature | What the user sees |
|---|---|
| Attribute queries | They can paste any address and see who claims it, without first knowing the publisher |
| `$creator` | A stranger's forged row doesn't appear as a valid claim |
| `readonly` | A team can't rewrite why it withdrew a release |
| Expiration | A claim that has outlived its release stops being listed |
| `withCount()` | A flooded index shows "too many candidates" instead of a false answer |

The row's block numbers also matter. `resolverBlock` and `regBlock` tell the checker where to start scanning logs, which is what lets it prove a record was never changed. If Arkiv is unreachable and nothing is cached, the release shows as Verified-unproven, which is a warning.

## What is and isn't live

Read from Rabdi on 7 November 2026:

- **Release rows: 5.** Three are live: the router, the portal and `withdrawn-1-0-0`, all under `pwnmeswap.eth`. The other two are the router and portal under our earlier test publisher `acmeswap.eth`. We unregistered those names on Sepolia without writing an incident row ([router](https://sepolia.etherscan.io/tx/0xf98c4f8472b60414f0b1a62382cf4a425a2fd8e193fa37a5b99bd8422fbffa30), [portal](https://sepolia.etherscan.io/tx/0x6d8d01a41139fd2b9c571720f87a9e408740bf022eba5151e1f7517b1631d523)). Their rows can't be deleted, so they stay in Arkiv until they expire, but ENS no longer backs them and the lookup ignores them. That's the index being untrusted in practice: a row only suggests where to look.
- **Incident rows: 1.** We published `withdrawn-1-0-0` and pulled it on live Sepolia to show a withdrawal end to end ([pull transaction](https://sepolia.etherscan.io/tx/0x5f43c019f4eb4d383a62f4cc79e89b011e096d41426c68217d17b2f8b1a07c2d)). Open `0x65aF9C81B6351c61F3657D47Ef29AEA319B7DAE5` in the [demo](https://codemark.hetairoi.xyz/demo?c=withdrawn): it says Don't sign, with the reason read from that row. The router and portal, under the same key, still verify.

We haven't run a `cut` on live Sepolia, because it would withdraw the demo releases too. The checker's handling of cuts is covered by tests on an Anvil fork.

## One query you can run

Save this as a `.ts` file in `packages/lib/shared` and run it with `bun`. It needs no access key.

```ts
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { asc, eq } from "@arkiv-network/sdk/query";
import { str } from "@arkiv-network/sdk/schema";
import { http } from "viem";
import { Releases } from "./arkiv/schemas";

const client = createPublicClient({ chain: rabdi({ accessKey: "" }), transport: http() });
const { entities } = await client
	.select()
	.from(Releases)
	.where(eq("artifact", str("eip155:11155111:0x3bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e")))
	.orderBy(asc("$key"))
	.limit(10)
	.fetch();
for (const row of entities) console.log(row.$creator, row.name.value);
```

It prints the two rows that claim the demo router, both created by the CI key `0x47Fccf73d86473357c74c8ae393C7099Cdc06934`. Only `pwnmeswap.eth`'s is still backed by ENS, so it's the only one the lookup shows.
