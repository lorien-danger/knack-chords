/**
 * Builds the whole dataset from nothing but this file and the app's piano: columns.json, rows.jsonl, media/*.mp3 and
 * build/notes.jsonl (each row's keys and when each is struck, for check.py).
 *
 *     KNACK=<a checkout of lorien-danger/knack> npx tsx build.ts        (default: ../../knack beside this repo)
 *
 * The sounds are played by the app's own piano (Knack's scripts/piano.ts and src/lib/piano/: the Salamander Grand,
 * by the same rules as the keyboard in the app), so a chord heard here is the chord heard when its keys are tapped.
 * Nothing is random: building again gives the same files.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = import.meta.dirname;
const ROOT = join(HERE, '..');
const KNACK = resolve(process.env.KNACK ?? join(ROOT, '..', 'knack'));
if (!existsSync(join(KNACK, 'scripts', 'piano.ts'))) throw new Error(`No Knack with a piano at ${KNACK}: set KNACK to a checkout of lorien-danger/knack that has scripts/piano.ts`);
const piano = await import(pathToFileURL(join(KNACK, 'scripts', 'piano.ts')).href);
const { STOP } = await import(pathToFileURL(join(KNACK, 'src', 'lib', 'piano', 'render.ts')).href);
const RATE: number = piano.RATE;

// ---------------------------------------------------------------------------------------------------------------
// The music

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
/** a scale degree's semitones above the root, before its accidentals: 1 2 3 4 5 6 7, and 9 = 2 an octave up */
const DEGREE: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14 };
const ACC: Record<string, number> = { '': 0, '♭': -1, '♭♭': -2, '♯': 1, '♯♯': 2 };
const accidental = (n: number) => (n > 0 ? '♯'.repeat(n) : '♭'.repeat(-n));

interface Quality {
	/** in ids and file names */
	id: string;
	/** after the root in the full name: E♭ major seventh */
	name: string;
	/** after the root in the chord symbol: E♭maj7 */
	symbol: string;
	/** the kind tree: what sort of chord, then which */
	kind: [string, string];
	/** the notes above the root as scale degrees, written as knack-intervals writes its formulas */
	formula: string[];
}

const QUALITIES: Quality[] = [
	{ id: 'maj', name: 'major', symbol: '', kind: ['triad', 'major'], formula: ['1', '3', '5'] },
	{ id: 'm', name: 'minor', symbol: 'm', kind: ['triad', 'minor'], formula: ['1', '♭3', '5'] },
	{ id: 'dim', name: 'diminished', symbol: '°', kind: ['triad', 'diminished'], formula: ['1', '♭3', '♭5'] },
	{ id: 'aug', name: 'augmented', symbol: '+', kind: ['triad', 'augmented'], formula: ['1', '3', '♯5'] },
	{ id: 'sus2', name: 'suspended second', symbol: 'sus2', kind: ['suspended chord', 'suspended second'], formula: ['1', '2', '5'] },
	{ id: 'sus4', name: 'suspended fourth', symbol: 'sus4', kind: ['suspended chord', 'suspended fourth'], formula: ['1', '4', '5'] },
	{ id: '6', name: 'major sixth', symbol: '6', kind: ['added-note chord', 'major sixth'], formula: ['1', '3', '5', '6'] },
	{ id: 'm6', name: 'minor sixth', symbol: 'm6', kind: ['added-note chord', 'minor sixth'], formula: ['1', '♭3', '5', '6'] },
	{ id: 'add9', name: 'added ninth', symbol: 'add9', kind: ['added-note chord', 'added ninth'], formula: ['1', '3', '5', '9'] },
	{ id: '7', name: 'dominant seventh', symbol: '7', kind: ['seventh chord', 'dominant seventh'], formula: ['1', '3', '5', '♭7'] },
	{ id: 'maj7', name: 'major seventh', symbol: 'maj7', kind: ['seventh chord', 'major seventh'], formula: ['1', '3', '5', '7'] },
	{ id: 'm7', name: 'minor seventh', symbol: 'm7', kind: ['seventh chord', 'minor seventh'], formula: ['1', '♭3', '5', '♭7'] },
	{ id: 'm7b5', name: 'half-diminished seventh', symbol: 'ø7', kind: ['seventh chord', 'half-diminished seventh'], formula: ['1', '♭3', '♭5', '♭7'] },
	{ id: 'dim7', name: 'diminished seventh', symbol: '°7', kind: ['seventh chord', 'diminished seventh'], formula: ['1', '♭3', '♭5', '♭♭7'] },
	{ id: '9', name: 'dominant ninth', symbol: '9', kind: ['ninth chord', 'dominant ninth'], formula: ['1', '3', '5', '♭7', '9'] },
	{ id: 'maj9', name: 'major ninth', symbol: 'maj9', kind: ['ninth chord', 'major ninth'], formula: ['1', '3', '5', '7', '9'] },
	{ id: 'm9', name: 'minor ninth', symbol: 'm9', kind: ['ninth chord', 'minor ninth'], formula: ['1', '♭3', '5', '♭7', '9'] },
];

/** a degree as [its number, its semitones above the root] */
function degree(d: string): [number, number] {
	const m = /^(♭♭|♭|♯♯|♯)?(\d+)$/u.exec(d);
	if (!m || !(Number(m[2]) in DEGREE)) throw new Error(`Not a degree: ${d}`);
	return [Number(m[2]), DEGREE[Number(m[2])] + ACC[m[1] ?? '']];
}

/** a spelled note: its letter (0 = C .. 6 = B) and accidentals (−2 to 2) */
interface Spelled { letter: number; acc: number }
const nameOf = (s: Spelled) => LETTERS[s.letter] + accidental(s.acc);
const pcOf = (s: Spelled) => (((NATURAL[s.letter] + s.acc) % 12) + 12) % 12;

/** the two ways a key between the white keys can be named; one way for a white key */
function rootNames(pc: number): Spelled[] {
	const out: Spelled[] = [];
	for (let l = 0; l < 7; l++) for (const acc of [0, 1, -1]) if ((((NATURAL[l] + acc) % 12) + 12) % 12 === pc) out.push({ letter: l, acc });
	return out.some((s) => s.acc === 0) ? out.filter((s) => s.acc === 0) : out;
}

/** a chord's notes spelled from a root: each degree on its own letter (a third on the letter two above), with the
 * accidentals its semitones need */
function spell(root: Spelled, q: Quality): Spelled[] {
	return q.formula.map((d) => {
		const [n, semis] = degree(d);
		const letter = (root.letter + n - 1) % 7;
		let acc = (pcOf(root) + semis - NATURAL[letter]) % 12;
		if (acc > 6) acc -= 12;
		if (acc < -6) acc += 12;
		return { letter, acc };
	});
}

/** how awkward a spelling is to read: a sharp or flat 1, a double 3, and a sharp or flat on a white key's
 * neighbour (E♯, B♯, C♭, F♭) 1 more */
function awkwardness(notes: Spelled[]) {
	let a = 0;
	for (const s of notes) {
		a += Math.abs(s.acc) === 2 ? 3 : Math.abs(s.acc);
		if (['E♯', 'B♯', 'C♭', 'F♭'].includes(nameOf(s))) a += 1;
	}
	return a;
}

/** where neither way of naming the root reads more easily, the usual name of that key: D♭ E♭ F♯ A♭ B♭ */
const USUAL: Record<number, string> = { 1: 'D♭', 3: 'E♭', 6: 'F♯', 8: 'A♭', 10: 'B♭' };

/** the root's name and the chord's notes, spelled as a musician would: of the two names for a black key, the one
 * whose chord reads with fewer and plainer sharps and flats (C♯ minor, not D♭ minor with its F♭). Where the two read
 * as easily, a chord with a minor third is named as its minor triad is (G♯ minor sixth, as G♯ minor), and any other
 * by the key's usual name. */
function chordOf(pc: number, q: Quality): { root: Spelled; notes: Spelled[] } {
	const minor = QUALITIES.find((x) => x.id === 'm')!;
	const usual = q.formula.includes('♭3') && q !== minor ? nameOf(chordOf(pc, minor).root) : USUAL[pc];
	const ways = rootNames(pc).map((root) => ({ root, notes: spell(root, q) }));
	ways.sort((a, b) => awkwardness(a.notes) - awkwardness(b.notes) || (nameOf(a.root) === usual ? -1 : nameOf(b.root) === usual ? 1 : 0));
	return ways[0];
}

/** the key a chord is voiced from: its root within half an octave of middle C, F♯3 to F4, so that every chord is
 * drawn and heard around middle C, root at the bottom, and the whole column fits one keyboard of F♯3 to G5 */
const LOWEST_ROOT = 54; // F♯3
const rootKey = (pc: number) => LOWEST_ROOT + ((((pc - LOWEST_ROOT) % 12) + 12) % 12);
/** a spelled note at a key, with its octave (B♯3 is the key of C4) */
function withOctave(s: Spelled, key: number) {
	const octave = (key - NATURAL[s.letter] - s.acc) / 12 - 1;
	if (!Number.isInteger(octave)) throw new Error(`${nameOf(s)} is not key ${key}`);
	return nameOf(s) + octave;
}

// keys: the twelve major and twelve minor keys, named as they usually are, and their scales
const MAJOR_KEYS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MINOR_KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
const inScale = (pcs: number[], tonic: number, scale: number[]) => pcs.every((p) => scale.includes((((p - tonic) % 12) + 12) % 12));
const pcOfName = (n: string) => pcOf({ letter: LETTERS.indexOf(n[0]), acc: ACC[n.slice(1)] });

/** the keys a chord belongs to: every note of it in the key's scale (a minor key's natural or harmonic minor scale),
 * listed major keys first, each by how far the chord's root is above the key's tonic (so I, then II, ...) */
function familyOf(rootPc: number, pcs: number[]) {
	const above = (tonic: number) => (((rootPc - tonic) % 12) + 12) % 12;
	const major = MAJOR_KEYS.map((k) => ({ k, t: pcOfName(k) })).filter((x) => inScale(pcs, x.t, MAJOR_SCALE));
	const minor = MINOR_KEYS.map((k) => ({ k, t: pcOfName(k) })).filter((x) => inScale(pcs, x.t, NATURAL_MINOR) || inScale(pcs, x.t, HARMONIC_MINOR));
	major.sort((a, b) => above(a.t) - above(b.t));
	minor.sort((a, b) => above(a.t) - above(b.t));
	return [...major.map((x) => `${x.k} major`), ...minor.map((x) => `${x.k} minor`)];
}

/** a name in ids and file names: lower case, ♯ as s and ♭ as b (cs, eb) */
const idOf = (s: Spelled) => LETTERS[s.letter].toLowerCase() + (s.acc > 0 ? 's'.repeat(s.acc) : 'b'.repeat(-s.acc));

// ---------------------------------------------------------------------------------------------------------------
// Rows

interface Built { row: Record<string, unknown>; keys: number[] }
const built: Built[] = [];
for (const q of QUALITIES) {
	for (let pc = 0; pc < 12; pc++) {
		const { root, notes } = chordOf(pc, q);
		const r = rootKey(pc);
		const keys = q.formula.map((d) => r + degree(d)[1]);
		const id = `${idOf(root)}-${q.id}`;
		built.push({
			keys,
			row: {
				id,
				name: `${nameOf(root)} ${q.name}`,
				symbol: nameOf(root) + q.symbol,
				keys: notes.map((s, k) => withOctave(s, keys[k])),
				sound: `media/${id}.mp3`,
				root: withOctave(root, r),
				kind: q.kind,
				formula: q.formula,
				family: familyOf(pc, [...new Set(keys.map((k) => k % 12))]),
			},
		});
	}
}
if (new Set(built.map((b) => String(b.row.id).toLowerCase())).size !== built.length) throw new Error('Two rows with one id');

const columns = {
	name: 'Chords',
	item: 'chord',
	items: 'chords',
	title: 'name',
	practices: [
		{ name: 'Name and keys', columns: ['name', 'keys'] },
		{ name: 'Symbol and keys', columns: ['symbol', 'keys'] },
		{ name: 'Hear it, name it', columns: ['sound', 'name'] },
		{ name: 'What kind of chord?', columns: ['keys', 'kind'] },
	],
	columns: [
		{ name: 'name', type: 'plain', label: 'Name' },
		{ name: 'symbol', type: 'plain', label: 'Symbol' },
		{ name: 'keys', type: 'notes', octave: false, label: 'Keys' },
		{ name: 'sound', type: 'plain', media: 'audio', label: 'Sound' },
		{ name: 'root', type: 'notes', octave: false, label: 'Root' },
		{ name: 'kind', type: 'tree', label: 'Kind' },
		{ name: 'formula', type: 'parts', label: 'Notes above the root' },
		{ name: 'family', type: 'parts', label: 'In the keys of' },
	],
};

// ---------------------------------------------------------------------------------------------------------------
// Sounds: the notes one at a time, rising, as the app's "One at a time" plays them, then all of them together, as the
// app plays a chord when it is shown. Striking the keys again for the chord fades what still rings of them over
// STOP, as it does in the app.

/** when the chord is struck: after the last note in turn, a little longer than the gap between them */
const PAUSE = 0.75;
/** how long the chord rings before the end (the last 0.3 s faded out, as scripts/piano.ts cuts a sound short) */
const HOLD = 2.2;

function sound(keys: number[]) {
	const sorted = [...keys].sort((a, b) => a - b);
	const turn: Float32Array[] = piano.render(sorted, { inTurn: true });
	const together: Float32Array[] = piano.render(sorted, { length: HOLD });
	const gap = 0.42;
	const at = Math.round(((sorted.length - 1) * gap + PAUSE) * RATE);
	const stop = Math.round(STOP * RATE);
	const n = at + together[0].length;
	const out = [new Float32Array(n), new Float32Array(n)];
	for (let c = 0; c < 2; c++) {
		for (let i = 0; i < Math.min(at + stop, turn[c].length); i++) {
			const g = i < at ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (i - at)) / stop);
			out[c][i] += turn[c][i] * g;
		}
		for (let i = 0; i < together[c].length; i++) out[c][at + i] += together[c][i];
	}
	return { out, struck: [...sorted.map((_, k) => k * gap), at / RATE] };
}

/** `--rows`: the rows and columns only, without making the sounds again */
const ROWS_ONLY = process.argv.includes('--rows');
const media = join(ROOT, 'media');
const notes: string[] = [];
let done = 0;
if (!ROWS_ONLY) { rmSync(media, { recursive: true, force: true }); mkdirSync(media); }
for (const b of ROWS_ONLY ? [] : built) {
	const { out, struck } = sound(b.keys);
	piano.write(join(media, `${b.row.id}.mp3`), out);
	const hz = b.keys.map((k) => +(440 * 2 ** ((k - 69) / 12)).toFixed(3));
	notes.push(JSON.stringify({ id: b.row.id, keys: b.keys, hz, inTurn: struck.slice(0, -1).map((t) => +t.toFixed(4)), together: +struck.at(-1)!.toFixed(4), length: +(out[0].length / RATE).toFixed(4) }));
	if (++done % 34 === 0) console.log(`${done} of ${built.length} sounds`);
}

writeFileSync(join(ROOT, 'columns.json'), JSON.stringify(columns, null, 1) + '\n');
writeFileSync(join(ROOT, 'rows.jsonl'), built.map((b) => JSON.stringify(b.row)).join('\n') + '\n');
if (!ROWS_ONLY) writeFileSync(join(HERE, 'notes.jsonl'), notes.join('\n') + '\n');

// what the sounds were made with, so that a rebuild can be told apart from a changed piano
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
const samples = join(KNACK, 'src', 'lib', 'piano', 'samples');
let commit = 'unknown';
try { commit = execFileSync('git', ['-C', KNACK, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* not a git checkout */ }
writeFileSync(join(HERE, 'piano.json'), JSON.stringify({
	knack: commit,
	'render.ts': sha(join(KNACK, 'src', 'lib', 'piano', 'render.ts')),
	'samples.json': sha(join(KNACK, 'src', 'lib', 'piano', 'samples.json')),
	samples: createHash('sha256').update(readdirSync(samples).filter((f) => f.endsWith('.mp3')).sort().map((f) => sha(join(samples, f))).join()).digest('hex').slice(0, 16),
}, null, 1) + '\n');
console.log(`${built.length} rows, ${QUALITIES.length} kinds of chord on 12 roots`);
