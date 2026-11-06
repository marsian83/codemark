import type { ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";

export function Step({
	n,
	title,
	needs,
	code,
	children,
}: {
	n: number;
	title: string;
	needs?: ReactNode;
	code?: string;
	children: ReactNode;
}) {
	return (
		<li className="flex gap-3">
			<span className="flex-center tabular mt-0.5 size-6 shrink-0 rounded-full border border-border-primary font-mono text-xs text-typography-tertiary">
				{n}
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<h3 className="font-medium">{title}</h3>
				<p className="text-sm text-typography-secondary">{children}</p>
				{code ? <CodeBlock code={code} /> : null}
				{needs ? (
					<p className="text-sm text-typography-tertiary">
						<span className="text-typography-secondary">Needs: </span>
						{needs}
					</p>
				) : null}
			</div>
		</li>
	);
}
