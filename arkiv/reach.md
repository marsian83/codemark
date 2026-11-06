# Reach

## Who it's for

- **People about to sign a contract call or an account upgrade.** The clearest case is a team's multisig signers. In February 2025, Bybit's signers approved a transaction that handed their wallet to an attacker's contract, because the page that built it had been swapped.
- **Teams shipping contracts,** who want a release they can withdraw everywhere in one transaction if a key leaks.
- **Wallet teams and people running AI agents that spend,** since nobody reads the signing screen when an agent signs.

## Would they use it?

Nobody outside our team uses it yet, because we built it this week. For signers, the bar is low: the lookup site needs no wallet or sign-up. Adoption has one real hurdle, which is that both sides have to join. Teams have to publish and wallets have to run the check, and until a team publishes, its contracts come back as unknown.

Arkiv matters for that hurdle. It's what lets a wallet say who claims a contract before its user has pinned anyone, so a new team can be found without being on a curated list.

## Can they try it today?

Yes, on Sepolia:

- **Lookup site:** [codemark.hetairoi.xyz](https://codemark.hetairoi.xyz). Paste an address or pick a demo contract. The results read from Arkiv and ENS live.
- **Publisher page:** [pwnmeswap.eth](https://codemark.hetairoi.xyz/app/p/pwnmeswap.eth) lists its releases from Arkiv.
- **Query it yourself:** see [how-you-use-arkiv.md](how-you-use-arkiv.md).

## Will we keep building it after Mumbai?

We've told ETHGlobal we're interested in grant and accelerator programs. The next steps are the ones this write-up says are missing:

- A monitor that extends rows before they expire.
- A live `cut` of a whole key. A live `pull` has already run.
- A move to mainnet, once the ENSv2 contracts we build on match there.
- A Snap that works outside MetaMask Flask, which needs MetaMask's allowlist.
