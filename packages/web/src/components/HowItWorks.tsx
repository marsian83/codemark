export default function HowItWorks() {
	return (
		<section className="space-y-2 text-sm leading-relaxed">
			<h2 className="font-semibold">How this check works</h2>
			<ol className="list-decimal space-y-1.5 pl-5">
				<li>
					A publisher such as acmeswap.eth owns an ENS name. Under it, each
					signing key (ci-1, delegates) is its own registry that the security
					key can unmount in one transaction.
				</li>
				<li>
					Each release is a subname whose resolver holds the contract address
					and code hash. The check looks up the name derived from the address,
					at one fixed Sepolia block.
				</li>
				<li>
					The resolver must be a factory-verified proxy with no record or role
					changes since it was deployed. Then the record cannot be rewritten by
					the CI key and the verdict is VERIFIED. Any later change to the
					resolver is MISMATCH. VERIFIED-unproven means the block numbers needed
					for the proof were not available.
				</li>
				<li>
					The key must still be mounted and listed in the publisher's
					codemark.keys record. If not, the verdict is KEY REVOKED. A released
					name that was unregistered is PULLED, with the reason from Arkiv.
				</li>
				<li>
					Arkiv only suggests which publisher to look under. Every row is
					re-derived from ENS, so a forged row is ignored.
				</li>
				<li>
					Pinned publishers win. Unpinned publishers are shown as "vouched for"
					and never make a result safe. For account upgrades and delegatecall
					targets, anything except a pinned, proven release older than the age
					threshold is critical.
				</li>
			</ol>
		</section>
	);
}
