# Friction

These are problems we actually hit while building Codemark on Rabdi, most important first.

## 1. A write that reported failure had landed

- **Expected:** if `createEntity` throws, the row wasn't written, or the error says it might have been.
- **What happened:** during a live publish against the public endpoint, `createEntity` threw `Transaction failed: The request took too long to respond.` A query then showed the router's row was stored anyway. The next row, the portal's, went through on retry.
- **Why it matters:** the error gives no transaction hash and reads as a definite failure. A plain retry would have written a duplicate row, so we had to query first.
- **To reproduce:** call `createEntity` through `rabdi({ accessKey: "" })`, then query by the same attributes when it throws. It depends on endpoint load, and we can't trigger it on demand.
- **What would help:** return the transaction hash before waiting, and word the timeout as "may still land".

## 2. No read-only key for a site with no server

- **Expected:** a way to give a static site a higher rate limit without exposing a general key.
- **What happened:** Codemark's site has no backend, so `VITE_ARKIV_ACCESS_KEY` ends up in public JavaScript. We created a key just for the site and accepted that anyone can read it. We didn't see a read-only or origin-locked option in the Hub.
- **What would help:** read-only keys, locked to an origin. Apps that read Arkiv directly from the browser are a natural fit for it, and this is the part that stops them from being simple.

## 3. Getting testnet funds into CI keys takes manual steps

- **What happened:** the faucet needs a connected wallet and a CAPTCHA, and it has a cooldown (we saw about an hour). The access-key page also asks for an email and a CAPTCHA. Our writers are a CI key and a security key, so we claimed tGLM with a personal wallet and sent it on by hand.
- **What would help:** the faucet's "use a different address" option helps. A short documented path for funding a bot or CI key would help more.

## 4. Whether you need an access key isn't obvious at first

- **What happened:** `rabdi()` with no key throws `MissingAccessKeyError`, and the setup docs list a key as something to get first. Our early notes said the SDK needed one, so we treated it as a blocker. It wasn't: reads and writes both work with `accessKey: ""`. The error message does mention that option.
- **Also:** the SDK prints its rate-limit notice whenever a client is created without a key, which shows up in our CLI's output on every command.
- **What would help:** say in the quickstart that an empty key works for trying things out, and let apps turn the notice off.

## 5. Rows can't last as long as what they describe

- **What happened:** the maximum lifetime is about 182 days, and a release can stay valid longer. Someone has to call `extendEntity` before each row expires. `permissionlessExtension` makes that possible for anyone, which we like, but we haven't built that monitor yet.
- **What would help:** a longer maximum, or a simple hosted way to keep chosen rows alive.

## 6. Rows come back as wrapped values

- **What happened:** each attribute on a returned entity is a typed wrapper, so we wrote a small helper (`plain()` in [`source.ts`](../packages/lib/shared/arkiv/source.ts)) to get plain values for validation.
- **What would help:** a built-in way to get a row as plain values.

## What worked well

- `defineSchema` rejects a reserved attribute name right away. Using `key` throws `"key" is reserved by the query language`, and that's why ours is `keyLabel`. We'd have lost time if we'd found this at query time.
- `$creator` can't be changed by transferring a row. Our whole trust model rests on that.
- `withCount()` lets us tell a flooded index from an empty one.
- Reads are fast. Our queries on the public endpoint took 280 to 880 ms.
