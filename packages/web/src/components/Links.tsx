import { useState } from "react";
import { Link } from "react-router-dom";
import { explorer, shortAddress } from "../lib/format";
import { Icon } from "../ui/Icon";
import { cn } from "../utils/cn";

export function CopyButton({
	value,
	label,
}: {
	value: string;
	label?: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			aria-label={copied ? "Copied" : `Copy ${label ?? value}`}
			className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-typography-tertiary transition-colors duration-150 hover:bg-background-raised hover:text-typography-primary"
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
			<Icon
				name={copied ? "check" : "copy"}
				className={cn("size-3.5", copied && "text-success")}
			/>
		</button>
	);
}

export function ExternalLink({
	href,
	children,
	className,
}: {
	href: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className={cn(
				"inline-flex items-center gap-0.5 text-typography-secondary underline decoration-border-primary underline-offset-4 transition-colors duration-150 hover:text-typography-primary hover:decoration-typography-tertiary",
				className,
			)}
		>
			{children}
			<Icon name="arrow-up-right" className="size-3.5" />
		</a>
	);
}

export function Address({
	value,
	short,
	external = true,
	className,
}: {
	value: string;
	short?: boolean;
	external?: boolean;
	className?: string;
}) {
	const text = short ? shortAddress(value) : value;
	return (
		<span
			className={cn(
				"inline-flex min-w-0 items-center gap-0.5 font-mono",
				className,
			)}
		>
			{external ? (
				<a
					href={explorer.address(value)}
					target="_blank"
					rel="noreferrer"
					title={value}
					className="min-w-0 break-all underline decoration-border-primary underline-offset-4 transition-colors duration-150 hover:decoration-typography-tertiary"
				>
					{text}
				</a>
			) : (
				<span className="min-w-0 break-all" title={value}>
					{text}
				</span>
			)}
			<CopyButton value={value} label="address" />
		</span>
	);
}

export function NameSegments({
	name,
	publisher,
	className,
}: {
	name: string;
	publisher?: string;
	className?: string;
}) {
	const tail = publisher && name.endsWith(publisher) ? publisher : undefined;
	const own = tail ? name.slice(0, -tail.length).replace(/\.$/, "") : name;
	const labels = own ? own.split(".") : [];
	const dotAfter = (i: number) => i < labels.length - 1 || tail !== undefined;
	return (
		<span
			className={cn(
				"inline-flex min-w-0 flex-wrap items-baseline font-mono",
				className,
			)}
		>
			{labels.map((label, i) => (
				<span
					key={labels.slice(0, i + 1).join(".")}
					className="text-typography-secondary"
				>
					{label}
					{dotAfter(i) ? (
						<span className="text-typography-tertiary/60">.</span>
					) : null}
				</span>
			))}
			{tail ? (
				<span className="font-medium text-typography-primary">{tail}</span>
			) : null}
		</span>
	);
}

export function PublisherLink({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	return (
		<Link
			to={`/app/p/${name}`}
			className={cn(
				"font-mono font-medium underline decoration-border-primary underline-offset-4 transition-colors duration-150 hover:decoration-typography-tertiary",
				className,
			)}
		>
			{name}
		</Link>
	);
}

export function BlockLink({
	block,
	external = true,
}: {
	block: bigint | number;
	external?: boolean;
}) {
	const text = Number(block).toLocaleString("en-US");
	return external ? (
		<a
			href={explorer.block(block)}
			target="_blank"
			rel="noreferrer"
			className="tabular font-mono underline decoration-border-primary underline-offset-4 hover:decoration-typography-tertiary"
		>
			{text}
		</a>
	) : (
		<span className="tabular font-mono">{text}</span>
	);
}
