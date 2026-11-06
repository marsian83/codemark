import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rpcErrorMessage } from "../lib/format";
import { installSnap, snapPins, snapStatus } from "../lib/snap";

export function useSnapStatus() {
	return useQuery({
		queryKey: ["snap-status"],
		queryFn: snapStatus,
		retry: false,
	});
}

export default function SnapPanel() {
	const client = useQueryClient();
	const status = useSnapStatus();
	const installed = status.data === "installed";
	const pins = useQuery({
		queryKey: ["snap-pins"],
		queryFn: snapPins,
		enabled: installed,
		retry: false,
	});
	const install = useMutation({
		mutationFn: installSnap,
		onSuccess: () => client.invalidateQueries({ queryKey: ["snap-status"] }),
	});

	return (
		<section>
			<h2 className="text-sm font-semibold">MetaMask Snap</h2>
			<div className="mt-1 space-y-2 text-sm">
				{status.isPending ? <p>Looking for MetaMask…</p> : null}
				{status.isError ? (
					<p>No wallet detected: {rpcErrorMessage(status.error)}</p>
				) : null}
				{status.data === "no-wallet" ? (
					<p>
						No browser wallet found. The Snap requires{" "}
						<a
							className="underline underline-offset-2"
							href="https://metamask.io/flask/"
							target="_blank"
							rel="noreferrer"
						>
							MetaMask Flask
						</a>
						.
					</p>
				) : null}
				{status.data === "not-flask" ? (
					<p>
						Requires{" "}
						<a
							className="underline underline-offset-2"
							href="https://metamask.io/flask/"
							target="_blank"
							rel="noreferrer"
						>
							MetaMask Flask
						</a>
						. The connected wallet is not Flask.
					</p>
				) : null}
				{status.data === "not-installed" ? (
					<>
						<p>
							The Snap checks transactions in MetaMask before you sign them.
						</p>
						<button
							type="button"
							className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
							disabled={install.isPending}
							onClick={() => install.mutate()}
						>
							{install.isPending ? "Waiting for MetaMask…" : "Install Snap"}
						</button>
						{install.isError ? (
							<p role="alert" className="text-red-700 dark:text-red-400">
								Install failed. {rpcErrorMessage(install.error)}
							</p>
						) : null}
					</>
				) : null}
				{installed ? (
					<>
						<p>Installed. Pins held by the Snap:</p>
						{pins.isError ? (
							<p role="alert" className="text-red-700 dark:text-red-400">
								Could not read Snap pins. {rpcErrorMessage(pins.error)}
							</p>
						) : null}
						{pins.data && pins.data.length === 0 ? <p>None.</p> : null}
						<ul className="font-mono text-xs">
							{pins.data?.map((p) => (
								<li key={p.name} className="break-all">
									{p.name} {p.pubRegistry}
								</li>
							))}
						</ul>
					</>
				) : null}
			</div>
		</section>
	);
}
