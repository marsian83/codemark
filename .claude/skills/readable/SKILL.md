---
name: readable
description: Checks that text on a page can actually be read. Measures WCAG contrast against the real pixels behind each text element, including canvas and WebGL backgrounds, and applies rules for size and moving text. Use before showing a UI change to anyone, when text sits on an image, gradient, grain or animation, or when asked about readability, contrast or accessibility.
---

# Readable

Look at the page before anyone else does. A colour pair that passes on paper can still fail on grain, on a gradient or over an animation, so measure what's on screen.

## Run it

1. Open the page in a browser at the real viewport size, then at a short laptop size and about 400 wide.
2. Scroll to a section, wait for it to settle, and run `audit.js` from this folder in the page. It returns every text element below the limit, with the measured ratio and whether the background was a solid colour or a canvas.
3. Repeat for each section and each state: hover, error, every step of an animation.
4. Fix the background or the text, then measure again. Report the numbers, not an impression.

`audit.js` can't see text drawn inside a canvas. For that, compute the ratio by hand from the colours in the drawing code.

## Limits

- Body text: 4.5:1 or more.
- Large text (1.5rem and up, or 1.17rem bold): 3:1 or more.
- Buttons, inputs and icons that carry meaning: 3:1 against what's around them, and text inside a button still needs 4.5:1.
- On grain or an image, the worst tenth of the pixels behind the text has to pass, not the average.

## Rules

- **Clear the space first.** Don't put text on a busy area and then add a blur or shadow. Move the bright part of the image away from the text.
- **Never rely on colour alone.** Pair red and green with a mark or a word.
- **Sizes.** Body text 1rem or more on marketing pages, and nothing under 0.75rem.
- **Moving text can't be read.** If it has to be read, hold it still. A caption needs about 2.5 seconds per short sentence.
- **Muted text is still text.** It has to pass the same limit.
- **Motion.** Everything has to make sense with `prefers-reduced-motion`, and no flashing faster than three times a second.

## Trust the tool last

A run with no failures proves nothing until you've seen it fail. Add a low-contrast test element over the brightest part of the page and confirm it gets flagged. A background behind a canvas doesn't count as the background, and the script stops walking up at the element that contains the canvas for that reason.
