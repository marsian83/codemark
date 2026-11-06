import {
	type AnimationPlaybackControls,
	animate,
	motion,
	useInView,
	useMotionValue,
	useMotionValueEvent,
	useReducedMotion,
	useTransform,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../../utils/cn";
import { actionVariants } from "../Action";
import { type Incident, incidents } from "./incidents";
import { ReplayLane } from "./ReplayLane";
import { SegmentedControl } from "./SegmentedControl";
import { endOfStep, stepAt, stepCount } from "./timeline";

const fullRunSeconds = 13;
const replayPauseMs = 3200;

function StepBar({
	index,
	progress,
}: {
	index: number;
	progress: ReturnType<typeof useMotionValue<number>>;
}) {
	const scaleX = useTransform(progress, (t) =>
		Math.min(1, Math.max(0, t * stepCount - index)),
	);
	return (
		<span className="block h-1 overflow-hidden bg-sand/15">
			<motion.span
				className="block h-full origin-left bg-fox"
				style={{ scaleX }}
			/>
		</span>
	);
}

export function IncidentReplay() {
	const [incidentId, setIncidentId] = useState<Incident["id"]>("bybit");
	const incident =
		incidents.find((item) => item.id === incidentId) ?? incidents[0];

	const reduced = useReducedMotion();
	const progress = useMotionValue(reduced ? 1 : 0);
	const [step, setStep] = useState(stepAt(progress.get()));
	const [playing, setPlaying] = useState(false);
	const controls = useRef<AnimationPlaybackControls>(null);
	const looping = useRef(true);
	const restart = useRef<ReturnType<typeof setTimeout>>(undefined);

	const frame = useRef<HTMLDivElement>(null);
	const seen = useInView(frame, { amount: 0.3 });

	useMotionValueEvent(progress, "change", (t) => setStep(stepAt(t)));

	const stop = useCallback(() => {
		clearTimeout(restart.current);
		controls.current?.stop();
		setPlaying(false);
	}, []);

	const play = useCallback(() => {
		stop();
		if (progress.get() >= 1) progress.set(0);
		setPlaying(true);
		controls.current = animate(progress, 1, {
			duration: (1 - progress.get()) * fullRunSeconds,
			ease: "linear",
			onComplete: () => {
				setPlaying(false);
				if (looping.current) {
					restart.current = setTimeout(() => play(), replayPauseMs);
				}
			},
		});
	}, [progress, stop]);

	useEffect(() => {
		if (seen && !reduced && looping.current) play();
		else stop();
		return stop;
	}, [seen, reduced, play, stop]);

	function selectIncident(next: Incident["id"]) {
		setIncidentId(next);
		if (reduced) return;
		looping.current = true;
		progress.set(0);
		play();
	}

	function seek(target: number) {
		looping.current = false;
		stop();
		progress.set(endOfStep(target));
	}

	function toggle() {
		if (playing) {
			looping.current = false;
			stop();
			return;
		}
		looping.current = true;
		play();
	}

	const current = incident.steps[step];
	const finished = !playing && progress.get() >= 1;

	return (
		<div ref={frame} className="flex min-h-0 flex-1 flex-col">
			<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
				<SegmentedControl
					aria-label="Incident"
					value={incidentId}
					onValueChange={selectIncident}
					options={incidents.map(({ id, logo, date }) => ({
						value: id,
						label: (
							<span className="inline-flex items-center gap-2">
								{logo}
								<span className="font-normal text-sand-2 max-sm:hidden">
									{date}
								</span>
							</span>
						),
					}))}
				/>
				<div className="flex items-center gap-4">
					<p className="text-sm font-medium text-sand-2">{incident.loss}</p>
					<button
						type="button"
						className={actionVariants({ tone: "quiet", size: "sm" })}
						onClick={toggle}
						aria-label={playing ? "Pause replay" : "Play replay"}
					>
						{playing ? "Pause" : finished ? "Replay" : "Play"}
					</button>
				</div>
			</div>

			<ol className="mt-4 grid grid-cols-5 gap-3">
				{incident.steps.map((item, index) => (
					<li key={item.title}>
						<button
							type="button"
							onClick={() => seek(index)}
							aria-current={index === step ? "step" : undefined}
							aria-label={`${item.at}: ${item.title}`}
							className={cn(
								"block w-full text-left text-sm outline-none transition-colors hover:text-sand focus-visible:text-sand",
								index === step ? "text-sand" : "text-sand-3",
							)}
						>
							<StepBar index={index} progress={progress} />
							<span className="mt-1.5 flex flex-wrap justify-between gap-x-2 font-medium">
								<span className="max-sm:hidden">{item.label}</span>
								<span className="sm:hidden">{index + 1}</span>
								<span className="font-normal text-sand-3 max-lg:hidden">
									{item.at}
								</span>
							</span>
						</button>
					</li>
				))}
			</ol>

			<div
				className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-2"
				aria-live="polite"
			>
				<ReplayLane
					key={`${incident.id}-open`}
					incident={incident}
					step={current}
					guarded={false}
					progress={progress}
				/>
				<ReplayLane
					key={`${incident.id}-guarded`}
					incident={incident}
					step={current}
					guarded
					progress={progress}
				/>
			</div>
			<p className="mt-3 text-sm leading-5 text-sand-2">{incident.checkSits}</p>
		</div>
	);
}
