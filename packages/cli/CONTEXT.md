# cli

Three signers, never interchangeable:

- root: the publisher's 1-of-1 Safe (`CODEMARK_SAFE`, owner `CODEMARK_ROOT_KEY`), created by `init` with the canonical v1.4.1 `CompatibilityFallbackHandler` so it can receive ERC-1155 registry tokens. It holds every role on the publisher and key registries and owns every name. Every role-gated root call goes through one Safe `execTransaction` (`safe/batch.ts`, protocol-kit; several calls are batched through the canonical `MultiSendCallOnly`): `setParent` in `init`; mount a key in `add-key` (`setParent` + `register` + `setSubregistry` + `codemark.keys`, one transaction, so `linkBlock` is its block); `pull` (both unregisters and both reserves in one transaction, so its `ensTx` holds `LabelUnregistered` for the version and the forward name); delegate publishes (both registrations in one transaction). The owner EOA pays for things that need no role: VerifiableFactory deployments (grants name the Safe), MockUSDC, and the ETHRegistrar commit and register (with owner = Safe).
- sec: a hardware key with `ROLE_UNREGISTER` on the publisher and key registries. Used for `cut` (one `unregister` of the key's label) and for writing incident rows to Arkiv.
- ci: the release pipeline's hot key with `ROLE_REGISTRAR` on one key registry only. Used for `publish`. It can add names and nothing else.

A command that needs a signer or the Safe it was not given fails before sending anything (`requireSigner`, `requireRoot`).

Guards that mirror the checker, so the CLI never publishes something that cannot verify:

- `add-key` and `migrate` need an explicit `--ci <address>` or `--root-only`. A `delegates` key (`delegates`, `delegates-N`) never gets a CI grant, and the CI address may not be the sec key, the Safe or its owner (`checkCiGrant`). `migrate` keeps a root-only key root-only (`checkMigrationGrant`, from the old registry's `ROLE_REGISTRAR` assignee count).
- `publish` refuses before sending (`publishProblem`, reusing the checker's `codeProblem`): 7702-delegated targets, beacon proxies, a delegate under a key where root is not the sole `ROLE_REGISTRAR`, a signer that holds both `ROLE_REGISTRAR` and `ROLE_UNREGISTER`, or a record the schema rejects. It also refuses burned labels (`isBurned`: nonzero token version or a past expiry; a re-registration can never verify) and taken ones: one artifact has one forward name per key.
- `pull` always derives the forward name from the release's `addr` (or `--target` once the version name is gone), refuses a `--forward` that differs, requires both live names to share a resolver, and finishes a half-done pull (`planPull`).
- `publish` is not atomic (resolver, registrations, Arkiv row). If a registration fails it names what did register; a re-run with the same arguments registers only the missing forward name on the existing resolver (`planRegistration`). The CLI never touches a release resolver after publish: the checker treats any later record or role log as MISMATCH.
- An Arkiv failure never hides chain results: `publish`/`pull`/`cut` print the JSON with `arkiv.status: "failed"` and the row, save it to `codemark-pending-*.json` and exit 3; `codemark arkiv-retry <file>` writes it later. `cut` unregisters first and only then looks up `linkBlock`.

Every user-supplied name and label is ENSIP-15 normalised (`normalizeName`/`normalizeLabel` in `lib/shared/names.ts`) at the start of each op; input that cannot be normalised is refused.

`migrate <publisher> <old> <new>` mounts the new key (dropping the old one from `codemark.keys` in the same Safe transaction), finds the old key registry and its link block even after a cut (from `LabelRegistered`/`SubregistryUpdated` logs), scans the old registry from that block, republishes each live release the old key's forward name still points to. Everything not migrated is listed. Re-running it resumes. `verify <address>` is a thin wrapper over `checkTargets`.

`env.ts` reads one `.env` file explicitly (values already in the environment win), the same file `init` writes `CODEMARK_SAFE` to: `CODEMARK_ENV_FILE` if set, `./.env` in the bundled npm build (`build` defines `CODEMARK_BUNDLED`), otherwise `codemark/.env` at the repository root. It rejects a `CODEMARK_SAFE` with a bad EIP-55 checksum. The Safe's salt is derived from its owner, so `init` (and `ensureRootSafe`) find the same Safe again instead of deploying another.

Commands keep no local state: registries are found by walking ENS from the root registry. `ops/*` hold the logic and are shared with `demo/scripts` and the spike tests; `commands/*` only parse flags. Receipts are awaited by polling `eth_getTransactionReceipt` (`lib/tx.ts`), not viem's block watcher, which never fires if a shared Anvil fork is reverted to a lower block. CI registrations are simulated together, then sent with consecutive nonces (`sendTogether`) so they usually share a block; on a fork `sameBlock` forces it.

`.github/actions/codemark-publish` wraps `bun cli publish` for CI; `.github/workflows/release.example.yml` shows it on a tag push.
