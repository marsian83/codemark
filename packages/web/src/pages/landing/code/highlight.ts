export type Tone =
	| "plain"
	| "dim"
	| "name"
	| "key"
	| "string"
	| "flag"
	| "good"
	| "bad"
	| "warn"
	| "release"
	| "field";

export type Token = { text: string; tone: Tone };

const lineStart: [Tone, RegExp][] = [
	["dim", /^\$/],
	["dim", /^\s*-\s/],
	["dim", /^[│├└─ ]+/],
	["field", /^\s*[\w-]+:(?=\s|$)/],
];

const inline: [Tone, RegExp][] = [
	["string", /"[^"]*"/],
	["key", /\$\{\{[^}]*\}\}/],
	["dim", /\s·\s/],
	["bad", /KEY REVOKED|PULLED|MISMATCH|[Kk]ey revoked|unmounted/],
	["warn", /Unknown|Vouched for|not pinned/],
	["good", /\bverified\b|\bproven\b|\bmounted\b/],
	["flag", /--[a-z-]+/],
	["name", /[\w-]+(?:\.[\w-]+)*\.eth\b/],
	["key", /\bci-\d\b/],
	["release", /\b[a-z]+[ -]\d+[.-]\d+[.-]\d+\b/],
	["string", /0x[0-9a-fA-F…]+/],
	["dim", /published \d+ \w+ ago|bunx @marsian\/codemark-cli/],
	["field", /[\w-]+:(?=\s|$)/],
];

export function highlight(text: string): Token[] {
	const tokens: Token[] = [];
	let rest = text;
	for (const [tone, rule] of lineStart) {
		const match = rest.match(rule);
		if (match?.[0]) {
			tokens.push({ text: match[0], tone });
			rest = rest.slice(match[0].length);
		}
	}
	while (rest) {
		let best: { index: number; length: number; tone: Tone } | null = null;
		for (const [tone, rule] of inline) {
			const match = rest.match(rule);
			if (match?.index === undefined || !match[0]) continue;
			if (!best || match.index < best.index) {
				best = { index: match.index, length: match[0].length, tone };
			}
		}
		if (!best) {
			tokens.push({ text: rest, tone: "plain" });
			break;
		}
		if (best.index > 0) {
			tokens.push({ text: rest.slice(0, best.index), tone: "plain" });
		}
		tokens.push({
			text: rest.slice(best.index, best.index + best.length),
			tone: best.tone,
		});
		rest = rest.slice(best.index + best.length);
	}
	return tokens;
}
