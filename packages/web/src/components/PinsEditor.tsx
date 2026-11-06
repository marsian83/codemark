import {
	parsePublisherName,
	resolvePubRegistry,
} from "@codemark/shared/ens/publisher";
import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { ensFor } from "../lib/checker";
import { usePins } from "../lib/pins";
import { snapPin, snapUnpin } from "../lib/snap";
import { useSnapStatus } from "./SnapPanel";

const input =
	"min-w-0 rounded border border-zinc-300 bg-transparent px-2 py-1.5 font-mono text-sm dark:border-zinc-700";
const button =
	"rounded border border-zinc-400 px-3 py-1.5 text-sm dark:border-zinc-600";

export default function PinsEditor() {
	const { pins, add, remove } = usePins();
	const client = useQueryClient();
	const installed = useSnapStatus().data === "installed";
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	async function submit(event: FormEvent) {
		event.preventDefault();
		setError("");
		setBusy(true);
		try {
			const parsed = parsePublisherName(name);
			const pubRegistry = await resolvePubRegistry(ensFor("sepolia"), parsed);
			add({ name: parsed, pubRegistry });
			if (installed) {
				await snapPin(parsed);
				await client.invalidateQueries({ queryKey: ["snap-pins"] });
			}
			setName("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setBusy(false);
		}
	}

	return (
		<section>
			<h2 className="text-sm font-semibold">Pinned publishers</h2>
			<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
				Stored in this browser only. Pinning records the registry the name
				points to now; if it later changes, results are critical until you pin
				again. Only a pinned publisher's revocation is critical.
			</p>
			{pins.length > 0 ? (
				<ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
					{pins.map((pin) => (
						<li
							key={pin.name}
							className="flex flex-wrap items-center justify-between gap-2 py-1.5"
						>
							<span className="min-w-0 break-all font-mono text-sm">
								{pin.name}{" "}
								<span className="text-zinc-500">{pin.pubRegistry}</span>
							</span>
							<button
								type="button"
								className={button}
								onClick={async () => {
									remove(pin.name);
									if (!installed) return;
									try {
										await snapUnpin(pin.name);
										await client.invalidateQueries({ queryKey: ["snap-pins"] });
									} catch (cause) {
										setError(
											cause instanceof Error ? cause.message : String(cause),
										);
									}
								}}
							>
								Remove
							</button>
						</li>
					))}
				</ul>
			) : (
				<p className="mt-2 text-sm">No publishers pinned.</p>
			)}
			<form onSubmit={submit} className="mt-3 flex flex-wrap gap-2">
				<input
					className={`${input} w-40 grow`}
					placeholder="acmeswap.eth"
					aria-label="Publisher name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<button
					type="submit"
					className={button}
					disabled={busy || !name.trim()}
				>
					{busy ? "Resolving…" : "Pin"}
				</button>
			</form>
			{error ? (
				<p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
			) : null}
		</section>
	);
}
