# Chords

The chords a beginner meets, and the lush ones after them, on all twelve roots: 17 kinds of chord × 12 roots = 204
chords. Each has its name, its chord symbol, its keys on a piano keyboard, its sound on the piano that the app's own
keyboard plays, what kind of chord it is, its notes as scale degrees, and the keys (major and minor) it belongs to.
A dataset for [Knack](https://github.com/lorien-danger/knack): add it by this repo's link, or by its folder path.

It is for drilling the mapping between a chord's name and its keys until it is automatic: see *E♭ major* or *E♭* and
play E♭ G B♭; see keys lit and say what chord it is; hear it and name it. Every kind of chord is on every root, so
the only thing that stays the same between the examples of a kind is the kind itself.

| column | type | what it is |
|---|---|---|
| name | plain | *E♭ major*, *C♯ minor seventh*, *G♭ major ninth*. The title of a row; every row has its own |
| symbol | plain | the chord symbol: *E♭*, *C♯m7*, *G♭maj9* |
| keys | notes, `octave: false` | the chord's notes as keys on a keyboard. Shown lit in root position around middle C, played on the app's piano; answered by playing them in **any octave and any inversion** |
| sound | audio (`media/*.mp3`) | the chord on the piano: its notes one at a time, rising, then all together. 3.8–4.6 s |
| root | notes, `octave: false` | the root, as one key |
| kind | tree | *triad › minor*, *seventh chord › half-diminished seventh*, *ninth chord › major ninth* |
| formula | parts | the notes as scale degrees above the root: a minor seventh is 1, ♭3, 5, ♭7 (as in [knack-intervals](https://github.com/lorien-danger/knack-intervals)) |
| family | parts | the keys it belongs to: *C major, G major, F major, A minor, F minor, E minor, D minor* for C major |

Suggested decks (a deck is asked every way round, so each of these is both directions):

- **Name and keys:** see *E♭ major seventh*, play it; see keys lit, find its name.
- **Symbol and keys:** the same with *E♭maj7*.
- **Hear it, name it:** hear the chord, find its name (and hear a name, pick its sound).
- **What kind of chord?:** see keys lit, say what kind of chord it is, going down the tree (triad or seventh chord
  first, then which). The other way it asks you to pick out every chord of a kind among several keyboards.

The *root*, *formula* and *family* columns are not in a suggested deck. They are shown with the answer, and can be put
into a deck of your own (*E♭ major* and its family; keys and the formula).

## The chords

| kind | symbol | formula | name (on C) |
|---|---|---|---|
| triad › major | C | 1 3 5 | C major |
| triad › minor | Cm | 1 ♭3 5 | C minor |
| triad › diminished | C° | 1 ♭3 ♭5 | C diminished |
| triad › augmented | C+ | 1 3 ♯5 | C augmented |
| suspended chord › suspended second | Csus2 | 1 2 5 | C suspended second |
| suspended chord › suspended fourth | Csus4 | 1 4 5 | C suspended fourth |
| added-note chord › major sixth | C6 | 1 3 5 6 | C major sixth |
| added-note chord › minor sixth | Cm6 | 1 ♭3 5 6 | C minor sixth |
| added-note chord › added ninth | Cadd9 | 1 3 5 9 | C added ninth |
| seventh chord › dominant seventh | C7 | 1 3 5 ♭7 | C dominant seventh |
| seventh chord › major seventh | Cmaj7 | 1 3 5 7 | C major seventh |
| seventh chord › minor seventh | Cm7 | 1 ♭3 5 ♭7 | C minor seventh |
| seventh chord › half-diminished seventh | Cø7 | 1 ♭3 ♭5 ♭7 | C half-diminished seventh |
| seventh chord › diminished seventh | C°7 | 1 ♭3 ♭5 ♭♭7 | C diminished seventh |
| ninth chord › dominant ninth | C9 | 1 3 5 ♭7 9 | C dominant ninth |
| ninth chord › major ninth | Cmaj9 | 1 3 5 7 9 | C major ninth |
| ninth chord › minor ninth | Cm9 | 1 ♭3 5 ♭7 9 | C minor ninth |

The choices made, and why:

- **Which kinds.** The four triads and the five seventh chords are what every beginner meets. The two suspended chords,
  the two sixths and add9 are what pop and film music use most after them. The three ninth chords are what makes
  the lush, cinematic sound (major ninth and minor ninth especially). They earn their place: each is a seventh chord
  with one more note, so it is learned on top of one already known. The add9 next to the 9 also teaches what a
  seventh adds. Left out: 7sus4, minor-major seventh, 11ths, 13ths and altered chords. Each is easy to add to
  `QUALITIES` in `build/build.ts` if wanted.
- **The kind tree** groups chords by what is built on the triad:
  - *triad*: three notes stacked in thirds;
  - *suspended chord*: three notes, a second or fourth in place of the third;
  - *added-note chord*: a triad and one more note that is not a seventh, so the sixths and add9;
  - *seventh chord*;
  - *ninth chord*: a seventh chord and a ninth.

  The leaves use knack-intervals' names (*triad › minor*, *seventh chord › half-diminished seventh*), without its
  top level *chord*, since everything here is a chord.
- **Names** are the full names a teacher would say. Sixth chords are *major sixth* and *minor sixth*, not just
  *sixth*, so the two read as a pair. The chord written 7 is *dominant seventh*, to tell it from the *major seventh*.
- **Symbols** follow the common lead-sheet style: m for minor, ° for diminished, + for augmented, ø7 for
  half-diminished, °7 for diminished seventh, maj7 and maj9. Other spellings you will meet in chord charts: Cmin, C-
  (minor); Cdim (°); Caug (+); Cm7♭5 (ø7); Cdim7 (°7); CΔ7 (maj7).
- **Spelling.** A chord is spelled as a musician expects. E♭ major is E♭ G B♭, never D♯ G A♯.
  - Each note is on its own letter: the third two letters above the root, the fifth four, the seventh six.
  - A root on a black key is named whichever way spells the chord with fewer and plainer sharps and flats. A
    double sharp or flat counts as three; E♯, B♯, C♭ and F♭ count one more. So:
    - C♯ minor (C♯ E G♯), not D♭ minor (D♭ F♭ A♭);
    - D♯ diminished (D♯ F♯ A), not E♭ diminished (E♭ G♭ B♭♭);
    - G♭ augmented (G♭ B♭ D), not F♯ augmented (F♯ A♯ C♯♯);
    - G♭ major seventh (G♭ B♭ D♭ F), not F♯ major seventh (F♯ A♯ C♯ E♯).
  - Where the two ways tie, a chord with a minor third is named as its minor triad is (G♯ minor sixth, as G♯
    minor). Any other chord takes the key's usual name: D♭, E♭, F♯, A♭, B♭.
  - So the same key can be the root under two names (F♯ major, G♭ major seventh), as in real music. The root column
    treats them as one key.
  - A white-key root keeps its name, so some chords need a double sharp or flat: B augmented is B D♯ F♯♯, and C
    diminished seventh is C E♭ G♭ B♭♭. B♭♭ is the A key; it is written so because it is the chord's seventh
    lowered twice, which is what the formula ♭♭7 says. A double sharp or flat is written as two signs (♯♯, ♭♭), as
    knack-intervals writes ♭♭7, because the single signs (𝄪, 𝄫) are missing from most phone fonts.

  Spelling is for people only: the app compares keys, so E♭ and D♯ are the same key wherever an answer is played.
- **Which octave counts.** The keys column has `"octave": false`, so an answer is right when it has the right
  notes in any octave and any order: C E G, E G C (first inversion), G C E, or C E G an octave up are all C major.
  Learning what a chord *is* means knowing its notes; which C you start on, and which note is at the bottom, are
  voicing, a later skill. One result: chords that are the same notes are one answer to "play it". C major sixth and
  A minor seventh are both A C E G. Others are Cm6 and Aø7, Csus2 and Gsus4, the three augmented triads on C, E
  and G♯, and the four diminished sevenths on C, E♭, F♯ and A. So playing A C E G for C major sixth is right, and
  shown A C E G with C at the bottom, naming it A minor seventh is right too.
- **The voicing shown and heard.** Every chord is drawn and played in root position (root at the bottom, then each
  note the nearest above), with its root within half an octave of middle C: F♯3 up to F4. C major is C4 E4 G4;
  G major is G3 B3 D4. So every chord sits around middle C, and the root is always the lowest key lit. The whole
  column needs one keyboard from F♯3 to G5 (the top of F major ninth). That is two octaves and a note, 16 white
  keys: about 24 px a key on a phone held upright. The keys are written with octaves (`"E♭4"`) so that they are
  drawn there, but `"octave": false` makes the octave not count when marking.
- **The family** is every key the chord belongs to: every note of it is in the key's scale. A minor key counts its
  natural minor scale and its harmonic minor scale, with the raised seventh. So:
  - G major and G7 belong to C minor, as its V and V7;
  - B° and B°7 belong to C minor too, and E♭+ is its III+;
  - C major's family is C, G and F major, and A, D, E and F minor. That last one is the bittersweet borrowing the
    other way: C is V in F minor.

  Without the harmonic minor, a diminished seventh or augmented chord would belong to no key.
  - Keys are listed major first, then minor. Within each, they go by where the chord's root falls in the key (I,
    then II, and so on), so the first is the key whose tonic the chord is built on, if any.
  - The keys are named as they usually are: D♭, E♭, F♯, A♭ and B♭ major; C♯, E♭, F♯, G♯ and B♭ minor.
  - A chord can be spelled another way in its key's scale: F♯ major is G♭ major in D♭ major. Membership is by keys,
    not by spelling.

## The sounds

Every sound is played by the piano the app's keyboard plays: the Salamander Grand Piano V3 (a Yamaha C5 recorded by
Alexander Holm), as Knack's `scripts/piano.ts` renders it by the rules in `src/lib/piano/render.ts`. So a chord heard
here is the chord heard when its keys are tapped in the app.

- **What is played:** the chord's keys as shown (root position, root F♯3 to F4).
  - First one at a time, rising, one every 0.42 s, as the app's *One at a time* plays them.
  - Then, 0.75 s after the last, all together, as the app plays a chord when it is shown. The notes still ringing are
    damped over 0.08 s as the keys are struck again, as in the app.
  - The chord rings 2.2 s, the last 0.3 s faded out.
- **Why both:** for someone starting out, hearing the notes one by one makes a chord something you can follow;
  hearing them together is what has to be recognised in the end. They are in one sound, so one tap hears both.
- **Levels** are the app's: a note alone at full strength, each note of a chord at 1/√n so that a chord is as loud as
  a note. Nothing is normalised afterwards; the app's render only turns the whole down if it would peak above
  −1 dBFS, which none does.
- **Format:** stereo MP3, 44.1 kHz, VBR (LAME −V4), as `scripts/piano.ts` writes it. 52 kB on average, 10.7 MB in
  all. The rows point at `media/<id>.mp3`, so Knack serves them from wherever the dataset is.

`build/check.py` decodes every MP3 with ffmpeg and checks it against its row:

- its length;
- its loudness (EBU R128) and true peak;
- its pitches, measured from each note's partials:
  - each note in turn must be the strongest new sound when it is struck, within 12 cents of equal temperament;
  - together, every note must stand out at its pitch, and no strong peak may be left that is not a partial of one
    of the chord's notes.

The piano's lowest samples have a weak fundamental (F♯3's is 25 dB below its second partial), so pitch is read from
the first four partials, weighed by strength, not from the fundamental alone. The piano's own tuning follows a
slightly stretched curve, within about 7 cents of equal temperament in this range.

It also checks every row against music theory, written out again in the checker rather than taken from the build:

- every kind of chord is on all twelve roots;
- each row's symbol, kind and formula are the ones its name says;
- its keys are its formula on its root, the right number of semitones up and on the right letters;
- its root is the easier of its two names;
- its family is exactly the keys whose scale holds it.

The last run gave:

    204 rows: 17 kinds of chord on 12 roots; names, symbols, kinds, formulas, keys, roots and families checked
    204 sounds, 10.7 MB, 52 kB each on average
    length 3.79-4.63 s; loudness -18.8 to -17.4 LUFS (median -18.0); true peak at most -3.0 dBFS
    pitches: worst 5.1 cents from equal temperament
    all good

## Building it

    git clone https://github.com/lorien-danger/knack ../knack     # beside this repo, or say where with KNACK=
    (cd ../knack && npm install)
    cd build && npm install
    npx tsx build.ts          # about four minutes; writes columns.json, rows.jsonl, media/, build/notes.jsonl, build/piano.json
    npx tsx build.ts --rows   # the rows and columns only, in a second
    python3 check.py          # needs ffmpeg and numpy

The build needs ffmpeg, and a checkout of Knack that has the piano (`scripts/piano.ts`). The piano arrived with
[knack#34](https://github.com/lorien-danger/knack/pull/34); until that is merged, check out its branch, `keyboard`.
`build/piano.json` records the Knack commit and the hashes of the piano's samples and rules the sounds were made
with (`a592633`, the head of that branch). If the piano changes, build again so that the sounds still match the app.

The build has no randomness: building again from the same Knack gives the same rows and the same sounds.

## Licence

The rows, columns and the build and check scripts are dedicated to the public domain under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

The sounds in `media/` are recordings of the **Salamander Grand Piano V3** by Alexander Holm, licensed under
[Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/)
([source](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html)). They were cut, retuned, levelled and
mixed into chords by Knack's piano (see its `src/lib/piano/samples/LICENSE.md`). If you use the sounds, credit the
Salamander Grand Piano by Alexander Holm (CC-BY 3.0); `media/LICENSE.md` says the same next to them.
