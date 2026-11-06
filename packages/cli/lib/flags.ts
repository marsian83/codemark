import { type Address, getAddress, isAddress } from "viem";

export type Flags = Record<string, unknown>;

export function stringFlag(flags: Flags, name: string): string | undefined {
	const value = flags[name];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function requireFlag(flags: Flags, name: string): string {
	const value = stringFlag(flags, name);
	if (!value) throw new Error(`--${name} is required`);
	return value;
}

export function addressFlag(flags: Flags, name: string): Address | undefined {
	const value = stringFlag(flags, name);
	if (value === undefined) return undefined;
	if (!isAddress(value, { strict: false }))
		throw new Error(`--${name} is not an address`);
	return getAddress(value);
}

export function requireArgs(args: string[], names: string[]): string[] {
	if (args.length < names.length)
		throw new Error(`usage: ${names.map((n) => `<${n}>`).join(" ")}`);
	return args.slice(0, names.length);
}

export function ciGrantFlag(flags: Flags): Address | undefined {
	const ci = addressFlag(flags, "ci");
	const rootOnly = flags["root-only"] === true;
	if (ci && rootOnly)
		throw new Error("pass either --ci or --root-only, not both");
	if (!ci && !rootOnly)
		throw new Error(
			"pass --ci <address> to grant a CI key ROLE_REGISTRAR, or --root-only for a key only root publishes under (delegates)",
		);
	return ci;
}
