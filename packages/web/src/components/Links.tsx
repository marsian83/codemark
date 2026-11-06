import { useState } from "react";
import { Link } from "react-router-dom";
import { ensExplorer } from "../lib/ensExplorer";
import { explorer } from "../lib/format";

export function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			aria-label={`Copy ${value}`}
			className="ml-1.5 rounded border border-zinc-300 px-1 font-sans text-[11px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				} catch {
					setCopied(false);
				}
			}}
		>
			{copied ? "copied" : "copy"}
		</button>
	);
}

export function EnsLink({
	href,
	label = "ens",
}: {
	href: string;
	label?: string;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="ml-1.5 font-sans text-[11px] text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
		>
			{label}
		</a>
	);
}

export function Address({
	value,
	short,
	external = true,
	ens,
}: {
	value: string;
	short?: boolean;
	external?: boolean;
	ens?: "registry" | "resolver";
}) {
	const text = short ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
	return (
		<span className="break-all font-mono">
			{external ? (
				<a
					href={explorer.address(value)}
					target="_blank"
					rel="noreferrer"
					className="underline decoration-zinc-400 underline-offset-2"
				>
					{text}
				</a>
			) : (
				text
			)}
			<CopyButton value={value} />
			{ens && external ? <EnsLink href={ensExplorer[ens](value)} /> : null}
		</span>
	);
}

export function EnsName({
	name,
	roles,
	external = true,
}: {
	name: string;
	roles?: boolean;
	external?: boolean;
}) {
	return (
		<span>
			<Link
				to={`/p/${name}`}
				className="font-mono underline decoration-zinc-400 underline-offset-2"
			>
				{name}
			</Link>
			{external ? (
				<EnsLink
					href={roles ? ensExplorer.roles(name) : ensExplorer.name(name)}
				/>
			) : null}
		</span>
	);
}

export function BlockLink({
	block,
	external = true,
}: {
	block: bigint | number;
	external?: boolean;
}) {
	return external ? (
		<a
			href={explorer.block(block)}
			target="_blank"
			rel="noreferrer"
			className="underline decoration-zinc-400 underline-offset-2"
		>
			{block.toString()}
		</a>
	) : (
		<>{block.toString()}</>
	);
}
