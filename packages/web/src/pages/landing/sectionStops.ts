const headerRem = 5;
const pageShare = 0.8;
const ignorableOverflowShare = 0.1;

function headerHeight() {
	const rootSize = getComputedStyle(document.documentElement).fontSize;
	return headerRem * Number.parseFloat(rootSize);
}

export function stopsFor(element: HTMLElement) {
	const style = getComputedStyle(element);
	const paddingTop = Number.parseFloat(style.paddingTop);
	const paddingBottom = Number.parseFloat(style.paddingBottom);
	const top = element.getBoundingClientRect().top + window.scrollY + paddingTop;
	const height = element.offsetHeight - paddingTop - paddingBottom;
	const screen = window.innerHeight;
	const header = headerHeight();
	const belowHeader = top - header;

	if (height + header <= screen) {
		return [Math.min(belowHeader, top - (screen - height) / 2)];
	}

	const overflow = height + header - screen;
	if (overflow < screen * ignorableOverflowShare) return [belowHeader];

	const pages = Math.ceil(overflow / (screen * pageShare));
	return Array.from(
		{ length: pages + 1 },
		(_, page) => belowHeader + (overflow * page) / pages,
	);
}

export function allStops() {
	const bottom = document.documentElement.scrollHeight - window.innerHeight;
	const sections = document.querySelectorAll<HTMLElement>(
		"[data-section-stop]",
	);
	const stops = [...sections].flatMap(stopsFor);
	return [0, ...stops, bottom]
		.map((stop) => Math.round(Math.min(bottom, Math.max(0, stop))))
		.sort((a, b) => a - b);
}
