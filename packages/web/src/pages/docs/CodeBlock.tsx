import { CopyButton } from "../../components/Links";

export function CodeBlock({ code, label }: { code: string; label?: string }) {
	return (
		<div className="relative rounded-lg border border-border-secondary bg-background-container">
			<pre className="overflow-x-auto py-3 pr-12 pl-4 font-label text-[0.8125rem] leading-6 text-typography-primary">
				<code>{code}</code>
			</pre>
			<div className="absolute top-2 right-2">
				<CopyButton value={code} label={label ?? "command"} />
			</div>
		</div>
	);
}

export function Mono({ children }: { children: React.ReactNode }) {
	return (
		<code className="rounded bg-background-raised px-1.5 py-0.5 font-sans text-[0.9em] text-typography-primary sm:whitespace-nowrap">
			{children}
		</code>
	);
}
