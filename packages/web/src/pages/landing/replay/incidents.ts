import type { TargetRole } from "@codemark/shared/check";
import { createElement, type ReactNode } from "react";
import { BinanceLogo, BybitLogo } from "./Logos";

export type IncidentStep = {
	label: string;
	at: string;
	title: string;
	happened: string;
	checkTitle: string;
	withCheck: string;
};

export type Incident = {
	id: "bybit" | "binance";
	logo: ReactNode;
	date: string;
	signers: number;
	signerLabel: string;
	walletLabel: string;
	payload: string;
	role: TargetRole;
	asset: { amount: number; unit: string };
	loss: string;
	checkSits: string;
	steps: IncidentStep[];
};

export const incidents: Incident[] = [
	{
		id: "bybit",
		logo: createElement(BybitLogo),
		date: "February 2025",
		signers: 3,
		signerLabel: "3 signers",
		walletLabel: "Bybit cold wallet",
		payload: "delegatecall 0x9622…7242",
		role: "delegatecall",
		asset: { amount: 401_000, unit: "ETH" },
		loss: "About $1.5B lost",
		checkSits:
			"The check reads the payload in the signer's wallet, so a replaced frontend can't hide it.",
		steps: [
			{
				label: "Frontend",
				at: "Feb 19",
				title: "The frontend is replaced",
				happened:
					"Malicious JavaScript goes into Safe{Wallet}, dormant for everyone except Bybit's cold wallet.",
				checkTitle: "No signature yet",
				withCheck: "Nothing to check yet. Codemark doesn't watch frontends.",
			},
			{
				label: "Screen",
				at: "Feb 21",
				title: "The screen shows a routine transfer",
				happened:
					"Signers start a planned move from cold to hot wallet, and that's what they see.",
				checkTitle: "The screen is still wrong",
				withCheck: "The check doesn't rely on what the screen says.",
			},
			{
				label: "Signatures",
				at: "Feb 21",
				title: "Three signers approve a different payload",
				happened:
					"It's a delegatecall to 0x9622…7242, a contract the attacker deployed three days earlier.",
				checkTitle: "The payload is checked",
				withCheck:
					"Codemark decodes it and finds a delegatecall to an address no publisher claims.",
			},
			{
				label: "Takeover",
				at: "Feb 21",
				title: "The wallet's logic is swapped",
				happened:
					"That contract overwrites slot 0 and points the wallet at 0xbDd0…9516. The multisig no longer applies.",
				checkTitle: "A critical warning",
				withCheck:
					"MetaMask makes the signer confirm twice. It's a warning, not a block.",
			},
			{
				label: "Drain",
				at: "Feb 21",
				title: "About 401,000 ETH leaves",
				happened:
					"The attacker calls the new contract's sweep functions and empties the wallet.",
				checkTitle: "The wallet stays as it was",
				withCheck:
					"If the signers stop at the warning, the wallet and its multisig don't change.",
			},
		],
	},
	{
		id: "binance",
		logo: createElement(BinanceLogo),
		date: "October 2026",
		signers: 1,
		signerLabel: "Signing service",
		walletLabel: "Binance 14 hot wallet",
		payload: "7702 delegation to sweeper",
		role: "delegation",
		asset: { amount: 167_464, unit: "ETH" },
		loss: "About $2.5B in the first sweep",
		checkSits:
			"Reports say the attacker controlled Binance's signing service, so the check has to run somewhere that service can't skip it.",
		steps: [
			{
				label: "Prep",
				at: "Oct 28",
				title: "The attacker prepares",
				happened:
					"Small Tornado Cash withdrawals fund a fresh operator wallet.",
				checkTitle: "No signature yet",
				withCheck: "Nothing to check yet.",
			},
			{
				label: "Sweeper",
				at: "Oct 29",
				title: "The sweeper is deployed",
				happened:
					"After rehearsing on its own wallets, the attacker deploys the final sweeper contract.",
				checkTitle: "No signature yet",
				withCheck: "The sweeper has no publisher, and it never will.",
			},
			{
				label: "Signatures",
				at: "Oct 29",
				title: "50 delegations are signed",
				happened:
					"Each one hands the wallet to the sweeper. Early reports point to a compromised signing service.",
				checkTitle: "The delegate is checked",
				withCheck:
					"Checked at signing, it comes back critical because no publisher claims it.",
			},
			{
				label: "Delegation",
				at: "20:20 UTC",
				title: "One nonce matches",
				happened:
					"One authorization matches the live nonce, and the hot wallet now runs the sweeper's code.",
				checkTitle: "Nothing to land",
				withCheck:
					"An authorization that was never signed can't land, so the wallet keeps its own code.",
			},
			{
				label: "Drain",
				at: "20:24 UTC",
				title: "One call empties the wallet",
				happened:
					"167,464 ETH and 63 tokens leave in one call. Four more sweeps follow before the delegation is revoked.",
				checkTitle: "The funds stay put",
				withCheck:
					"If signing stops at the check, none of these transfers can be sent this way.",
			},
		],
	},
];
