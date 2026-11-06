import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAddress } from "viem";
import { config } from "../../../lib/config";
import { actionVariants } from "../Action";

const productLinks = [
	{ to: "/app", label: "Check a contract" },
	{ to: "/app/demo-wallet", label: "Upgrade demo" },
];

const sourceLinks = [
	{ href: config.repoUrl, label: "GitHub" },
	{ href: `${config.repoUrl}#github-action`, label: "Setup guide" },
];

export function Closing() {
	const navigate = useNavigate();
	const [address, setAddress] = useState("");
	const [error, setError] = useState("");

	function submit(event: FormEvent) {
		event.preventDefault();
		const value = address.trim();
		if (!isAddress(value)) {
			setError("Address must start with 0x and have 42 characters");
			return;
		}
		navigate(`/app?a=${value}&role=call`);
	}

	return (
		<footer className="relative mx-auto min-h-dvh w-full max-w-[84rem] px-5 sm:px-10">
			<div className="pt-22 sm:pt-24">
				<div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
					<div className="min-w-0">
						<h2 className="max-w-4xl font-display text-[clamp(2.125rem,min(4.2vw,7.5dvh),3.75rem)] leading-[1.06]">
							Paste an address and see who published it
						</h2>
						<form
							onSubmit={submit}
							noValidate
							className="cartouche mt-6 flex max-w-2xl flex-wrap gap-2 bg-night/90 p-2.5 [--chamfer:0.75rem] sm:mt-5"
						>
							<label
								htmlFor="closing-address"
								className="w-full text-sm font-medium"
							>
								Contract address
							</label>
							<input
								id="closing-address"
								value={address}
								onChange={(event) => {
									setAddress(event.target.value);
									setError("");
								}}
								placeholder="0x…"
								spellCheck={false}
								autoComplete="off"
								aria-invalid={Boolean(error)}
								aria-describedby={error ? "closing-address-error" : undefined}
								className="cartouche h-12 min-w-0 flex-1 basis-64 bg-night-3 px-4 font-label text-sm text-sand outline-none placeholder:text-sand-3 focus-visible:bg-night-2"
							/>
							<button
								type="submit"
								className={actionVariants({ tone: "sand" })}
							>
								Check address
							</button>
						</form>
						{error ? (
							<p
								id="closing-address-error"
								className="cartouche mt-2 w-fit bg-night px-3 py-1.5 text-sm text-flare [--chamfer:0.25rem]"
							>
								{error}
							</p>
						) : null}
					</div>
					<nav className="cartouche grid grid-cols-2 gap-x-8 gap-y-4 self-start bg-night/90 p-4 text-sm font-medium [--chamfer:0.75rem]">
						<ul className="flex flex-col gap-3">
							{productLinks.map((link) => (
								<li key={link.to}>
									<Link to={link.to} className="hover:underline">
										{link.label}
									</Link>
								</li>
							))}
						</ul>
						<ul className="flex flex-col gap-3">
							{sourceLinks.map((link) => (
								<li key={link.label}>
									<a
										href={link.href}
										target="_blank"
										rel="noreferrer"
										className="hover:underline"
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				</div>
			</div>
		</footer>
	);
}
