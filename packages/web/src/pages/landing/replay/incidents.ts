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
	setupTag: string;
	payload: string;
	role: TargetRole;
	asset: { amount: number; unit: string };
	loss: string;
	checkSits: string;
	sources: { label: string; url: string }[];
	steps: IncidentStep[];
};

export const incidents: Incident[] = [
	{
		id: "bybit",
		logo: createElement(BybitLogo),
		date: "February 2025",
		signers: 3,
		signerLabel: "3 signers",
		walletLabel: "Cold wallet",
		setupTag: "On screen: routine transfer",
		payload: "Really: delegatecall 0x9622…7242",
		role: "delegatecall",
		asset: { amount: 401_000, unit: "ETH" },
		loss: "About $1.5B lost",
		checkSits:
			"Codemark reads the transaction in the signer's wallet, so a tampered page can't hide it.",
		sources: [
			{
				label: "NCC Group",
				url: "https://www.nccgroup.com/research/in-depth-technical-analysis-of-the-bybit-hack/",
			},
			{
				label: "Sygnia",
				url: "https://www.sygnia.co/blog/sygnia-investigation-bybit-hack/",
			},
		],
		steps: [
			{
				label: "Fake screen",
				at: "Feb 21",
				title: "Signers see a routine transfer",
				happened:
					"A tampered Safe{Wallet} page shows a planned move from cold to hot wallet.",
				checkTitle: "Codemark ignores the page",
				withCheck: "It reads the transaction, not what the page shows.",
			},
			{
				label: "Signatures",
				at: "Feb 21",
				title: "Three signers approve it",
				happened:
					"It's really a delegatecall to 0x9622…7242, a contract the attacker deployed.",
				checkTitle: "Codemark checks the target",
				withCheck: "No team published 0x9622…7242, so the wallet warns them.",
			},
			{
				label: "Takeover",
				at: "Feb 21",
				title: "The attacker takes over the wallet",
				happened:
					"The call replaces the wallet's logic. The multisig no longer applies.",
				checkTitle: "Signers see a critical warning",
				withCheck:
					"They have to acknowledge it to continue. It's a warning, not a block.",
			},
			{
				label: "Drain",
				at: "Feb 21",
				title: "About 401,000 ETH is gone",
				happened: "The attacker empties the wallet.",
				checkTitle: "The funds stay put",
				withCheck: "If the signers stop at the warning, nothing changes.",
			},
		],
	},
	{
		id: "binance",
		logo: createElement(BinanceLogo),
		date: "October 2026",
		signers: 1,
		signerLabel: "Withdrawal service",
		walletLabel: "Hot wallet",
		setupTag: "Attacker deploys a sweeper",
		payload: "EIP-7702 delegation to sweeper",
		role: "delegation",
		asset: { amount: 167_464, unit: "ETH" },
		loss: "About $6.3B drained in total",
		checkSits:
			"Binance's first findings point to a compromised service, not a leaked key. The check has to run where that service can't skip it.",
		sources: [
			{
				label: "Hypernative",
				url: "https://www.hypernative.io/insights/blog/inside-the-largest-crypto-theft-of-all-time-the-6-3b-binance-hot-wallet-drain",
			},
			{
				label: "DRK",
				url: "https://drk.vc/news/binance-14-eip-7702-drain",
			},
		],
		steps: [
			{
				label: "Sweeper",
				at: "Oct 29",
				title: "The attacker deploys a sweeper",
				happened:
					"It's a contract built to empty a wallet, rehearsed first on the attacker's own wallets.",
				checkTitle: "Nothing to check yet",
				withCheck: "No team will ever publish the sweeper, so it can't pass.",
			},
			{
				label: "Signatures",
				at: "Oct 29",
				title: "50 delegations get signed",
				happened:
					"Each one hands the hot wallet to the sweeper, through what Binance says was a compromised laptop.",
				checkTitle: "Codemark checks the delegate",
				withCheck: "No team published it, so the result is critical.",
			},
			{
				label: "Delegation",
				at: "20:20 UTC",
				title: "One signature goes live",
				happened:
					"It matches the wallet's nonce, so the hot wallet now runs the sweeper's code.",
				checkTitle: "Nothing goes live",
				withCheck: "Without a signature, the wallet keeps its own code.",
			},
			{
				label: "Drain",
				at: "20:24 UTC",
				title: "One call empties the wallet",
				happened:
					"167,464 ETH and 63 tokens leave at once. Four more sweeps follow.",
				checkTitle: "The funds stay put",
				withCheck: "If signing stops at the check, this transfer can't happen.",
			},
		],
	},
];
