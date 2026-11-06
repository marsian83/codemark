import {
	type Account,
	type Chain,
	createWalletClient,
	type Hex,
	http,
	type Transport,
	type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export const signerRoles = ["root", "sec", "ci"] as const;
export type SignerRole = (typeof signerRoles)[number];

export type Signer = WalletClient<Transport, Chain, Account>;
export type Signers = Partial<Record<SignerRole, Signer>>;

export function signerFromKey(privateKey: Hex, rpcUrl: string): Signer {
	return createWalletClient({
		account: privateKeyToAccount(privateKey),
		chain: sepolia,
		transport: http(rpcUrl),
	});
}

export function signersFromKeys(
	keys: Partial<Record<SignerRole, string | undefined>>,
	rpcUrl: string,
): Signers {
	const signers: Signers = {};
	for (const role of signerRoles) {
		const key = keys[role];
		if (key) signers[role] = signerFromKey(key as Hex, rpcUrl);
	}
	return signers;
}

export function requireSigner(signers: Signers, role: SignerRole): Signer {
	const signer = signers[role];
	if (!signer)
		throw new Error(
			`this command needs the ${role} signer (CODEMARK_${role.toUpperCase()}_KEY); nothing was sent`,
		);
	return signer;
}
