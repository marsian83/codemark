# web

Vite, React 19, React Router, TanStack Query, Tailwind 4. Runs the same checker as the CLI, Snap and MCP server (`lib/shared/check`) in the browser, reading Sepolia directly: there is no backend. Hosted on Vercel; `vercel.json` rewrites every path to `index.html`.

## Screens

| Route               | Page                                | What it shows                                                                                                                                                                                                                                                                                |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | `pages/landing`                     | Landing scene.                                                                                                                                                                                                                                                                               |
| `/app?a=0x…&role=…` | `pages/lookup/LookupPage.tsx`       | Check one address in one role (call, account upgrade, delegatecall, approval spender). The address and role live in the URL, so a result can be shared and the back button walks through earlier checks. Without an address it shows `HowItWorks`. Side panel: `PinsEditor` and `SnapPanel`. |
| `/app/p/:publisher` | `pages/publisher/PublisherPage.tsx` | A team's name: its registry, each release key with its status (Live, Revoked, Expired) and the releases the Arkiv index lists under it, each with a Check button that opens the lookup.                                                                                                      |
| `/app/docs`         | `pages/docs/DocsPage.tsx`           | Guide: check, the Snap, agents (MCP), publishing, limits.                                                                                                                                                                                                                                    |
| `/demo?c=…`         | `pages/demo/DemoPage.tsx`           | Sample contracts released by the demo team, one per verdict, checked live; with the Snap installed, Send proposes the transaction so the wallet shows the same verdict.                                                                                                                      |
| `/demo/upgrade`     | `pages/demo/UpgradeDemoPage.tsx`    | An EIP-7702 account upgrade checked as a delegation before a throwaway in-memory key signs the authorization. Nothing is broadcast.                                                                                                                                                          |
| `/app/dev/verdicts` | `pages/dev/VerdictsPage.tsx`        | Every verdict card state; dev builds only.                                                                                                                                                                                                                                                   |

## How a verdict is shown

`VerdictCard` is the one place a result is drawn, and `explain`, `trustPath` and `notices` in `lib/shared/check/explain.ts` write all of its text, so the web, Snap, CLI and MCP say the same thing. Top to bottom:

- Severity (Verified, Released recently, Not verified, Don't sign), the role, a one-line title and body, the address.
- Per publisher, the trust path from `TrustPath`: publisher name → release key → release name → record → age. Each step is passed, needs care, failed or not checked, with the ENS name or key it refers to and the reason a step failed. This is how the name tree is made readable: the user sees which name, which key and which subname vouched for the address, and where the chain broke. Pinned publishers are listed first and open; others collapse.
- Notices from `notices`: part of the check didn't finish, the search for other publishers failed or was incomplete, too many publishers matched, publishers skipped to keep the check fast.
- Technical details, collapsed: release name, lookup name, resolver, code hash, implementation, blocks, each linked to the ENS explorer or Etherscan.

Screenshots: `docs/images/verdict-verified.webp` (passing), `docs/images/verdict-dont-sign.webp` (pulled release), `docs/images/wallet-flask-verified.webp` (the same check in MetaMask Flask), `docs/images/cut-a-key.gif` (cutting a key, then moving to a new one).

## States

- Check running: `CheckResult` shows what is being confirmed; after 10 seconds it says the public endpoints are slow and the check can take up to a minute. The Check button shows a spinner. Resubmitting the same address reruns the check.
- Check failed: `rpcErrorMessage` turns network, timeout and rate-limit errors into one sentence, with Try again.
- Unfinished results (an RPC error inside a verdict, or the index unavailable when no pinned publisher decided the result) are retried by `runCheck` after 1, 2 and 4 seconds before they are shown (`retryUntilFinished` in `lib/checker.ts`).
- Invalid address: inline error under the field, announced with `role="alert"`; the result region is `aria-live="polite"` and scrolls into view when a check finishes.
- Pins: empty state, a pin that does not resolve shows why, unpinning while the Snap is unreachable says the Snap still holds it. `RepinPrompt` appears when a pinned name now points to a different registry and asks for an explicit second confirmation before trusting it.
- Snap panel: looking for MetaMask, no wallet, not Flask (with a link to Flask), install (button reads Confirm in MetaMask while the wallet prompt is open), install failed, installed with the Snap's own pins.
- Publisher page: reading, unreadable, no ENSv2 registry, no release keys listed, release list unavailable (key status still shown, since it comes from ENS, not Arkiv), hidden index entries the key did not sign.

## Data

- `lib/rpc.ts`: one viem client over `failoverTransport` (`lib/shared/ens/client.ts`); `VITE_SEPOLIA_RPC_URL` goes first if set.
- `lib/pins.ts`: pins in `localStorage` through `useSyncExternalStore`, with an in-memory fallback when storage throws. `resolvePin` stores the registry the name points to at pin time.
- `lib/snap.ts`: Snap status, install and the `codemark_pin`/`codemark_unpin`/`codemark_pins` RPCs; pins added on the site are copied to the Snap when it is installed.
- `lib/config.ts`: `VITE_SEPOLIA_RPC_URL`, `VITE_ARKIV_ACCESS_KEY`, `VITE_SNAP_ID`, `VITE_ENS_EXPLORER_URL`, `VITE_REPO_URL`.

## Conventions

`/app` and `/demo` use one font, line icons from Tabler, a black ground and the brand orange; the landing page has its own scene. Sizes are in rem and viewport units, not px. UI primitives are in `src/ui`. Tests: `bun test` in `packages/web`.
