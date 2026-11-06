import { formatDuration } from "@codemark/shared/check/explain";
import { Link } from "react-router-dom";
import { ExternalLink } from "../../components/Links";
import { config } from "../../lib/config";
import { useTitle } from "../../lib/useTitle";
import { Badge } from "../../ui/Badge";
import { Callout } from "../../ui/Callout";
import { Card } from "../../ui/Card";
import { Icon } from "../../ui/Icon";
import { CodeBlock, Mono } from "./CodeBlock";
import { Step } from "./Step";

const sections = [
	{ id: "check", label: "Check a contract" },
	{ id: "snap", label: "Check every transaction" },
	{ id: "publish", label: "Publish your releases" },
	{ id: "limits", label: "Limits" },
];

const verdicts = [
	{
		tone: "success",
		label: "Verified",
		text: "A team you pinned released this contract under its ENS name, the record can't be changed, and the team hasn't withdrawn it.",
	},
	{
		tone: "caution",
		label: "Released recently",
		text: "The record checks out, but the release is new. Give it some time before you trust it with much.",
	},
	{
		tone: "warning",
		label: "Not verified",
		text: "Nobody you trust vouches for it, or the record could still be rewritten. Anyone can register a name, so a publisher you haven't pinned doesn't count.",
	},
	{
		tone: "error",
		label: "Don't sign",
		text: "The team pulled the release or revoked its key, the record doesn't match, or an account upgrade is too new or not proven.",
	},
] as const;

const path = [
	[
		"Publisher",
		"The team's ENS name. Only publishers you pin can mark a contract as verified.",
	],
	[
		"Release key",
		"Each signing key is its own name under the publisher, so the team can revoke one key in a single transaction.",
	],
	[
		"Release",
		"A name under the key that records the contract address and its code hash.",
	],
	[
		"Record",
		"It can't be edited after release, so a stolen release key can't rewrite it.",
	],
	[
		"Age",
		`Account upgrades need a release at least ${formatDuration(config.thresholds.delegateMinAgeSeconds)} old, which gives the team time to pull a bad one.`,
	],
] as const;

const envVars = [
	[
		"CODEMARK_ROOT_KEY",
		"Private key of the root key. Pays for setup and signs for the Safe.",
	],
	[
		"CODEMARK_SEC_KEY",
		"Private key of the security key. Only needed to cut a key.",
	],
	["CODEMARK_CI_KEY", "Private key of the CI key. Needed to publish."],
	["CODEMARK_SAFE", "Address of your team's Safe. init writes it for you."],
	[
		"SEPOLIA_RPC_URL",
		"Optional. A Sepolia RPC endpoint. There is a public default.",
	],
	["ARKIV_ACCESS_KEY", "Optional. Lifts the public search index's rate limit."],
] as const;

const envExample = `CODEMARK_ROOT_KEY=0x...
CODEMARK_SEC_KEY=0x...
CODEMARK_CI_KEY=0x...
SEPOLIA_RPC_URL=https://...`;

const action = `- uses: ./.github/actions/codemark-publish
  with:
    publisher: acmeswap.eth
    key: ci-1
    component: router
    version: \${{ steps.deployed.outputs.version }}
    target: \${{ steps.deployed.outputs.address }}
    ci-key: \${{ secrets.CODEMARK_CI_KEY }}
    arkiv-access-key: \${{ secrets.ARKIV_ACCESS_KEY }}`;

function Section({
	id,
	title,
	intro,
	children,
}: {
	id: string;
	title: string;
	intro: string;
	children: React.ReactNode;
}) {
	return (
		<section id={id} className="flex scroll-mt-20 flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h2 className="text-xl font-medium tracking-tight text-balance sm:text-2xl">
					{title}
				</h2>
				<p className="max-w-xl text-typography-secondary text-pretty">
					{intro}
				</p>
			</div>
			{children}
		</section>
	);
}

function Sub({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3">
			<h3 className="font-medium">{title}</h3>
			{children}
		</div>
	);
}

export default function DocsPage() {
	useTitle("Get started");
	return (
		<div className="grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
			<aside className="max-lg:hidden">
				<nav
					aria-label="On this page"
					className="sticky top-24 flex flex-col gap-1"
				>
					<p className="px-2.5 pb-1 text-xs text-typography-tertiary">
						On this page
					</p>
					{sections.map((s) => (
						<a
							key={s.id}
							href={`#${s.id}`}
							className="rounded-md px-2.5 py-1.5 text-sm text-typography-secondary transition-colors duration-150 hover:bg-background-raised hover:text-typography-primary"
						>
							{s.label}
						</a>
					))}
				</nav>
			</aside>
			<main className="flex min-w-0 max-w-3xl flex-col gap-14">
				<header className="flex flex-col gap-2">
					<h1 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
						Get started
					</h1>
					<p className="max-w-xl text-base text-typography-secondary text-pretty">
						Codemark checks, before you sign, that a contract or account upgrade
						was released by a team under its ENS name, and that the team hasn't
						withdrawn it.
					</p>
				</header>

				<Section
					id="check"
					title="Check a contract"
					intro="Start here. The site runs the check in your browser, so you don't need a wallet or an account."
				>
					<Sub title="Run a check">
						<ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-typography-secondary marker:text-typography-tertiary">
							<li>
								Open{" "}
								<Link
									to="/app"
									className="text-primary underline underline-offset-4"
								>
									Check
								</Link>
								.
							</li>
							<li>
								Paste a contract address from Sepolia, or pick one of the demo
								contracts under the search box.
							</li>
							<li>Read the verdict, then the trust path under it.</li>
						</ol>
					</Sub>

					<Sub title="What the four verdicts mean">
						<div className="grid gap-3 sm:grid-cols-2">
							{verdicts.map((v) => (
								<Card key={v.label} className="flex flex-col gap-2 p-4">
									<Badge tone={v.tone} className="self-start">
										{v.label}
									</Badge>
									<p className="text-sm text-typography-secondary">{v.text}</p>
								</Card>
							))}
						</div>
					</Sub>

					<Sub title="The trust path">
						<p className="text-sm text-typography-secondary">
							Every result walks five steps through ENS. The first step that
							fails is where it turns red, so you can see why.
						</p>
						<Card className="px-5 py-5">
							<ol className="flex flex-col gap-4">
								{path.map(([label, text], i) => (
									<li key={label} className="flex gap-3">
										<span className="flex-center tabular size-6 shrink-0 rounded-full border border-border-primary font-mono text-xs text-typography-tertiary">
											{i + 1}
										</span>
										<div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
											<span className="text-sm font-medium">{label}</span>
											<p className="text-sm text-typography-secondary">
												{text}
											</p>
										</div>
									</li>
								))}
							</ol>
						</Card>
					</Sub>

					<Sub title="Pin the publishers you trust">
						<p className="text-sm text-typography-secondary">
							Pinning a publisher means you tell Codemark which ENS names to
							believe, for example <Mono>acmeswap.eth</Mono>. Only a pinned
							publisher can make a result Verified. Anyone can register a name
							that looks like a team's, so a publisher you haven't pinned can
							vouch for a contract but never earns the green result.
						</p>
					</Sub>
				</Section>

				<Section
					id="snap"
					title="Check every transaction in MetaMask"
					intro="The Codemark Snap runs the same check inside MetaMask, before it asks you to confirm."
				>
					<Callout tone="warning">
						The Snap needs MetaMask Flask, the developer build of MetaMask. Use
						a separate browser profile so it stays apart from your usual wallet.
					</Callout>
					<ol className="flex flex-col gap-5">
						<Step
							n={1}
							title="Install Flask"
							needs="A separate browser profile."
						>
							Add{" "}
							<ExternalLink href="https://metamask.io/flask/">
								MetaMask Flask
							</ExternalLink>{" "}
							to that profile and connect it to Sepolia.
						</Step>
						<Step n={2} title="Build the Snap" code="bun snap:build">
							Run it from the <Mono>packages</Mono> folder of the repository.
							Set <Mono>CODEMARK_SITE_ORIGIN</Mono> first if you serve the site
							from an address other than{" "}
							<Mono>https://codemark.hetairoi.xyz</Mono> or{" "}
							<Mono>http://localhost:3020</Mono>.
						</Step>
						<Step n={3} title="Serve it" code="bun snap:serve">
							This serves the Snap at <Mono>http://localhost:8080</Mono>. Leave
							it running.
						</Step>
						<Step
							n={4}
							title="Install it from the site"
							code="local:http://localhost:8080"
						>
							In the Flask profile, open{" "}
							<Link
								to="/app"
								className="text-primary underline underline-offset-4"
							>
								Check
							</Link>{" "}
							and select Install the Snap on the MetaMask Snap card. MetaMask
							asks you to confirm.
						</Step>
					</ol>
					<Sub title="Try it with a demo contract">
						<ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-typography-secondary marker:text-typography-tertiary">
							<li>
								On Check, copy the address of a demo contract, such as the
								router.
							</li>
							<li>In MetaMask, start a send of 0 ETH to that address.</li>
							<li>
								Before you confirm, read the Codemark section in the transaction
								window. It shows the verdict and the reason.
							</li>
							<li>Reject the transaction. You only needed to read it.</li>
						</ol>
					</Sub>
				</Section>

				<Section
					id="publish"
					title="Publish your releases"
					intro="Teams publish each release under their ENS name with the command line. It signs on Sepolia and needs a few keys first."
				>
					<Sub title="Before you start">
						<ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-typography-secondary marker:text-typography-tertiary">
							<li>
								<ExternalLink href="https://bun.sh">Bun</ExternalLink> 1.4.2 or
								newer, and the repository with <Mono>bun install</Mono> run in
								its <Mono>packages</Mono> folder. Run every command below from
								there.
							</li>
							<li>
								Sepolia ETH for gas on the root key and the CI key. The security
								key needs some too if you ever cut a key.
							</li>
							<li>
								A{" "}
								<strong className="font-medium text-typography-primary">
									root key
								</strong>
								. It owns your team's Safe and can do everything. Keep it cold.
							</li>
							<li>
								A{" "}
								<strong className="font-medium text-typography-primary">
									security key
								</strong>
								, ideally a hardware wallet. It can only withdraw things, never
								publish.
							</li>
							<li>
								A{" "}
								<strong className="font-medium text-typography-primary">
									CI key
								</strong>
								. It lives in your release pipeline and can only add new
								releases. It can't be the security key, the Safe or the root
								key.
							</li>
						</ul>
					</Sub>

					<Sub title="Environment variables">
						<p className="text-sm text-typography-secondary">
							The CLI reads these from the environment or from a{" "}
							<Mono>.env</Mono> file at the repository root. A command that
							needs a key it wasn't given stops before it sends anything.
						</p>
						<div className="overflow-x-auto rounded-lg border border-border-secondary">
							<table className="w-full text-left text-sm">
								<tbody>
									{envVars.map(([name, text]) => (
										<tr
											key={name}
											className="border-b border-border-secondary last:border-b-0"
										>
											<td className="px-3 py-2 align-top font-mono whitespace-nowrap">
												{name}
											</td>
											<td className="px-3 py-2 text-typography-secondary">
												{text}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<CodeBlock code={envExample} label="env file" />
						<p className="text-sm text-typography-tertiary">
							Every command also takes <Mono>--rpc &lt;url&gt;</Mono> to
							override <Mono>SEPOLIA_RPC_URL</Mono>.
						</p>
					</Sub>

					<ol className="flex flex-col gap-6">
						<Step
							n={1}
							title="Register your name"
							code="bun cli init acmeswap --sec 0x... --years 1"
							needs={
								<>
									The root key. <Mono>--sec</Mono> is the security key's address
									and is optional if <Mono>CODEMARK_SEC_KEY</Mono> is set.{" "}
									<Mono>--years</Mono> defaults to 1.
								</>
							}
						>
							Registers <Mono>acmeswap.eth</Mono> on Sepolia, deploys your Safe
							and sets up the publisher registry, and saves the Safe address as{" "}
							<Mono>CODEMARK_SAFE</Mono>. It costs Sepolia gas only.
						</Step>
						<Step
							n={2}
							title="Add a release key"
							code="bun cli add-key acmeswap.eth ci-1 --ci 0x... --ttl-days 90"
							needs={
								<>
									The root key. <Mono>--ci</Mono> is the CI key's address.{" "}
									<Mono>--ttl-days</Mono> defaults to 90.
								</>
							}
						>
							Creates <Mono>ci-1.acmeswap.eth</Mono> and lets the CI key add
							releases under it, and nothing else. Use <Mono>--root-only</Mono>{" "}
							instead of <Mono>--ci</Mono> for a key only root publishes under,
							such as <Mono>delegates</Mono> for account upgrades.
						</Step>
						<Step
							n={3}
							title="Publish a release"
							code="bun cli publish acmeswap.eth ci-1 --component router --version 3.1.0 --target 0x... --commit <40-hex>"
							needs={
								<>
									The CI key. <Mono>--component</Mono>, <Mono>--version</Mono>{" "}
									and <Mono>--target</Mono> are required. <Mono>--commit</Mono>{" "}
									is optional.
								</>
							}
						>
							Records the deployed contract at <Mono>--target</Mono> as{" "}
							<Mono>router-3-1-0.ci-1.acmeswap.eth</Mono> and adds an entry to
							the search index. For an account upgrade, a Safe module or other
							code that runs as your account, add <Mono>--kind delegate</Mono>
							and publish under a root-only key with the root key.
						</Step>
						<Step
							n={4}
							title="Verify it"
							code="bun cli verify 0x... --pin acmeswap.eth"
							needs="No keys."
						>
							Runs the same check the site and the Snap run. Add{" "}
							<Mono>--role delegation</Mono> to check an account upgrade. The
							other roles are <Mono>call</Mono>, <Mono>delegatecall</Mono>,{" "}
							<Mono>approval-spender</Mono> and <Mono>permit-spender</Mono>. It
							exits with 0 when there is no warning, 1 for a warning and 2 for a
							critical result. Add <Mono>--json</Mono> for machine-readable
							output.
						</Step>
					</ol>

					<Sub title="When something goes wrong">
						<ol className="flex flex-col gap-6">
							<Step
								n={1}
								title="Pull one release"
								code={`bun cli pull acmeswap.eth ci-1 router-3-1-0 --reason "wrong constructor args"`}
								needs={
									<>
										The root key. <Mono>--reason</Mono> is required.
									</>
								}
							>
								Withdraws one release and reserves its names so the CI key can't
								register them again. Checks show your reason.
							</Step>
							<Step
								n={2}
								title="Cut a leaked key"
								code={`bun cli cut acmeswap.eth ci-1 --reason "CI key leaked"`}
								needs={
									<>
										The security key. <Mono>--reason</Mono> is required.
									</>
								}
							>
								Revokes the whole key in one transaction. Every release under it
								stops verifying, good ones included, until you migrate.
							</Step>
							<Step
								n={3}
								title="Move to a new key"
								code="bun cli migrate acmeswap.eth ci-1 ci-2 --ci 0x..."
								needs={
									<>
										The root key. Pass <Mono>--ci</Mono> or{" "}
										<Mono>--root-only</Mono>.
									</>
								}
							>
								Mounts <Mono>ci-2</Mono> and republishes the live releases of{" "}
								<Mono>ci-1</Mono>. It lists anything it couldn't move, and you
								can run it again to resume.
							</Step>
						</ol>
					</Sub>

					<Sub title="Publish from GitHub Actions">
						<p className="text-sm text-typography-secondary">
							The Action wraps <Mono>publish</Mono>. Store the CI key as a
							secret, never in the repository. It outputs <Mono>name</Mono> and{" "}
							<Mono>forward-name</Mono>, and <Mono>commit</Mono> defaults to the
							commit being built.
						</p>
						<CodeBlock code={action} label="workflow step" />
					</Sub>
				</Section>

				<Section
					id="limits"
					title="Limits"
					intro="What Codemark does and doesn't do today."
				>
					<ul className="flex flex-col gap-3">
						{[
							[
								"clock",
								"Sepolia only. Codemark reads and publishes on the Sepolia test network.",
							],
							[
								"wallet",
								"The Snap needs MetaMask Flask for now. Without it, the site runs the same check in your browser.",
							],
							[
								"shield-check",
								"Codemark says who published something and whether they still stand behind it. It doesn't tell you whether the code is safe.",
							],
						].map(([icon, text]) => (
							<li key={text} className="flex items-start gap-3">
								<Icon
									name={icon as "clock" | "wallet" | "shield-check"}
									className="mt-0.5 shrink-0 text-typography-tertiary"
								/>
								<p className="text-sm text-typography-secondary">{text}</p>
							</li>
						))}
					</ul>
				</Section>
			</main>
		</div>
	);
}
