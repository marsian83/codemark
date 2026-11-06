import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "../lib/format";
import { installSnap, snapPins, snapStatus } from "../lib/snap";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { ExternalLink } from "./Links";

export function useSnapStatus() {
	return useQuery({
		queryKey: ["snap-status"],
		queryFn: snapStatus,
		retry: false,
	});
}

const flask = (
	<ExternalLink href="https://metamask.io/flask/">MetaMask Flask</ExternalLink>
);

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
		<Card className="flex flex-col gap-3 p-5">
			<div className="flex items-center justify-between gap-2">
				<h2 className="flex items-center gap-2 font-medium">
					<Icon name="puzzle" className="text-typography-tertiary" />
					MetaMask Snap
				</h2>
				{installed ? <Badge tone="success">Installed</Badge> : null}
			</div>
			<p className="text-sm text-typography-secondary">
				Runs this same check inside MetaMask on every transaction, before you
				sign.
			</p>
			{status.isPending ? (
				<p className="text-sm text-typography-tertiary">
					Looking for MetaMask…
				</p>
			) : null}
			{status.isError ? (
				<p className="text-sm text-typography-secondary">
					Couldn't reach your wallet. Unlock MetaMask and reload the page.
				</p>
			) : null}
			{status.data === "no-wallet" || status.data === "not-flask" ? (
				<p className="text-sm text-typography-secondary">
					{status.data === "no-wallet"
						? "No browser wallet found. "
						: "Your MetaMask isn't the Flask build. "}
					Install {flask} to run this check in your wallet.
				</p>
			) : null}
			{status.data === "not-installed" ? (
				<>
					<Button
						variant="accent"
						loading={install.isPending}
						onClick={() => install.mutate()}
					>
						{install.isPending ? "Confirm in MetaMask" : "Install the Snap"}
					</Button>
					{install.isError ? (
						<p role="alert" className="text-sm text-error">
							Couldn't install the Snap. Open MetaMask, then select Install the
							Snap again.
						</p>
					) : null}
				</>
			) : null}
			{installed ? (
				<div className="flex flex-col gap-1.5">
					<span className="text-xs text-typography-tertiary">
						Publishers pinned in the Snap
					</span>
					{pins.isError ? (
						<p role="alert" className="text-sm text-error">
							Couldn't read the Snap's pins. {errorMessage(pins.error)}
						</p>
					) : null}
					{pins.data?.length === 0 ? (
						<p className="text-sm text-typography-secondary">
							None yet. Pins you add here are copied to the Snap.
						</p>
					) : null}
					<ul className="flex flex-col gap-0.5">
						{pins.data?.map((p) => (
							<li key={p.name} className="tabular text-sm">
								{p.name}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</Card>
	);
}
