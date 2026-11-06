# snap

Runs inside MetaMask's SES sandbox: no Node or Bun APIs, no React, UI through `@metamask/snaps-sdk/jsx`. Needs MetaMask Flask because `endowment:network-access` is only allowed for allowlisted Snaps in stable MetaMask.

`onTransaction` decodes the transaction with `lib/shared/decode`: `to`, Safe `execTransaction` (outer address always checked, then the inner call), Safe `MultiSend` inner calls, Safe admin calls (enableModule, setGuard, ...) as delegatecall targets, ERC-7821 and DeleGator `execute` / `executeFromExecutor` batches (this is how `wallet_sendCalls` reaches the Snap, as a self-call), EIP-7702 authorization lists when MetaMask provides them, and ERC-20 / Permit2 spenders. Anything it cannot decode (bad MultiSend, nesting over 4 levels, unknown batch mode) becomes a delegatecall target, which the checker treats as critical. `onSignature` handles typed data only (Permit, Permit2, SafeTx including its `data`); `personal_sign` is ignored.

State kept with `snap_manageState`: pinned publishers and the check cache (written reload-then-merge so cache writes never clobber pins). `codemark_pin`, `codemark_unpin` and `codemark_pins` only accept the origins in `src/origins.ts`: localhost:3020 and `CODEMARK_SITE_ORIGIN` baked at build time (set it before `bun run --cwd snap build`).

Reads Sepolia through viem `fallback` over public RPCs with `fetch` (network-access), independent of the chain the wallet is on. `bun test` in snap/ exercises the handlers with mocked `snap`/`ethereum` globals; snaps-jest needs Jest and is not used. Safe MultiSend addresses in `lib/shared/decode/safeMultiSend.ts` were generated from `@safe-global/safe-deployments` (all versions, chain 11155111) to keep that package's ABI assets out of the Snap bundle.
