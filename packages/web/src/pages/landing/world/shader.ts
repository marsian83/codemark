import { groundGlsl } from "./ground";

export const vertexShader = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

export const fragmentShader = `precision highp float;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;
uniform float uTravel;
uniform float uLift;
uniform float uNight;
uniform float uDawn;
uniform float uJourney;
uniform float uMoonRoom;
uniform vec2 uSun;
uniform sampler2D uFox;
uniform sampler2D uWord;
uniform sampler2D uGlyphs;
uniform sampler2D uGems;
uniform vec4 uFoxRect;
uniform vec4 uWordRect;
uniform vec4 uStones[3];

${groundGlsl}

float hash(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
		f.y
	);
}

float clouds(vec2 p) {
	return noise(p) * 0.55 + noise(p * 2.1 + 4.0) * 0.3 + noise(p * 4.3 + 9.0) * 0.15;
}

vec3 rgb(float r, float g, float b) { return vec3(r, g, b) / 255.0; }

vec3 tod(vec3 dusk, vec3 night, vec3 dawn) {
	return mix(mix(dusk, night, uNight), dawn, uDawn);
}

float grainy(float amount, float grain, float soft) {
	float s = max(0.001, soft * 0.5);
	return smoothstep(grain - s, grain + s, clamp(amount, 0.0, 1.0) * (1.0 + 2.0 * s) - s);
}

vec3 skyColor(float h, float grain) {
	vec3 c0 = tod(rgb(255., 196., 104.), rgb(24., 44., 54.), rgb(255., 214., 170.));
	vec3 c1 = tod(rgb(240., 112., 30.), rgb(19., 37., 46.), rgb(236., 150., 112.));
	vec3 c2 = tod(rgb(128., 54., 34.), rgb(14., 29., 37.), rgb(58., 88., 106.));
	vec3 c3 = tod(rgb(14., 30., 38.), rgb(10., 21., 28.), rgb(14., 36., 48.));
	float p = clamp(h, 0.0, 0.999) * 3.0;
	float f = grainy(fract(p), grain, 0.55);
	if (p < 1.0) return mix(c0, c1, f);
	if (p < 2.0) return mix(c1, c2, f);
	return mix(c2, c3, f);
}

float dune(float x, float seed) {
	float a = 1.0 - abs(sin(x * 0.5 + seed));
	float b = 1.0 - abs(sin(x * 0.83 + seed * 2.3));
	return a * a * 0.62 + b * 0.26 + 0.06 * sin(x * 2.7 + seed * 1.4);
}

float ridge(float x, float layer) {
	float base = 0.34 - layer * 0.035;
	float amp = 0.075 + layer * 0.016;
	float freq = 2.2 + layer * 0.75;
	float speed = 0.05 + layer * layer * 0.05;
	return base + amp * dune((x + uTravel * speed) * freq, layer * 3.7 + 1.0);
}

vec3 layerShade(vec2 p, float layer, float top, float grain) {
	float e = 0.005;
	float depthBelow = top - p.y;
	float sweep = depthBelow * 1.9 + sin(depthBelow * 16.0 + layer + p.x * 3.0) * 0.022;
	float sx = p.x + sweep;
	float slope = (ridge(sx + e, layer) - ridge(sx - e, layer)) / (2.0 * e);
	float lit = smoothstep(-0.12, 0.42, slope);
	float depth = layer / 4.0;
	vec3 shadow = mix(
		tod(rgb(196., 84., 40.), rgb(19., 37., 46.), rgb(122., 106., 116.)),
		tod(rgb(26., 30., 40.), rgb(8., 18., 24.), rgb(10., 32., 44.)),
		depth
	);
	vec3 light = mix(
		tod(rgb(255., 170., 84.), rgb(30., 52., 60.), rgb(196., 146., 130.)),
		tod(rgb(214., 92., 26.), rgb(16., 32., 40.), rgb(30., 78., 92.)),
		depth
	);
	float speed = 0.05 + layer * layer * 0.05;
	float ripple = sin((p.x + uTravel * speed) * 46.0 + p.y * 190.0 + 4.0 * noise(p * 8.0));
	float tone = lit + ripple * 0.07 * lit - clamp(depthBelow * 3.2, 0.0, 0.34);
	return mix(shadow, light, grainy(tone, grain, 0.42));
}

vec3 hexDune(vec2 p, vec2 screen, float top, float grain, vec3 base) {
	vec2 size = vec2(0.6, 1.0) * 13.0 * uPixelRatio;
	float worldX = screen.x + uTravel * uResolution.y;
	vec2 cell = floor(vec2(worldX, screen.y) / size);
	vec2 inCell = fract(vec2(worldX, screen.y) / size);
	float tick = floor(uTime * 0.6 + hash(cell) * 30.0);
	float pick = floor(hash(cell + tick * 0.013) * 16.0);
	vec2 uv = vec2((pick + inCell.x) / 16.0, inCell.y);
	float glyph = texture2D(uGlyphs, uv).a;
	float below = clamp((top - p.y) * 7.0, 0.0, 1.0);
	float light = (1.0 - below) * (0.55 + 0.45 * noise(cell * 0.11));
	vec3 ink = tod(rgb(246., 133., 27.), rgb(84., 120., 118.), rgb(150., 196., 190.));
	float presence = step(0.25 + below * 0.6, hash(cell * 1.7) + light * 0.5);
	return mix(base, ink * (0.45 + light * 0.75), glyph * presence);
}

vec3 gem(vec3 color, vec2 p, vec4 s, float grain) {
	vec2 uv = (p - vec2(s.x - s.w * 0.5, s.y - s.w * 0.05)) / s.w;
	if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0 || uv.y >= 1.0) return color;
	vec4 g = texture2D(uGems, vec2((s.z + uv.x) * 0.5, uv.y));
	return color * (1.0 - g.a) + g.rgb * (1.0 + (grain - 0.5) * 0.16);
}

float stars(vec2 screen, float cell, float density, float size, float seed) {
	vec2 uv = screen / cell;
	vec2 id = floor(uv);
	float chance = hash(id + seed);
	if (chance > density) return 0.0;
	float rate = 0.5 + hash(id + seed + 3.1);
	vec2 wander = vec2(sin(uTime * 0.05 * rate + chance * 40.0), cos(uTime * 0.04 * rate + chance * 70.0)) * 0.05;
	vec2 at = 0.25 + 0.5 * vec2(hash(id + seed + 1.7), hash(id + seed + 5.3)) + wander;
	float dist = length(fract(uv) - at) * cell;
	float twinkle = 0.72 + 0.28 * sin(uTime * 0.35 * rate + chance * 90.0);
	return smoothstep(size, size * 0.25, dist) * twinkle;
}

void main() {
	vec2 screen = gl_FragCoord.xy;
	float aspect = uResolution.x / uResolution.y;
	vec2 p = vec2(screen.x / uResolution.y, screen.y / uResolution.y);
	vec2 cellCoord = floor(screen / max(1.0, floor(uPixelRatio)));
	float grain = hash(cellCoord + 0.5);
	float grain2 = hash(cellCoord * 1.37 + 7.0);

	vec2 land = vec2(p.x, p.y + uLift * 0.82);
	vec2 sky = land;
	float textShade = (1.0 - uNight) * (1.0 - uDawn) * mix(1.0, smoothstep(aspect * 0.84, aspect * 0.3, p.x), smoothstep(0.9, 1.3, aspect));
	float portraitShade = uDawn * (1.0 - smoothstep(0.9, 1.3, aspect));
	float footerShade = uDawn * smoothstep(0.9, 1.3, aspect) * smoothstep(0.42, 0.62, sky.y);
	float height = (sky.y - 0.27) / (0.56 + uLift * 0.3) + textShade * 0.6 + portraitShade * 0.42 + footerShade * 0.34;
	vec3 color = skyColor(height, grain);

	float sun = length(sky - uSun);
	float glow = exp(-sun * 4.6) * (1.0 - uNight) * (1.0 - textShade * 0.8) * (1.0 - portraitShade * 0.85) * (1.0 - footerShade);
	if (glow > 0.001) color = mix(color, tod(rgb(255., 178., 92.), rgb(0., 0., 0.), rgb(255., 224., 180.)), grainy(glow * 0.85, grain2, 0.4));

	if (uNight < 0.995) {
		float drift = uTime * 0.006 + uTravel * 0.02;
		vec2 cloudSpace = vec2(p.x * 0.9 + drift, sky.y * 9.0 + 0.4 * sin(p.x * 1.3));
		float band = clouds(cloudSpace);
		float bandMask = smoothstep(0.58, 0.76, band) * smoothstep(0.08, 0.2, height) * (1.0 - smoothstep(0.42, 0.62, height)) * (1.0 - uNight) * 0.85;
		vec3 cloudLit = tod(rgb(255., 150., 72.), rgb(0., 0., 0.), rgb(255., 206., 170.));
		vec3 cloudDark = tod(rgb(96., 44., 38.), rgb(0., 0., 0.), rgb(116., 100., 116.));
		float towardSun = exp(-abs(p.x - uSun.x) * 1.1);
		color = mix(color, mix(cloudDark, cloudLit, grainy(towardSun, grain, 0.4)), grainy(bandMask, grain2, 0.4));
	}

	float sunSize = min(0.155, aspect * 0.2);
	float disc = smoothstep(sunSize + 0.001, sunSize - 0.002, sun) * step(0.0, uSun.y + 0.16);
	if (disc > 0.0) {
		vec3 sunFace = mix(rgb(255., 158., 62.), rgb(255., 236., 188.), clamp((sky.y - uSun.y) * 3.6 + 0.5, 0.0, 1.0));
		vec2 size = vec2(0.6, 1.0) * 11.0 * uPixelRatio;
		vec2 cell = floor(screen / size);
		vec2 inCell = fract(screen / size);
		float tick = floor(uTime * 0.4 + hash(cell) * 40.0);
		float pick = floor(hash(cell + tick * 0.017) * 16.0);
		float glyph = texture2D(uGlyphs, vec2((pick + inCell.x) / 16.0, inCell.y)).a;
		sunFace = mix(sunFace, rgb(255., 244., 222.), uDawn * 0.7);
		sunFace = mix(sunFace, mix(rgb(236., 112., 30.), rgb(240., 150., 110.), uDawn), glyph * 0.55);
		color = mix(color, sunFace, disc);
	}

	float starMask = uNight * (1.0 - smoothstep(0.0, 0.5, uDawn));
	if (starMask > 0.001) {
		vec2 starSpace = screen + vec2(0.0, uJourney * 160.0 * uPixelRatio);
		float faint = stars(starSpace, 58.0 * uPixelRatio, 0.5, 1.5 * uPixelRatio, 0.0);
		float clear = stars(starSpace + 31.0, 150.0 * uPixelRatio, 0.42, 2.1 * uPixelRatio, 11.0);
		color = mix(color, rgb(226., 224., 214.), starMask * max(faint * 0.3, clear * 0.5));
		float moonSize = min(0.3, aspect * 0.16);
		vec2 moonAt = vec2(aspect + moonSize - uMoonRoom, 0.86 - uJourney * 0.56);
		float moon = length(p - moonAt);
		if (moon < moonSize) {
			vec3 n = vec3((p - moonAt) / moonSize, 0.0);
			n.z = sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)));
			float light = clamp(dot(n, normalize(vec3(-0.8, 0.3, 0.32))), 0.0, 1.0);
			float crater = clouds(n.xy * 5.0 + 3.0);
			float lit = grainy(light * (0.62 + crater * 0.5), grain, 0.9);
			float edge = smoothstep(moonSize, moonSize * 0.985, moon);
			color = mix(color, rgb(196., 158., 112.), lit * edge * starMask);
		}
	}

	if (land.y < 0.56) {
		for (float layer = 0.0; layer < 5.0; layer += 1.0) {
			float top = ridge(land.x, layer);
			if (land.y < top) color = layerShade(land, layer, top, grain);
			if (layer == 1.0 && uDawn > 0.01) {
				vec2 wordUv = (p - uWordRect.xy) / uWordRect.zw;
				if (wordUv.x > 0.0 && wordUv.x < 1.0 && wordUv.y > 0.0 && wordUv.y < 1.0 && land.y >= ridge(land.x, 2.0)) {
					float word = texture2D(uWord, wordUv).a * uDawn;
					vec3 wordColor = mix(rgb(14., 42., 56.), rgb(38., 78., 92.), grainy(1.0 - wordUv.y, grain, 0.5));
					color = mix(color, wordColor, word);
				}
			}
		}

		if (uDawn > 0.02) {
			for (int i = 0; i < 3; i++) {
				color = gem(color, land, uStones[i], grain);
			}
		}

		float groundTop = ground(land.x + uTravel);
		if (land.y < groundTop) {
			vec3 base = tod(rgb(12., 25., 32.), rgb(7., 15., 20.), rgb(15., 30., 38.));
			color = hexDune(land, screen, groundTop, grain, base);
			float lip = smoothstep(0.012, 0.0, groundTop - land.y);
			color = mix(color, tod(rgb(250., 150., 60.), rgb(66., 96., 98.), rgb(255., 206., 164.)), grainy(lip * 0.9, grain2, 0.3));
		}

	}

	vec2 foxUv = (p - uFoxRect.xy) / uFoxRect.zw;
	if (uFoxRect.z > 0.0 && foxUv.x > 0.0 && foxUv.x < 1.0 && foxUv.y > 0.0 && foxUv.y < 1.0) {
		vec4 fox = texture2D(uFox, foxUv);
		vec3 shaded = fox.rgb * (1.0 + (grain - 0.5) * 0.22);
		color = color * (1.0 - fox.a) + shaded;
	}

	gl_FragColor = vec4(color, 1.0);
}`;
