# codemark-mcp

Payment security for AI agents. Before your agent signs an approval, a swap or an account upgrade, this MCP server checks who released the contracts involved, under their ENS name, and whether that team still stands behind them. Runs on ENSv2 on Sepolia.

Nobody reads the signing screen when an agent signs. A web page can hand it a lookalike router or tell it to upgrade the account to an attacker's contract. This server gives the agent a clear answer before it signs.

Needs [Bun](https://bun.sh) 1.4.2 or newer. It holds no keys and signs nothing.

## Set it up

Get the pin for each team you trust:

```sh
bunx @marsian83/codemark-mcp pin pwnmeswap.eth
```

Add the server to your agent's MCP configuration, with the line that printed:

```json
{
	"mcpServers": {
		"codemark": {
			"command": "bunx",
			"args": ["@marsian83/codemark-mcp"],
			"env": {
				"CODEMARK_PINS": "pwnmeswap.eth=0x8a8d97f3F4d1235c62aE61cDB3644f574162d204"
			}
		}
	}
}
```

Separate several pins with commas. Only you can add a pin; the agent has no tool for it. `.env` files are ignored, so a repository your agent opens can't change your pins.

| Variable           | What it is                                               |
| ------------------ | -------------------------------------------------------- |
| `CODEMARK_PINS`    | The publishers you trust, each as `name.eth=0xRegistry`. |
| `SEPOLIA_RPC_URL`  | Optional. Defaults to a public Sepolia endpoint.         |
| `ARKIV_ACCESS_KEY` | Optional. Lifts the public search index's rate limit.    |

## What your agent gets

Two tools: `check_transaction` for transactions, batches and EIP-7702 authorizations, and `check_signature` for Permit, Permit2 and Safe signatures. Both return one of three actions:

| Action     | When                                                                                                                                                | What the agent should do               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `proceed`  | A team you pinned released every contract, and each release is over an hour old (a day for account upgrades).                                       | Sign, within its usual spending limits |
| `ask_user` | A contract is unknown, is vouched for only by a team you haven't pinned, or was released in the last hour. Also when there is no contract to check. | Stop and ask you                       |
| `refuse`   | The team pulled the release or revoked its key, your pin no longer matches, an account upgrade isn't trusted, or the check couldn't finish.         | Don't sign, and tell you why           |

## What it doesn't do

- **It doesn't check amounts or recipients.** A plain transfer to an address has no contract to check, so it returns `ask_user`. Keep your agent's spending limits.
- **It helps an honest agent, not a hijacked one.** An agent under an attacker's control can skip the check. Stopping that takes enforcement in the signer.
- **It only checks Sepolia today.** Mainnet ENSv2 runs a different deployment.
- **It doesn't assess code.** It tells you who released a contract, not what the contract does.

Full guide: <https://codemark.hetairoi.xyz/app/docs>. Source: <https://github.com/marsian83/codemark>.
