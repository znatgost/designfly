// The fly's design knowledge: short, opinionated, practical answers, retrieved by keyword score.
// Each entry: { id, k: [keywords/phrases], a: markdown answer, see?: [related ids] }

export const KB = [
  // ---------------------------------------------------------------- logos & branding
  { id: 'logo-good', k: ['good logo', 'logo principles', 'what makes a logo', 'logo tips', 'logo', 'memorable', 'great logo'], a:
`A good logo is **simple, distinctive, and works tiny**. My checklist:
- **Squint test** — blur your eyes; the shape should still read.
- **16 px test** — shrink it to a favicon. If it turns to mud, simplify.
- **One idea** — one clever thing, not three.
- **Mono first** — design it in black; colour is a bonus, not the concept.
- **Timeless > trendy** — gradients and 3D date fast.
- **Scalable system** — horizontal, stacked, icon-only versions.
Want me to make one? Tell me the name and what the business does.`, see: ['logo-types', 'logo-process'] },
  { id: 'logo-types', k: ['types of logo', 'logo types', 'wordmark', 'lettermark', 'monogram', 'emblem', 'combination mark', 'abstract mark', 'pictorial', 'badge logo'], a:
`The main logo types:
- **Wordmark** — just the name in custom type (Google, FedEx). Best for short, unique names.
- **Lettermark / monogram** — initials (IBM, HBO). For long names.
- **Pictorial mark** — a literal icon (Apple, Twitter bird).
- **Abstract mark** — a geometric symbol (Nike swoosh, Pepsi). Needs budget to teach people.
- **Combination** — symbol + wordmark. The safest default for new brands.
- **Emblem / badge** — text inside a shape (Starbucks, Harley). Great for crafts, cafés, sport; weak at tiny sizes.
Ask me for any of these, e.g. *"emblem logo for a bakery called Crumb"*.` },
  { id: 'logo-process', k: ['logo process', 'how to design a logo', 'design a logo step', 'logo brief', 'start a logo'], a:
`How I'd design a logo:
1. **Brief** — who is it for, what's the one feeling, who are the competitors?
2. **Word storm** — 20 words around the brand; circle 3.
3. **Thumbnails** — 30+ tiny pencil sketches in 20 minutes. Quantity first.
4. **Pick 3**, refine in vector, black only.
5. **Type** — choose or customise letters that match the mark's geometry.
6. **Colour** — last. One primary, one accent.
7. **Test** — favicon, embroidery, billboard, black-and-white fax.
8. **System** — lockups, clear space, minimum size, don'ts.` },
  { id: 'brand-identity', k: ['brand identity', 'branding', 'identity', 'brand guidelines', 'brand book', 'visual identity', 'style guide'], a:
`A brand identity is more than a logo. The core kit:
- **Logo system** — primary, secondary lockup, icon, clear space, minimum size.
- **Colour** — primary, secondary, accent, neutrals, with HEX/RGB/CMYK and usage ratios.
- **Typography** — a display face and a text face, with a scale.
- **Graphic elements** — pattern, shapes, iconography style, photo style.
- **Voice** — how it talks (3 adjectives + do/don't examples).
- **Applications** — cards, social, packaging, signage.
I can generate a whole board: *"brand identity for a surf school called Swell"*.` },
  { id: 'brand-name', k: ['brand name', 'naming', 'name ideas', 'company name', 'name my'], a:
`Naming tips: short (≤ 2 syllables is gold), easy to spell after hearing it once, domain-able, not a generic word in your category. Styles: **descriptive** (General Motors), **evocative** (Amazon, Nike), **invented** (Kodak), **compound** (Facebook), **founder** (Ford). Say it out loud in a sentence: "I'll just ___ it." Then check trademarks before falling in love.` },

  // ---------------------------------------------------------------- colour
  { id: 'color-theory', k: ['color theory', 'colour theory', 'color wheel', 'harmony', 'complementary', 'analogous', 'triadic', 'color scheme', 'colour scheme'], a:
`Colour harmonies on the wheel:
- **Monochrome** — one hue, many tints. Calm, elegant, hard to get wrong.
- **Analogous** — neighbours (blue, teal, green). Natural and cohesive.
- **Complementary** — opposites (blue + orange). Maximum contrast; use one as an accent.
- **Split-complementary** — a hue + the two beside its opposite. Contrast with less tension.
- **Triadic** — three evenly spaced. Playful; let one dominate.
Rule of thumb: **60-30-10** — 60% neutral, 30% primary, 10% accent. Tell me a colour and I'll build the harmonies for it.`, see: ['color-psych', 'contrast'] },
  { id: 'color-psych', k: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'colour for', 'color for', 'good for a', 'choose colors', 'choose colours', 'brand colors', 'brand colours', 'pick colors', 'pick colours', 'choosing colors', 'which color', 'which colour', 'color psychology', 'colour psychology', 'what does blue mean', 'meaning of colors', 'color meaning', 'colour meaning', 'feel', 'emotion color'], a:
`Colour associations (culture-dependent, not laws):
- **Blue** — trust, calm, tech, finance. The safest corporate colour (so, the most common).
- **Green** — nature, health, growth, money.
- **Red** — energy, urgency, appetite, love. Loud; great for CTAs and food.
- **Orange** — friendly, affordable, playful.
- **Yellow** — optimism, attention; needs a dark partner for legibility.
- **Purple** — creativity, luxury, mystery.
- **Black** — luxury, power, minimal. **White** — clean, space, honesty.
- **Brown/beige** — craft, warmth, earthiness.
Pick against competitors too: if everyone in your category is blue, owning orange is a strategy.` },
  { id: 'contrast', k: ['contrast', 'accessible', 'accessibility', 'wcag', 'readable', 'legible', 'a11y', 'color blind', 'colour blind'], a:
`Accessibility basics (WCAG 2.2):
- Body text needs **4.5 : 1** contrast (AA), large text (≥ 24 px or 19 px bold) **3 : 1**. AAA is 7 : 1.
- UI components and icons need **3 : 1** against their background.
- Never use colour alone to carry meaning — add an icon, label or pattern (8% of men are colour-blind).
- Grey text on white: #767676 is the lightest that passes AA.
Paste two hex codes (e.g. *"contrast #1d1d1f on #f5f5f7"*) and I'll check them.` },
  { id: 'color-count', k: ['how many colors', 'how many colours', 'too many colors', 'number of colors'], a: `For a brand: **1 primary, 1–2 secondary, 1 accent, plus 2 neutrals** (dark ink, light paper). More than that and nothing feels like *the* colour. For UI, add semantic colours (success, warning, error) and 8–10 step tints of your primary.` },
  { id: 'cmyk-rgb', k: ['cmyk', 'rgb', 'pantone', 'print colors', 'print colour', 'color for print', 'spot color'], a:
`**RGB** is light (screens), **CMYK** is ink (print). Bright RGB blues, greens and oranges often go dull in CMYK — check before you promise a client neon. **Pantone** (spot) inks give exact, consistent colour for logos and packaging. Workflow: design in RGB, define CMYK + Pantone equivalents in the brand guide, soft-proof before printing.` },
  { id: 'gradients', k: ['gradient', 'gradients', 'mesh gradient'], a: `Good gradients: neighbours on the wheel (blue → violet), similar lightness, subtle noise to avoid banding, and use OKLCH/LAB interpolation so the middle doesn't go grey. Avoid complementary gradients (red → green) unless you want mud in the middle.` },

  // ---------------------------------------------------------------- typography
  { id: 'font-pairing', k: ['font pairing', 'pair fonts', 'fonts together', 'combine fonts', 'which fonts', 'font combination', 'typeface pairing'], a:
`Pairing fonts:
- **Contrast, not conflict** — pair a serif with a sans, or a display face with a neutral workhorse.
- **Match x-heights and proportions** so they sit well on one line.
- **Two families max** (plus maybe a mono for data).
- One personality at a time: the display font talks, the body font listens.
Safe classics: Playfair Display + Source Serif, Montserrat + Inter, Fraunces + Lora, Space Grotesk + IBM Plex Mono. Ask *"what goes with Montserrat?"* or *"make a type pairing for a law firm"*.`, see: ['type-hierarchy'] },
  { id: 'type-hierarchy', k: ['hierarchy', 'type scale', 'font size', 'heading size', 'typographic hierarchy', 'modular scale'], a:
`Build hierarchy with **size, weight, colour and space** — in that order of strength. Use a modular scale: base 16–18 px × ratio (1.25 major third, 1.333 perfect fourth, 1.618 golden). Keep 3–4 levels on a page. Line height ~1.5 for body, ~1.1 for headings. Line length 45–75 characters. Ask *"type scale 16 px 1.25"* and I'll compute it.` },
  { id: 'kerning', k: ['kerning', 'tracking', 'letter spacing', 'leading', 'line height'], a:
`**Kerning** = space between specific pairs (AV, To). **Tracking** = spacing across a whole word. **Leading** = line height.
- Track **all caps** open (+5–15%); never track lowercase body text.
- Large headlines usually want slightly **tighter** tracking (−1 to −3%).
- Kern by flipping the logo upside-down — you see shapes, not letters.` },
  { id: 'serif-sans', k: ['serif vs sans', 'serif or sans', 'serif', 'sans serif', 'sans-serif'], a: `**Serif** reads as traditional, editorial, trustworthy, luxurious; **sans-serif** as modern, clean, neutral, tech. On screens both are fine now — pick by personality. A common trick: serif headlines for warmth + sans body for clarity (or the reverse for a modern editorial feel).` },
  { id: 'fonts-free', k: ['free fonts', 'google fonts', 'font license', 'commercial font'], a: `Good free sources: **Google Fonts** (all OFL), Fontshare, the League of Moveable Type, Velvetyne. OFL fonts are free for commercial use, including logos. Always check the licence for app embedding and logo use with paid foundry fonts.` },

  // ---------------------------------------------------------------- layout / composition
  { id: 'grid', k: ['grid', 'grid system', 'layout grid', 'columns', '12 column', 'baseline grid'], a:
`Grids make layouts feel intentional. Web: **12 columns** (divisible by 2, 3, 4, 6), 24–32 px gutters, max width ~1200–1440 px. Mobile: 4 columns, 16 px margins. Print: pick margins first, then columns; align text to a **baseline grid**. Break the grid on purpose, once per page — that's where the eye goes.` },
  { id: 'composition', k: ['composition', 'balance', 'rule of thirds', 'focal point', 'visual weight', 'layout tips'], a:
`Composition tools: **one focal point** (the biggest/brightest/most contrasting thing), **rule of thirds** for placement, **asymmetry** for energy, **symmetry** for calm and authority, **directional cues** (eyes, arrows, lines) to lead the reader, and **alignment** — everything should line up with *something*.` },
  { id: 'whitespace', k: ['white space', 'whitespace', 'negative space', 'spacing', 'padding', 'too cluttered', 'cluttered'], a: `Whitespace isn't empty — it groups, separates and signals quality. Use a spacing scale (4/8-point: 4, 8, 16, 24, 32, 48, 64…) so gaps are consistent. Related things close together, unrelated things further apart (proximity). If a design feels cheap, first try *removing* something and adding space.` },
  { id: 'gestalt', k: ['gestalt', 'proximity', 'similarity', 'closure', 'continuity', 'figure ground'], a: `Gestalt principles: **proximity** (close = related), **similarity** (look alike = related), **closure** (the brain completes shapes — great for logos), **continuity** (the eye follows lines), **figure–ground** (negative-space tricks like the FedEx arrow), **common region** (a box groups things).` },
  { id: 'golden-ratio', k: ['golden ratio', 'fibonacci', '1.618', 'divine proportion'], a: `The golden ratio (≈ 1.618) is a handy proportion for type scales, layout splits (62/38) and logo construction circles — but it's a tool, not magic. Most "golden logos" were retrofitted afterwards. Use it when you need *a* ratio and don't have a better reason.` },
  { id: 'visual-hierarchy', k: ['visual hierarchy', 'what to look first', 'emphasis', 'draw attention'], a: `Make the reader's path obvious: **1 thing** they see first (size/contrast), **2–3 things** second, everything else third. Test by squinting or blurring the screenshot — the order you see blobs in is your real hierarchy.` },

  // ---------------------------------------------------------------- UI / UX
  { id: 'ui-principles', k: ['ui design', 'ux', 'user interface', 'app design', 'website design', 'ui tips', 'ux tips', 'usability'], a:
`UI/UX essentials:
- **Clarity over cleverness** — one primary action per screen.
- **Consistency** — same thing looks and behaves the same everywhere.
- **Feedback** — every tap does something visible within 100 ms.
- **Forgiveness** — undo beats "are you sure?".
- **Recognition over recall** — show options, don't make people remember.
- **Tap targets ≥ 44 px**, primary actions in the thumb zone.
- **Content first** — design with real text, not lorem ipsum.
Ask me for a mockup: *"mobile app for a plant shop called Bloom"* or *"dashboard wireframe"*.` },
  { id: 'landing-page', k: ['landing page', 'homepage', 'hero section', 'conversion', 'cta', 'call to action'], a:
`A landing page that converts: **headline** (the outcome, not the feature), **subhead** (who it's for + how), **one primary CTA** above the fold, **proof** (logos, numbers, testimonial), **3 benefits**, **objection handling / FAQ**, **repeat the CTA**. CTA copy = verb + value ("Start free trial", not "Submit").` },
  { id: 'dark-mode', k: ['dark mode', 'dark theme', 'dark ui'], a: `Dark mode tips: don't use pure black (#000) — try #111–#1a1a1a; lower saturation of brand colours; express elevation with *lighter* surfaces, not shadows; reduce text weight slightly; keep contrast but avoid pure white body text (#e6e6e6 is gentler).` },
  { id: 'design-system', k: ['design system', 'component library', 'tokens', 'design tokens', 'atomic design'], a: `A design system = **tokens** (colour, type, spacing, radius, shadow) → **components** (button, input, card) → **patterns** (forms, navigation) → **guidelines** (when and why). Start small: document what you already use, name it, remove duplicates. My palette and type exports come as CSS tokens you can build on.` },
  { id: 'wireframe', k: ['wireframe', 'lo-fi', 'low fidelity', 'prototype', 'mockup vs wireframe'], a: `Wireframes (grey boxes) decide **structure**; mockups decide **look**; prototypes decide **behaviour**. Do them in that order so feedback stays on the right question — nobody argues about button colour on a wireframe.` },
  { id: 'icons', k: ['icon', 'icons', 'icon set', 'iconography', 'app icon'], a: `Icons: one grid (24 × 24 with 2 px padding), one stroke width, one corner radius, one metaphor per concept. Label them unless they're universal (search, home, close). App icons: one bold shape, no text, test on both light and dark wallpapers.` },

  // ---------------------------------------------------------------- print & files
  { id: 'print', k: ['print', 'bleed', 'dpi', 'resolution', 'crop marks', 'print ready', 'safe zone'], a:
`Print-ready checklist: **300 dpi** at final size, **3 mm bleed** (1/8 in) beyond the trim, keep text **4–5 mm inside** the edge, **CMYK** or spot colours, fonts outlined or embedded, rich black (C60 M40 Y40 K100) for big black areas but plain K100 for small text. Ask *"A4 at 300 dpi in pixels"* for sizes.` },
  { id: 'file-formats', k: ['file format', 'svg', 'png', 'jpg', 'pdf', 'vector vs raster', 'vector', 'raster', 'eps', 'which format'], a: `**Vector** (SVG, PDF, AI, EPS) scales infinitely — logos, icons, illustrations. **Raster** (PNG, JPG, WebP) is pixels — photos, screenshots. PNG for transparency and flat graphics, JPG/WebP for photos, SVG for logos on the web, PDF for print. Everything I make downloads as SVG (editable in Figma/Illustrator) and PNG.` },
  { id: 'business-card', k: ['business card size', 'business card', 'card size', 'visiting card'], a: `Business card sizes: **85 × 55 mm** (EU), **3.5 × 2 in / 89 × 51 mm** (US), 91 × 55 mm (JP/AU). Add 3 mm bleed. Keep it to name, role, one phone, one email, website — a QR code can carry the rest. Thick stock (350 gsm+) and one special finish beats five effects.` },
  { id: 'poster-design', k: ['poster design', 'poster tips', 'flyer', 'poster'], a: `Poster rules: readable from **3 metres** — the headline should be understood in 3 seconds; one image or shape; details (date, place, URL) grouped in one corner; use the A-series ratio (1 : √2) so it scales A4 → A0. Styles I can do: Swiss, Bauhaus, minimal, brutalist, gradient, retro, editorial.` },

  // ---------------------------------------------------------------- architecture & interior
  { id: 'arch-principles', k: ['architecture', 'architectural', 'building design', 'architecture principles', 'good architecture'], a:
`Architecture fundamentals I care about:
- **Light** — orient living spaces to the sun (south in the northern hemisphere), bedrooms east for morning light.
- **Circulation** — every room reachable without passing through another; short, bright corridors.
- **Zoning** — public (living, kitchen) vs private (bedrooms, baths); day vs night.
- **Proportion** — rooms around 1 : 1.2 – 1 : 1.6 feel good; ceilings ≥ 2.6 m.
- **Structure honesty** — let the grid of columns and walls organise the plan.
- **Wet cores** — stack and group bathrooms/kitchen to share plumbing.
Ask me for a plan: *"2 bedroom apartment floor plan, 70 m², blueprint style"*.`, see: ['floorplan-tips', 'room-sizes'] },
  { id: 'floorplan-tips', k: ['floor plan', 'floorplan', 'apartment layout', 'house plan', 'room layout', 'plan layout', 'open plan'], a: `Floor-plan tips: put the entrance into a small hall (not straight into the living room), keep the kitchen–dining–living triangle open, place bedrooms off a corridor away from the entrance, group wet rooms, give every habitable room a window, and allow 90 cm clear walkways around beds and tables.` },
  { id: 'room-sizes', k: ['room size', 'bedroom size', 'minimum size', 'how big', 'dimensions', 'standard size', 'ceiling height', 'door width'], a:
`Typical comfortable sizes:
- Double bedroom **12–16 m²** (min ~3 × 3.5 m), single **8–10 m²**.
- Living room **18–30 m²**; kitchen **8–12 m²** (work triangle 4–7 m total).
- Bathroom **4–6 m²**, WC **1.2 × 1.8 m**.
- Corridor **≥ 1.1 m** wide (1.2 m+ for accessibility), doors **80–90 cm**.
- Ceiling **2.6–2.8 m** in homes; stairs: 2 risers + 1 tread ≈ 63 cm.
Local building codes win over my rules of thumb.` },
  { id: 'facade', k: ['facade', 'façade', 'elevation', 'exterior design', 'building exterior'], a: `Façade design: find a **rhythm** (window bays on a module), a **base–middle–top** (ground floor different, a clear roofline), align openings vertically, vary depth for shadow, and limit materials to 2–3. Ask for *"brutalist façade, 5 floors"* or *"scandinavian house elevation"*.` },
  { id: 'interior', k: ['interior design', 'interior', 'decorate', 'living room design', 'room design', 'home decor', 'furnish'], a:
`Interior basics:
- **60-30-10** colour: walls/floor 60, furniture 30, accents 10.
- **Layered light** — ambient + task + accent, warm 2700–3000 K at home.
- **Scale** — rug big enough that front sofa legs sit on it; art ≈ 2/3 of the sofa width, centred ~145 cm from the floor.
- **Texture** over more colour — wood, linen, wool, stone.
- **Walkways** 80–90 cm; coffee table 40–45 cm from the sofa.
I can make a mood board: *"japandi interior mood board"*.`, see: ['lighting'] },
  { id: 'lighting', k: ['lighting', 'lamp', 'light design', 'color temperature', 'kelvin', 'lux'], a: `Lighting: **2700 K** warm for living/bedrooms, **3000–3500 K** kitchens/baths, **4000 K** offices. Aim for ~150–300 lux in living spaces, 500 lux on work surfaces. Put lights on separate circuits and dimmers. Hide the source when you can — light the wall, not your eyes.` },
  { id: 'interior-styles', k: ['japandi', 'scandinavian style', 'mid century', 'industrial style', 'minimalist interior', 'boho', 'interior style'], a: `Quick interior style guide: **Scandinavian** — white walls, pale wood, hygge textiles. **Japandi** — Scandi + Japanese: low furniture, oak, linen, wabi-sabi imperfection. **Mid-century** — teak, tapered legs, mustard/teal. **Industrial** — concrete, steel, exposed brick, Edison bulbs. **Boho** — rattan, plants, layered patterns. **Minimal** — few objects, hidden storage, one material story.` },

  // ---------------------------------------------------------------- fashion
  { id: 'fashion-basics', k: ['fashion design', 'fashion', 'clothing design', 'design clothes', 'collection', 'garment'], a:
`Fashion design process: **research & mood** → **silhouette** (the overall shape: A-line, H, X, oversized) → **fabric** (drape and weight decide what's possible) → **colour story** (3–5 colours per collection) → **flats / tech packs** for production → **toile** (muslin test) → fit → sample. A collection is 8–30 looks that share a story. I can draw tech flats: *"hoodie flat with a graphic print"*.`, see: ['tech-pack'] },
  { id: 'tech-pack', k: ['tech pack', 'flat sketch', 'technical flat', 'spec sheet', 'manufacturer'], a: `A tech pack is the garment's instruction manual: **front/back flats**, construction callouts (stitches, seams, trims), **measurements (POM)** per size, **bill of materials** (fabric, zips, labels), **colourways**, and **grading**. Flats are symmetric, front-on, no body — so the factory can measure them.` },
  { id: 'fashion-color', k: ['what colors go together clothes', 'outfit colors', 'what to wear', 'outfit', 'style advice', 'capsule wardrobe', 'wardrobe'], a: `Outfit colour rules: build on **neutrals** (navy, grey, camel, white, black, olive), add **one** accent; match **undertones** (warm with warm); tonal outfits (shades of one colour) look expensive. Capsule wardrobe: ~30 pieces, 3–4 neutrals + 2 accents, everything combinable.` },
  { id: 'fabrics', k: ['fabric', 'fabrics', 'textile', 'material for', 'cotton', 'linen', 'wool', 'gsm'], a: `Fabric cheat sheet: **cotton jersey** 160–220 gsm for tees, 300–400 gsm fleece for hoodies, **linen** breathable but creases, **wool** warm + drapey, **viscose** fluid drape for dresses, **denim** 12–14 oz for jeans. Weight (gsm/oz) changes the whole silhouette — pick it before you draw the final.` },
  { id: 'body-proportion', k: ['croquis', 'fashion illustration', 'figure drawing', 'proportions body', 'nine heads'], a: `Fashion illustration uses an elongated **9-head** figure (real people are ~7.5 heads). Shoulders ≈ 2 heads wide, waist at head 3, legs from head 4.5. Draw the pose line first, then the balance line from the neck to the weight-bearing foot.` },

  // ---------------------------------------------------------------- product / industrial
  { id: 'product-design', k: ['product design', 'industrial design', 'design a product', 'prototype product', 'object design'], a: `Product design loop: **problem** → **user research** → **sketches** (lots, fast) → **foam/cardboard models** → **CAD** → **prototype** → test → iterate → **DFM** (design for manufacturing: draft angles, wall thickness, fewer parts). Dieter Rams' test: is it useful, understandable, unobtrusive, honest, long-lasting? I can do concept sketches: *"sketch a ceramic vase"*.` },
  { id: 'packaging', k: ['packaging', 'label design', 'package design', 'bottle label'], a: `Packaging: win the **3-second shelf test** — one big brand block, one clear product name, one hero image/colour. Front: brand + what it is + key benefit. Back: details, legal, barcode. Mind the dieline, bleed and how it looks in a row of ten.` },

  // ---------------------------------------------------------------- career / process
  { id: 'portfolio', k: ['portfolio', 'design portfolio', 'case study', 'get hired', 'job designer'], a: `Portfolio: **5–8 projects**, best first, each as a short case study — problem, your role, process (a few sketches!), outcome with numbers. Show thinking, not just pretty finals. Keep it fast to scan; hiring managers spend ~2 minutes.` },
  { id: 'pricing', k: ['how much to charge', 'pricing design', 'price logo', 'freelance rate', 'rate', 'charge client'], a: `Freelance pricing: price the **value and scope**, not the hours. Define deliverables and revision rounds (usually 2) in writing, take 30–50% upfront, charge for extra rounds. A logo is rarely "just a logo" — a small identity package is easier to price and sell.` },
  { id: 'feedback', k: ['critique', 'feedback', 'review my design', 'client feedback', 'handle feedback'], a: `Getting better feedback: ask **specific questions** ("does the headline read first?"), present 2–3 options max, explain the *why* behind each choice, and translate vague feedback ("make it pop") into a concrete change (contrast? size? colour?). Drop an image here and I'll critique it.` },
  { id: 'inspiration', k: ['inspiration', 'where to find inspiration', 'references', 'creative block', 'stuck'], a: `Inspiration beyond Dribbble: design history (Bauhaus, Swiss, Müller-Brockmann, Saul Bass, Paula Scher), architecture, old packaging, museum archives, nature macro photos, typography specimens. For creative block: set constraints (2 colours, 1 font, 20 minutes), sketch on paper, or copy a master to learn — then make it yours.` },
  { id: 'tools', k: ['figma', 'illustrator', 'photoshop', 'which software', 'design tools', 'blender', 'autocad', 'sketchup'], a: `Tools: **Figma** (UI, collaboration, logos in a pinch), **Illustrator / Affinity Designer** (vector, logos, print), **Photoshop / Affinity Photo** (raster), **InDesign** (multi-page print), **Blender** (3D), **SketchUp / Revit / ArchiCAD** (architecture), **CLO 3D** (fashion). My SVG files open in all the vector ones.` },
  { id: 'design-history', k: ['bauhaus', 'swiss style', 'memphis', 'art deco', 'design history', 'modernism', 'brutalism'], a: `Design movements in one line each: **Art Nouveau** — organic curves. **Art Deco** — geometric luxury. **Bauhaus** — form follows function, primary shapes. **Swiss/International** — grids, sans-serif, objectivity. **Mid-century** — optimistic, organic modernism. **Memphis** — loud postmodern squiggles. **Brutalism** — raw concrete, honest mass. **Flat/Minimal** — digital clarity. I can make posters in several of these.` },
  { id: 'trends', k: ['trend', 'trends', '2026', 'modern design', 'current design'], a: `Trends come and go; I watch them but don't design *for* them. Recurring themes lately: expressive typography, tactile/grainy textures, warm neutrals, big bold minimalism, hand-drawn elements, variable fonts, dark UIs with one neon accent. Use a trend as seasoning, not the recipe.` },
  { id: 'accessibility-design', k: ['inclusive design', 'dyslexia', 'screen reader', 'alt text'], a: `Inclusive design: 16 px+ body text, 1.5 line height, left-aligned (not justified) text, sufficient contrast, visible focus states, alt text for images, captions for video, don't rely on colour alone, and respect reduced-motion settings.` },
  { id: 'about-fly', k: ['who are you', 'what are you', 'are you ai', 'your name', 'about you', 'tell me about yourself'], a: `I'm a fruit fly with a design degree (from the University of the Windowsill). Four thousand ommatidia per eye means I see every misaligned pixel. I give advice on graphic design, branding, colour, type, UI, architecture, interiors, fashion and product design — and I draw: logos, palettes, posters, floor plans, façades, fashion flats, product sketches, UI mockups. Everything downloads as SVG and PNG. I also have my own small mind — 121 neurons that learn your taste: say *"evolve a logo"* and rate what I invent, or *"show your brain"* to watch me think.` },
];

// ---------------------------------------------------------------- retrieval
const STOP = new Set('a an the is are to of for in on and or with my me i you it this that what how why which can do does should be your about any some tell give make please want need like get good best'.split(' '));
const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '');
const toks = (s) => s.toLowerCase().replace(/[^a-z0-9#\s-]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);

const INDEX = KB.map((e) => ({ e, phrases: e.k.map((p) => p.toLowerCase()), words: new Set(e.k.flatMap((p) => toks(p))) }));

export function searchKB(query, n = 3) {
  const q = query.toLowerCase(), qt = toks(query);
  const scored = INDEX.map(({ e, phrases, words }) => {
    let s = 0;
    for (const p of phrases) if (q.includes(p)) s += 2 + p.split(' ').length * 1.5;
    for (const t of qt) if (words.has(t)) s += 1;
    return { e, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  return scored.slice(0, n);
}
export const byId = (id) => KB.find((e) => e.id === id);
