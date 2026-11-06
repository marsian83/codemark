# codemark

Check who released a contract before you sign, and release your own contracts, frontends and account upgrades under your team's ENS name. Runs on ENSv2 on Sepolia.

Needs [Bun](https://bun.sh) 1.4.2 or newer.

## Check a contract

```sh
bunx @marsian/codemark-cli verify 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E --pin pwnmeswap.eth
```

`--pin` names the publishers you trust. The command exits 0 when the contract is fine, 1 for a warning and 2 when you shouldn't sign. Add `--role delegation` to check an account upgrade, or `--json` for machine-readable output.

## Release your own

Run it from your project folder:

```sh
bunx @marsian/codemark-cli init yourteam --years 1                  # register yourteam.eth and set up the team Safe
bunx @marsian/codemark-cli add-key yourteam.eth ci-1 --ci 0x…       # let your CI address release under ci-1
bunx @marsian/codemark-cli publish yourteam.eth ci-1 --component router --version 1.0.0 --target 0x…
```

If something goes wrong, `pull` withdraws one release and `cut` withdraws everything a key released, in one transaction each.

Keys come from the environment or from `.env` in the current folder:

| Variable            | What it is                                           |
| ------------------- | ---------------------------------------------------- |
| `CODEMARK_ROOT_KEY` | Owns the team Safe. Keep it offline.                 |
| `CODEMARK_SEC_KEY`  | Can only revoke keys and pull releases.              |
| `CODEMARK_CI_KEY`   | Can only add releases. Give this one to CI.          |
| `SEPOLIA_RPC_URL`   | Optional. Defaults to a public Sepolia endpoint.     |
| `ARKIV_ACCESS_KEY`  | Optional. Raises the rate limit on the public index. |

Every key needs a little Sepolia ETH. `init` registers the name and sets up the team Safe for you. The CI key also needs funds on Arkiv's Rabdi testnet to add each release to the search index; without them the release still checks out for anyone who pins you, and `bunx @marsian/codemark-cli arkiv-retry` adds the entry later.

Full guide: <https://codemark.hetairoi.xyz/app/docs>. Source: <https://github.com/marsian83/codemark>.
