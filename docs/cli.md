# CLI and GitHub Action

Every command and flag for publishing releases. For a first run, start with the [guide on the site](https://codemark.hetairoi.xyz/app/docs).

## CLI

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

## GitHub Action

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
