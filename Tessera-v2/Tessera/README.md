# Tessera

**Know what you need. Know why.**

Tessera is a web app that tells a student which documents their application needs, explains why each one applies, shows which documents are waiting on others, and tracks how close they are to ready.

This is version 2: a single-page, award-style site with smooth scrolling, a character-by-character hero, a custom cursor, magnetic buttons, scroll reveals and clip-path wipe transitions, with the working app built into the page.

> Final-year project prototype. All rules are fictional and for research only. Tessera never uploads, checks or stores real documents.

---

## Part A — Run it in 2 minutes

1. Unzip `Tessera.zip`. You get a folder called `Tessera`.
2. Double-click `index.html`. It opens in your browser.
3. Double-click `tests.html` to run the 20 automated rule tests.

You need an internet connection for the fonts and animation libraries. Without one, the app still works. It just appears without animation, in fallback fonts.

---

## Part B — Build it yourself, step by step

Follow these in order. Each step ends with something you can see in the browser.

### Step 1 — Install your tools (15 min)

1. Install **Visual Studio Code**: code.visualstudio.com.
2. In VS Code, open **Extensions** (left bar, four squares) and install **Live Server**. It reloads the browser every time you save.
3. Install **Google Chrome** or **Microsoft Edge** if you don't have one.

### Step 2 — Create the folder structure (5 min)

```
Tessera/
├── index.html          the page
├── tests.html          test runner page
├── tailwind.config.js  Tailwind colours and fonts
├── src/input.css       your styles (you edit this)
├── css/styles.css      compiled styles (generated, don't edit)
├── js/rules.js         rule engine: questions, 11 rules, logic
├── js/tests.js         20 automated tests
├── js/app.js           the interactive checklist
├── js/motion.js        all animation
└── assets/             logo files
```

In VS Code: **File → Open Folder → Tessera**. Right-click `index.html` → **Open with Live Server**.

### Step 3 — The page skeleton: `index.html` (1 hour)

The page is a stack of full-width sections, in this order:

| Section | id | What it shows |
|---|---|---|
| Hero | `#top` | Big headline, two buttons, floating document cards |
| Marquee | – | Yellow band of document names, tilted |
| Problem | `#why` | Large text that lights up as you scroll, three problem cards |
| How it works | `#how` | Four steps that slide sideways while the page is pinned |
| The app | `#app` | The working checklist |
| Rules | `#rules` | All 11 rules in a table, live for your answers |
| Footer | `#start` | Yellow closing section |

Things to notice in the HTML:

- **`data-` attributes are hooks for the JavaScript.** `data-go` = jump to a section with a wipe. `data-magnetic` = magnetic button. `data-reveal` = fade up on scroll. `data-split` = heading slides up line by line. `data-cursor="Try"` = the cursor shows the word "Try" over this element.
- **Scripts load at the bottom** in this order: GSAP → ScrollTrigger → SplitText → Lenis → `rules.js` → `app.js` → `motion.js`. Order matters: each file uses the ones before it.

### Step 4 — Colours and fonts: `tailwind.config.js` (20 min)

Tailwind is a set of ready-made classes (`text-lg`, `mt-10`, `grid`). The config adds our brand:

| Name | Hex | Used for |
|---|---|---|
| `ink` | `#0A0A0A` | Page background |
| `coal` | `#131313` | Panels |
| `graphite` | `#1D1D1D` | Inner surfaces |
| `bone` | `#F2F0EA` | Text (warm white, softer than pure white) |
| `mute` | `#97948C` | Secondary text |
| `signal` | `#FFD000` | Yellow: buttons, emphasis, "ready" |

**Rule of thumb:** yellow only marks things you can act on or that are done. If everything is yellow, nothing stands out.

Fonts (from Google Fonts):
- **Archivo**, expanded width, extra bold: headlines.
- **Instrument Sans**: body text.
- **JetBrains Mono**: labels, rule IDs like `R5`.

### Step 5 — The rule engine: `js/rules.js` (2 hours)

This is the academic core. It contains no page code at all, so it can be tested on its own.

A rule looks like this:

```js
{
  id: 'income-declaration', rule: 'R6', name: 'Household income declaration',
  when: { all: [{ q: 'financialSupport', is: 'yes' }] }, // when it applies
  requires: ['bank-statements'],                          // collect first
  reason: 'The grant amount depends on total household income…'
}
```

- `when.all` → every condition must match (empty list = everyone).
- `when.any` → at least one condition must match.
- `requires` → documents to collect first. They only block if they also apply.

The main functions:

| Function | Returns |
|---|---|
| `evaluate(doc, answers)` | Does this rule apply? Which conditions matched? |
| `explain(doc, answers)` | "Needed because you are requesting financial support." |
| `assess(answers, ready)` | Every applicable document with its status, readiness %, and next step |
| `diffApplicable(before, after)` | Which documents were added or removed by a changed answer |

**Statuses:** To do (can start now), Waiting (a prerequisite isn't ready), Ready (ticked).
**Readiness = documents ready ÷ documents that apply.**

Check your work: open `tests.html`. All 20 tests should pass.

### Step 6 — The app: `js/app.js` (2 hours)

`app.js` connects the engine to the page:

1. **State:** `{ answers, ready, sample }`, saved to `localStorage` so a refresh keeps progress.
2. **Draw:** `render()` calls `assess()` once, then redraws the readiness ring, the next step, the document list, the rules table and the open drawer.
3. **Actions:** `setAnswer()`, `toggleReady()`, `openDrawer()`, `startBlank()`.
4. **Events:** one click listener for the whole page reads `data-open`, `data-toggle` and `data-close`.

It uses GSAP if it's there (percent counting up, new rows sliding in, the drawer wiping open) and works without it.

### Step 7 — The animations: `js/motion.js` (3 hours)

Read the file top to bottom. Each numbered block is one effect.

**1. Smooth scroll (Lenis).** Lenis takes over the mouse wheel and eases the page towards where you scrolled, instead of jumping. It runs inside GSAP's clock, so scroll animations and smooth scrolling never drift apart:

```js
const lenis = new Lenis({ duration: 1.15 });
lenis.on('scroll', ScrollTrigger.update);           // tell ScrollTrigger we moved
gsap.ticker.add(time => lenis.raf(time * 1000));    // one shared clock
```

**2. Hero entrance.** `splitChars()` wraps every letter in its own `<span class="char">`. Each line has `overflow: hidden`, so pushing a letter down 115% hides it. One timeline then plays: the yellow curtain's tiles pop in → the curtain wipes upward with `clip-path` → letters glide up one after another (`stagger: 0.024`) → the yellow highlight sweeps behind "why." → the paragraph, buttons and cards rise in.

**3. Custom cursor.** Two elements follow the pointer using `gsap.quickTo()`. The dot is fast (0.12s), the ring is slow (0.55s), which creates the trailing feel. Hovering any link or button grows the ring. Elements with `data-cursor="Why"` fill the ring yellow and show the word. `mix-blend-mode: difference` makes the cursor flip colour automatically over yellow areas.

**4. Magnetic buttons.** On pointer move, the button moves 35% of the distance between its centre and the pointer, and its text moves a little less. That gap creates the sense of depth. On leave, `elastic.out` snaps it back with a small wobble.

**5. Scroll reveals.** These use ScrollTrigger:
- Headings marked `data-split` are split into lines by **SplitText**. Each line slides up from behind a mask when the heading reaches 88% down the screen.
- Blocks marked `data-reveal` rise 60px and fade in. `ScrollTrigger.batch` groups the ones that enter together, so they stagger.
- The problem paragraph is split into words. Their opacity is **scrubbed**, meaning it's tied to scroll position, so the words light up as you read down.

**6. Marquee.** An endless loop moves the band left. ScrollTrigger measures how fast you scroll. Scrolling fast speeds it up, and scrolling up runs it backwards. The boost decays each frame, so it eases back to normal.

**7. Pinned horizontal section.** On screens 1024px and wider, ScrollTrigger pins "How it works" in place. Your vertical scrolling then moves the cards sideways (`pin: true, scrub: 1`). Each card's contents animate in using `containerAnimation`, which means "trigger when this card slides into view horizontally". On phones, the cards simply stack.

**8. Clip-path wipes.**
- **App panel:** starts clipped to a smaller rounded window, `inset(12% 7% 0% 7% round 48px)`, and opens to full size as you scroll.
- **Footer:** rises like a curtain.
- **Nav links:** clicking one plays a three-part transition. A full-screen yellow panel wipes up showing the section name, the page jumps underneath it instantly, then the panel wipes away. This is the "WebGL-like" page transition, done with plain CSS `clip-path`.

**Safety:** every effect runs inside `run()`, so one failure can't break the others. If the libraries don't load, or the visitor has *Reduce motion* turned on, `motion.js` adds `no-motion` and the page shows everything immediately.

### Step 8 — Responsive and accessible checks (1 hour)

- In Chrome press **F12** → device toolbar → iPhone 12 (390px). Check there's no sideways scrolling.
- Use only the keyboard: Tab through everything, Space to tick, Enter to open a document, Esc to close.
- Turn on *Reduce motion* (Windows: Settings → Accessibility → Visual effects → Animation effects off). Reload. Everything should appear without animation.

### Step 9 — Change the styles (only if you add new Tailwind classes)

`css/styles.css` is generated from `src/input.css`. If you only change text or JavaScript, you don't need this step.

If you add new Tailwind classes:

1. Download the Tailwind CLI for Windows (`tailwindcss-windows-x64.exe`) from github.com/tailwindlabs/tailwindcss/releases (v3.4.17). Put it in the `Tessera` folder.
2. Open a terminal in VS Code (**Terminal → New Terminal**) and run:

```
.\tailwindcss-windows-x64.exe -i src/input.css -o css/styles.css --minify
```

No Node.js needed. On a Mac, use `tailwindcss-macos-arm64` and `./` instead of `.\`.

---

## Part C — Before your user study

Do these so every participant gets the same experience:

1. **Start blank.** In `js/app.js`, find `const state = load() || {` and change `R.SAMPLE_ANSWERS` to `R.DEFAULT_ANSWERS`, and `R.SAMPLE_READY.slice()` to `[]`.
2. **Turn off the custom cursor.** In `js/motion.js`, set `customCursor: false`. An unfamiliar cursor would affect your timing results.
3. **Clear saved progress between participants.** Click *Start from blank* (twice), or open the browser in a private window for each session.

---

## Part D — Testing evidence for your report

**Automated:** `tests.html`, 20 tests. TC01–TC10 check each rule, TC11–TC13 check blocking, TC14–TC16 check readiness, and TC17–TC20 check change detection, next step, explanations and rule integrity.

**Manual tests to record:**

| ID | Test | Expected |
|---|---|---|
| M1 | Refresh after ticking documents | Ticks and answers return |
| M2 | Set Financial support to Yes | Toast lists 3 added documents |
| M3 | Tick Bank statements | Income declaration changes from Waiting to To do |
| M4 | Tick everything | 100%, "Ready to submit" |
| M5 | Keyboard only | Every control reachable; Esc closes the drawer |
| M6 | Phone width 390px | No sideways scrolling; steps stack |
| M7 | Reduce motion on | No animation, all content visible |
| M8 | Disconnect from the internet | App still works without animation |

---

## Why the name "Tessera"

A *tessera* is a single tile in a mosaic. The Romans also used tesserae as tokens that proved who you were or what you were entitled to.

Both meanings describe the project. Each document is one piece of a complete application, and documents are proof of identity and entitlement.

It also works as a product name. It is short, easy to say in any language, and doesn't sound like a generic template (DocCheck, ReadyList). Other companies use the name, which is fine for a university project but worth knowing.

## Why this logo

The mark is four tiles: mosaic pieces, taken directly from the name. They fill in from faint to solid, and the last one carries a tick, so the logo itself shows progress towards ready. It is one simple shape, so it still reads at favicon size (16px).

## Why black and yellow

Yellow on near-black has a contrast ratio of about 13.5:1, far above the 4.5:1 accessibility minimum. It's also the colour of a highlighter: Tessera highlights the documents that matter.

| File | Use |
|---|---|
| `assets/logo.svg` / `logo.png` | Yellow icon: dark backgrounds, app icon |
| `assets/logo-dark.svg` / `logo-dark.png` | Black icon: yellow or white backgrounds, report cover |

---

## Libraries used

| Library | Version | Purpose | Loaded from |
|---|---|---|---|
| GSAP | 3.13.0 | Animation engine | jsDelivr |
| ScrollTrigger | 3.13.0 | Scroll-linked animation | jsDelivr |
| SplitText | 3.13.0 | Split headings into lines and words | jsDelivr |
| Lenis | 1.3.8 | Smooth scrolling | jsDelivr |
| Tailwind CSS | 3.4.17 | Utility classes (compiled, no runtime) | local file |

GSAP, including SplitText, has been free for all use since version 3.13.
