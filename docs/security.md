# Security model and known limits

| Attacker | Outcome |
|---|---|
| Phishing clone with its own contract or delegate | UNKNOWN, or "vouched for" by a lookalike publisher; critical for delegations and delegatecall targets |
| Forged or spam Arkiv rows | Fail the creator and on-chain checks. Flooding yields "index flooded", never green; pinned lookups skip the index |
| Stolen CI key | Can publish non-delegate releases until cut. Cannot alter passing releases, publish delegates or revive pulled labels. Can grief by reserving labels, which root clears |
| Stolen sec key | Can pull, cut or clear reservations: a visible denial of service. Cannot publish |
| Stolen root | Total. Use a multisig |
| Arkiv down | Pinned lookups still resolve on-chain, but without the indexed proof blocks a release is VERIFIED-unproven: a warning, critical for delegations. Open discovery returns UNKNOWN; never a false green |

Limits:

- The Snap runs only in MetaMask Flask. Without it, the lookup site runs the same checker in your browser.
- Both sides must adopt it: teams must publish and wallets must run the check. Dapps cannot request arbitrary 7702 delegations, so wallet teams call the checker before their "upgrade account" prompt.
- Lookalikes are reduced by pinning, not removed.
- A pull or cut is final for the label: a pulled label cannot be reused, and a cut key is never renewed, only replaced with `migrate`.
- A cut withdraws that key's good releases too until `migrate` republishes them.
- The sec key's emergency `unregister` leaves a window before root reserves the label in which a CI key can re-register it; the checker treats a release registered after a pull incident as MISMATCH.
- A key that lapses makes its releases UNKNOWN.
- Beacon proxies, diamonds and factory-made contracts are "not attested".
- Mainnet is out of scope: Sepolia runs contracts-v2 commit `07e55a05`, mainnet a different one.
- Privacy: Arkiv sees the queried artifact and client IP, and the RPC sees the checked name. There is no read-privacy claim.
- Codemark does not assess code behaviour.
- The MCP server protects an honest agent that was handed a bad address. A hijacked agent can skip the check; stopping that takes enforcement in the signer. It does not check amounts or recipients, so a plain transfer returns `ask_user`.
