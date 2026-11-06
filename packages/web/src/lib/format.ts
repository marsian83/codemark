export function shortAddress(value: string): string {
	return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export function formatDuration(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	if (s < 60) return `${s} s`;
	if (s < 3600) return `${Math.floor(s / 60)} min`;
	if (s < 86400) {
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		return m ? `${h} h ${m} min` : `${h} h`;
	}
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	return h ? `${d} d ${h} h` : `${d} d`;
}

export function formatTimestamp(seconds: number): string {
	return new Date(seconds * 1000).toISOString().replace(".000Z", "Z");
}

export function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message.split("\n")[0] ?? "";
	return String(error);
}

export const explorer = {
	address: (a: string) => `https://sepolia.etherscan.io/address/${a}`,
	block: (b: bigint | number | string) =>
		`https://sepolia.etherscan.io/block/${b}`,
	tx: (h: string) => `https://sepolia.etherscan.io/tx/${h}`,
};

export function rpcErrorMessage(error: unknown): string {
	const text = errorMessage(error);
	if (/fetch|network|failed to|timeout|429|rate/i.test(text)) {
		return `Could not reach the RPC (${text}). Public Sepolia endpoints are rate limited; retry in a moment or set VITE_SEPOLIA_RPC_URL.`;
	}
	return text;
}
