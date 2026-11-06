# Why Arkiv

## What users would lose with Postgres

ENS can say whether a name's record is valid, but it can't be searched by address. Something has to answer "who claims this contract?", and whoever runs that index sits between a signer and the answer.

If that index were our Postgres database:

- **Signers would depend on us.** The site is static and reads directly from the browser, with no Codemark server. A database means running an API, and when it goes down, so does discovery for everyone.
- **We could quietly hide a withdrawal.** The reason a release was pulled is the row people most need to see, and it's also the one a team under pressure might want gone. A database owner can delete it without leaving a trace. An Arkiv row is `readonly` and can only expire.
- **A row's author would just be our word.** The checker accepts a row only if `$creator` is the account holding the matching role in ENS. Arkiv records `$creator` when the row is written, and transferring the row doesn't change it. In Postgres, that column is whatever our server wrote.
- **Other wallets couldn't use the data freely.** Any wallet can query these rows and reach the same result, with no API key from us and no agreement with us.

## What we kept off Arkiv, and why

| Kept off | Lives in | Why |
|---|---|---|
| Whether a release is valid | ENSv2 on Sepolia | Arkiv is an index, not the authority. A row can suggest where to look, but it can't make anything verified |
| Who you trust | Your browser or the MCP server's config | Pins are a personal decision, and an agent must not be able to add one |
| Account-upgrade releases | ENS only | These count only for a publisher you've pinned, and pinned lookups go straight to ENS, so they don't need discovery |
| What you look up | Nowhere | Checking a contract writes nothing. The limit: Arkiv can still see the address you query and your IP |

## The trade-off we accept

If Arkiv is unreachable, pinned lookups still resolve on chain but show as unproven, which is a warning, and open discovery returns unknown. A missing or flooded index never turns anything green.
