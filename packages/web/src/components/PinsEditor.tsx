import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { errorMessage, shortAddress } from "../lib/format";
import { resolvePin, usePins } from "../lib/pins";
import { snapPin, snapUnpin } from "../lib/snap";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Input } from "../ui/Input";
import { PublisherLink } from "./Links";
import { useSnapStatus } from "./SnapPanel";

export default function PinsEditor() {
	const { pins, add, remove } = usePins();
	const client = useQueryClient();
	const installed = useSnapStatus().data === "installed";
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	async function syncSnap(action: () => Promise<unknown>) {
		if (!installed) return;
		await action();
		await client.invalidateQueries({ queryKey: ["snap-pins"] });
	}

	async function submit(event: FormEvent) {
		event.preventDefault();
		setError("");
		setBusy(true);
		try {
			const pin = await resolvePin(name);
			add(pin);
			await syncSnap(() => snapPin(pin.name));
			setName("");
		} catch (cause) {
			setError(
				`Couldn't pin ${name.trim()}. Check the name and try again. ${errorMessage(cause)}`,
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Card className="flex flex-col gap-4 p-5">
			<div className="flex flex-col gap-1">
				<h2 className="flex items-center gap-2 font-medium">
					<Icon name="pin" className="text-typography-tertiary" />
					Publishers you trust
				</h2>
				<p className="text-sm text-typography-secondary">
					Only publishers you pin can mark a contract as verified. Pins are
					saved in this browser.
				</p>
			</div>
			{pins.length > 0 ? (
				<ul className="flex flex-col divide-y divide-border-secondary rounded-lg border border-border-secondary">
					{pins.map((pin) => (
						<li
							key={pin.name}
							className="flex items-center justify-between gap-2 py-2 pr-1.5 pl-3"
						>
							<span
								className="flex min-w-0 flex-col"
								title={`Registry ${pin.pubRegistry}`}
							>
								<PublisherLink name={pin.name} className="text-sm" />
								<span className="font-mono text-xs text-typography-tertiary">
									{shortAddress(pin.pubRegistry)}
								</span>
							</span>
							<Button
								variant="ghost"
								size="icon"
								aria-label={`Unpin ${pin.name}`}
								onClick={async () => {
									remove(pin.name);
									try {
										await syncSnap(() => snapUnpin(pin.name));
									} catch (cause) {
										setError(
											`Unpinned here, but the Snap still holds it. ${errorMessage(cause)}`,
										);
									}
								}}
							>
								<Icon name="close" />
							</Button>
						</li>
					))}
				</ul>
			) : (
				<p className="rounded-lg border border-dashed border-border-primary px-3 py-3 text-sm text-typography-secondary">
					You haven't pinned a publisher. Enter a team's ENS name to trust it.
				</p>
			)}
			<form onSubmit={submit} className="flex gap-2">
				<Input
					className="h-9 font-mono"
					placeholder="name.eth"
					aria-label="Publisher ENS name"
					spellCheck={false}
					autoComplete="off"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<Button
					type="submit"
					variant="secondary"
					className="h-9"
					loading={busy}
					disabled={!name.trim()}
				>
					Pin
				</Button>
			</form>
			{error ? (
				<p role="alert" className="text-sm text-error">
					{error}
				</p>
			) : null}
		</Card>
	);
}
