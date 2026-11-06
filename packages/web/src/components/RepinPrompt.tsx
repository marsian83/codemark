import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "../lib/format";
import { resolvePin, usePins } from "../lib/pins";
import { Button } from "../ui/Button";
import { Callout } from "../ui/Callout";
import { Address } from "./Links";

export function RepinPrompt({ name }: { name: string }) {
	const { pins, add } = usePins();
	const [confirming, setConfirming] = useState(false);
	const pinned = pins.find((p) => p.name === name);
	const current = useQuery({
		queryKey: ["registry-now", name],
		queryFn: () => resolvePin(name),
		retry: false,
	});
	if (!pinned) return null;
	const moved =
		current.data &&
		current.data.pubRegistry.toLowerCase() !== pinned.pubRegistry.toLowerCase();
	if (current.data && !moved) return null;
	return (
		<Callout tone="warning">
			<div className="flex flex-col gap-3">
				<p>
					<span className="font-medium text-typography-primary">
						{name} points somewhere new.
					</span>{" "}
					Pin the new registry only if the team told you they moved it. Anyone
					who takes over the name could cause this.
				</p>
				<dl className="flex flex-col gap-1.5 text-xs">
					<div className="flex flex-col gap-0.5">
						<dt className="text-typography-tertiary">You pinned</dt>
						<dd>
							<Address value={pinned.pubRegistry} />
						</dd>
					</div>
					<div className="flex flex-col gap-0.5">
						<dt className="text-typography-tertiary">It points to now</dt>
						<dd>
							{current.data ? (
								<Address value={current.data.pubRegistry} />
							) : current.isError ? (
								`Couldn't read it. ${errorMessage(current.error)}`
							) : (
								"Reading…"
							)}
						</dd>
					</div>
				</dl>
				{current.data && !confirming ? (
					<Button
						variant="secondary"
						size="sm"
						className="w-fit"
						onClick={() => setConfirming(true)}
					>
						Pin the new registry
					</Button>
				) : null}
				{current.data && confirming ? (
					<div className="flex flex-col gap-2">
						<p className="text-typography-primary">
							Trust this new registry for {name} from now on?
						</p>
						<div className="flex gap-2">
							<Button
								variant="accent"
								size="sm"
								onClick={() => current.data && add(current.data)}
							>
								Yes, pin it
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setConfirming(false)}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : null}
			</div>
		</Callout>
	);
}
