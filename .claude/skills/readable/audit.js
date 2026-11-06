await (async () => {
	const probe = document.createElement("canvas").getContext("2d", {
		willReadFrequently: true,
	});
	const parse = (css) => {
		probe.clearRect(0, 0, 1, 1);
		probe.fillStyle = css;
		probe.fillRect(0, 0, 1, 1);
		const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
		return { r, g, b, a: a / 255 };
	};
	const channel = (value) => {
		const v = value / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const luminance = ({ r, g, b }) =>
		0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
	const ratio = (one, two) => {
		const [hi, lo] = [luminance(one), luminance(two)].sort((a, b) => b - a);
		return (hi + 0.05) / (lo + 0.05);
	};
	const canvas = [...document.querySelectorAll("canvas")].find(
		(item) => getComputedStyle(item.parentElement).position === "fixed",
	);
	const solidBehind = (element) => {
		for (let node = element; node; node = node.parentElement) {
			if (canvas && node.contains(canvas)) return null;
			const color = parse(getComputedStyle(node).backgroundColor);
			if (color.a > 0.85) return color;
		}
		return null;
	};
	const gl = canvas?.getContext("webgl");
	const pixels = await new Promise((resolve) => {
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				if (!gl) return resolve(null);
				const data = new Uint8Array(canvas.width * canvas.height * 4);
				gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
				resolve(data);
			}),
		);
	});
	const sampleRect = (rect) => {
		const scale = canvas.width / innerWidth;
		const out = [];
		for (let y = rect.top; y < rect.bottom; y += 2) {
			for (let x = rect.left; x < rect.right; x += 2) {
				const px = Math.round(x * scale);
				const py = canvas.height - 1 - Math.round(y * scale);
				const i = (py * canvas.width + px) * 4;
				if (i < 0 || i >= pixels.length) continue;
				out.push({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] });
			}
		}
		return out;
	};
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	const failures = [];
	let checked = 0;
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node.textContent.trim();
		const element = node.parentElement;
		if (!text || !element || element.closest("[hidden],script,style")) continue;
		const style = getComputedStyle(element);
		if (style.visibility === "hidden" || style.display === "none") continue;
		const range = document.createRange();
		range.selectNodeContents(node);
		const rect = range.getBoundingClientRect();
		if (rect.width <= 2 || rect.bottom < 0 || rect.top > innerHeight) continue;
		if (element.getBoundingClientRect().width <= 1) continue;
		let opacity = 1;
		for (let up = element; up; up = up.parentElement) {
			opacity *= Number(getComputedStyle(up).opacity);
		}
		if (opacity < 0.05) continue;
		checked++;
		const size = Number.parseFloat(style.fontSize);
		const weight = Number(style.fontWeight);
		const large = size >= 24 || (size >= 18.66 && weight >= 700);
		const limit = large ? 3 : 4.5;
		const color = parse(style.color);
		const solid = solidBehind(element);
		let measured;
		let source;
		if (solid) {
			measured = ratio(color, solid);
			source = "solid";
		} else if (pixels) {
			const values = sampleRect(rect).map((pixel) => ratio(color, pixel));
			values.sort((a, b) => a - b);
			measured = values[Math.floor(values.length * 0.1)] ?? 21;
			source = "canvas, worst tenth";
		} else continue;
		if (size < 12) failures.push({ text: text.slice(0, 40), size, problem: "under 0.75rem" });
		if (measured < limit) {
			failures.push({
				text: text.slice(0, 40),
				size,
				ratio: Number(measured.toFixed(2)),
				limit,
				source,
			});
		}
	}
	return JSON.stringify({ checked, failures });
})();
