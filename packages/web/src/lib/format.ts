export function shortAddress(value: string): string {
	return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	year: "numeric",
});

export function formatTimestamp(seconds: number): string {
	return dateFormat.format(new Date(seconds * 1000));
}

export function formatDay(seconds: number): string {
	return dayFormat.format(new Date(seconds * 1000));
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
		return "Couldn't reach Sepolia. Public endpoints are rate limited, so try again in a moment.";
	}
	return text;
}
