import { cn } from "../../../utils/cn";
import { highlight, type Tone } from "./highlight";

const toneClass: Record<Tone, string> = {
	plain: "text-sand",
	dim: "text-sand-3",
	name: "text-sky",
	key: "text-fox",
	string: "text-gold",
	flag: "text-sand-2",
	good: "text-signal",
	bad: "text-flare",
	warn: "text-fox",
	release: "text-gold",
	field: "text-sky",
};

export function Code({
	text,
	className,
}: {
	text: string;
	className?: string;
}) {
	return (
		<code className={cn("font-label", className)}>
			{highlight(text).map((token, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: tokens are derived from the text and never reorder
					key={index}
					className={toneClass[token.tone]}
				>
					{token.text}
				</span>
			))}
		</code>
	);
}
