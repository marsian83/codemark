import { CopyButton } from "../../components/Links";

export function CodeBlock({ code, label }: { code: string; label?: string }) {
	return (
		<div className="relative rounded-lg border border-border-secondary bg-background-raised">
			<pre className="overflow-x-auto py-3 pr-12 pl-4 font-mono text-sm text-typography-primary">
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
		<code className="rounded-md bg-background-raised px-1 py-0.5 font-mono text-sm text-typography-primary">
			{children}
		</code>
	);
}
