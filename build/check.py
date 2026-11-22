"""Checks the dataset against music theory and its sounds against its rows, without using anything of build.ts but
the sounds it made and build/notes.jsonl (when each note was struck).

    python3 check.py            (needs ffmpeg and numpy)

The rows. Each row's name is read back into a root and a kind of chord, from the table below (written out again
here, not taken from the build). Then:
  - every kind of chord is on all twelve roots, once;
  - the symbol, kind and formula are the ones that name says;
  - the keys are the formula built on the root: each note the right number of semitones above the root, and spelled
    on the right letter (a third two letters above the root, a seventh six), lowest first, with the root at the bottom
    and between F♯3 and F4;
  - the root is the easier of the names its key has: the other name would not spell the chord with fewer or plainer
    sharps and flats;
  - the keys the chord belongs to are exactly the major keys whose scale has every note of it, and the minor keys
    whose natural or harmonic minor scale does.
The sounds. Each MP3 is decoded with ffmpeg and checked for
  - its length, against notes.jsonl, and its loudness (EBU R128) and true peak;
  - its pitches, each measured from its partials (pitch() below). Each note played in turn must be among the
    strongest new things in the spectrum when it is struck, within 12 cents of equal temperament (the piano is tuned
    to its own stretched curve, within about 7 cents of it in this range), with nothing strong an octave below.
    Played together, every note must stand out at its own pitch, measured from those of its partials that no other
    note shares, and no strong peak may be left that is not a partial of one of them.
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
ROOT = HERE.parent
RATE = 44100

LETTERS = 'CDEFGAB'
NATURAL = [0, 2, 4, 5, 7, 9, 11]
ACC = {'': 0, '♭': -1, '♭♭': -2, '♯': 1, '♯♯': 2}
# a degree: a number and its semitones above the root as a major scale (and its ninth) has them
MAJOR_SCALE = {1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14}

# name -> symbol, kind, formula
KINDS = {
    'major': ('', ['triad', 'major'], '1 3 5'),
    'minor': ('m', ['triad', 'minor'], '1 ♭3 5'),
    'diminished': ('°', ['triad', 'diminished'], '1 ♭3 ♭5'),
    'augmented': ('+', ['triad', 'augmented'], '1 3 ♯5'),
    'suspended second': ('sus2', ['suspended chord', 'suspended second'], '1 2 5'),
    'suspended fourth': ('sus4', ['suspended chord', 'suspended fourth'], '1 4 5'),
    'major sixth': ('6', ['added-note chord', 'major sixth'], '1 3 5 6'),
    'minor sixth': ('m6', ['added-note chord', 'minor sixth'], '1 ♭3 5 6'),
    'added ninth': ('add9', ['added-note chord', 'added ninth'], '1 3 5 9'),
    'dominant seventh': ('7', ['seventh chord', 'dominant seventh'], '1 3 5 ♭7'),
    'major seventh': ('maj7', ['seventh chord', 'major seventh'], '1 3 5 7'),
    'minor seventh': ('m7', ['seventh chord', 'minor seventh'], '1 ♭3 5 ♭7'),
    'half-diminished seventh': ('ø7', ['seventh chord', 'half-diminished seventh'], '1 ♭3 ♭5 ♭7'),
    'diminished seventh': ('°7', ['seventh chord', 'diminished seventh'], '1 ♭3 ♭5 ♭♭7'),
    'dominant ninth': ('9', ['ninth chord', 'dominant ninth'], '1 3 5 ♭7 9'),
    'major ninth': ('maj9', ['ninth chord', 'major ninth'], '1 3 5 7 9'),
    'minor ninth': ('m9', ['ninth chord', 'minor ninth'], '1 ♭3 5 ♭7 9'),
}
MAJOR_KEYS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
MINOR_KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B']
SCALES = {'major': [[0, 2, 4, 5, 7, 9, 11]], 'minor': [[0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 8, 11]]}


def note(s):
    """a note name with or without its octave: (letter index, accidentals, pitch class, key or None)"""
    m = re.fullmatch(r'([A-G])(♭♭|♭|♯♯|♯)?(\d)?', s)
    if not m:
        raise ValueError(f'not a note: {s}')
    letter, acc = LETTERS.index(m[1]), ACC[m[2] or '']
    key = 12 * (int(m[3]) + 1) + NATURAL[letter] + acc if m[3] else None
    return letter, acc, (NATURAL[letter] + acc) % 12, key


def degree(d):
    m = re.fullmatch(r'(♭♭|♭|♯)?(\d+)', d)
    return int(m[2]), MAJOR_SCALE[int(m[2])] + ACC[m[1] or '']


def spelled(letter, acc):
    return LETTERS[letter] + ('♯' * acc if acc > 0 else '♭' * -acc)


def spell(root_letter, root_pc, formula):
    out = []
    for d in formula.split():
        n, semis = degree(d)
        letter = (root_letter + n - 1) % 7
        acc = (root_pc + semis - NATURAL[letter]) % 12
        acc = acc - 12 if acc > 6 else acc
        out.append((letter, acc))
    return out


def awkward(notes):
    return sum((3 if abs(a) == 2 else abs(a)) + (spelled(l, a) in ('E♯', 'B♯', 'C♭', 'F♭')) for l, a in notes)


def check_rows(rows, columns, bad):
    names = {c['name'] for c in columns['columns']}
    for p in columns.get('practices', []):
        for c in p['columns']:
            if c not in names:
                bad.append(f'practice {p["name"]}: no column {c}')
    seen = set()
    for r in rows:
        rid = r['id']
        if set(r) - names - {'id'}:
            bad.append(f'{rid}: columns not in columns.json: {set(r) - names - {"id"}}')
        root_name, _, kind = r['name'].partition(' ')
        if kind not in KINDS:
            bad.append(f'{rid}: no kind of chord called {kind!r}')
            continue
        symbol, tree, formula = KINDS[kind]
        rl, ra, rpc, _ = note(root_name)
        seen.add((rpc, kind))
        if r['symbol'] != root_name + symbol:
            bad.append(f'{rid}: symbol {r["symbol"]}, should be {root_name + symbol}')
        if r['kind'] != tree:
            bad.append(f'{rid}: kind {r["kind"]}')
        if ' '.join(r['formula']) != formula:
            bad.append(f'{rid}: formula {r["formula"]}')
        if r['sound'] != f'media/{rid}.mp3' or not (ROOT / r['sound']).exists():
            bad.append(f'{rid}: no sound at {r["sound"]}')
        keys = [note(k) for k in r['keys']]
        root = note(r['root'])
        if root[:3] != (rl, ra, rpc) or root[3] is None or not 54 <= root[3] <= 65:
            bad.append(f'{rid}: root {r["root"]} is not {root_name} between F♯3 and F4')
        if len(keys) != len(formula.split()):
            bad.append(f'{rid}: {len(keys)} keys for {len(formula.split())} degrees')
            continue
        for (l, a, pc, k), d in zip(keys, formula.split()):
            n, semis = degree(d)
            if k - root[3] != semis:
                bad.append(f'{rid}: {spelled(l, a)} is {k - root[3]} semitones above the root, the {d} is {semis}')
            if (l - rl) % 7 != (n - 1) % 7:
                bad.append(f'{rid}: the {d} is spelled {spelled(l, a)}, on the wrong letter')
        if [k[3] for k in keys] != sorted(k[3] for k in keys) or keys[0][3] != root[3]:
            bad.append(f'{rid}: keys not from the root upwards')
        if not all(54 <= k[3] <= 79 for k in keys):
            bad.append(f'{rid}: keys outside F♯3 to G5')
        # the root's other name would not spell it more easily
        mine = awkward([(l, a) for l, a, _, _ in keys])
        for ol in range(7):
            for oa in (-1, 1):
                if (NATURAL[ol] + oa) % 12 == rpc and (ol, oa) != (rl, ra) and ra != 0:
                    other = awkward(spell(ol, rpc, formula))
                    if other < mine:
                        bad.append(f'{rid}: spelled from {spelled(ol, oa)} it would read more easily ({other} against {mine})')
        # its family
        pcs = {k[2] for k in keys}
        want = set()
        for mode, tonics in (('major', MAJOR_KEYS), ('minor', MINOR_KEYS)):
            for t in tonics:
                tpc = note(t)[2]
                if any(all((p - tpc) % 12 in sc for p in pcs) for sc in SCALES[mode]):
                    want.add(f'{t} {mode}')
        if set(r['family']) != want or len(r['family']) != len(want):
            bad.append(f'{rid}: in the keys of {sorted(r["family"])}, should be {sorted(want)}')
    if len(seen) != 12 * len(KINDS) or len(rows) != len(seen):
        bad.append(f'{len(rows)} rows, {len(seen)} different chords; should be {12 * len(KINDS)}, every kind on every root')
    if len({r['id'].lower() for r in rows}) != len(rows):
        bad.append('two ids differ only by case')


def decode(f):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', str(f), '-f', 's16le', '-ac', '1', '-ar', str(RATE), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def lufs(f):
    err = subprocess.run(['ffmpeg', '-nostats', '-i', str(f), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    summary = err[err.rfind('Summary:'):]
    return float(summary.split('I:')[1].split('LUFS')[0]), float(summary.split('Peak:')[1].split('dBFS')[0])


def spectrum(x, n=1 << 16):
    s = np.abs(np.fft.rfft(x * np.hanning(len(x)), n))
    return s, RATE / n


def peak_at(s, df, f, cents=40):
    """the strongest bin within `cents` of f, refined by a parabola: its frequency and height"""
    lo, hi = int(f * 2 ** (-cents / 1200) / df), int(f * 2 ** (cents / 1200) / df) + 1
    k = lo + int(np.argmax(s[lo:hi]))
    a, b, c = np.log(s[k - 1:k + 2] + 1e-12)
    d = 0.5 * (a - c) / (a - 2 * b + c) if a - 2 * b + c < 0 else 0.0
    return (k + d) * df, s[k]


def pitch(s, df, h, partials=(1, 2, 3, 4)):
    """a note's pitch near h, from its partials (the first four, or those given): each one's frequency over its
    number, weighed by how strong it is, counting only those at least a tenth as strong as the strongest. Piano notes
    low in this range have a weak fundamental (F♯3's is 25 dB under its second partial), which a short window reads
    badly; their second and third partials say the pitch better. Returns the pitch and the strongest partial's height."""
    found = [(k, *peak_at(s, df, k * h)) for k in partials]
    if not found:
        return 0.0, 0.0
    strongest = max(a for _, _, a in found)
    use = [(f / k, a) for k, f, a in found if a >= 0.1 * strongest]
    return sum(f * a for f, a in use) / sum(a for _, a in use), strongest


def cents(a, b):
    return 1200 * np.log2(a / b)


TOLERANCE = 12


def check_sound(r, n, bad, worst):
    x = decode(ROOT / 'media' / f'{r["id"]}.mp3')
    length = len(x) / RATE
    if abs(length - n['length']) > 0.06:
        bad.append(f'{r["id"]}: {length:.2f} s long, should be {n["length"]:.2f}')
    win = int(0.3 * RATE)
    # in turn: what is new in the spectrum when each note is struck
    for j, (t, h) in enumerate(zip(n['inTurn'], n['hz'])):
        a0 = int((t + 0.03) * RATE)
        s, df = spectrum(x[a0:a0 + win])
        if a0 - win > 0:
            before, _ = spectrum(x[a0 - win - int(0.03 * RATE):a0 - int(0.03 * RATE)])
            s = np.maximum(s - before, 0)
        f0, a = pitch(s, df, h)
        _, below = peak_at(s, df, h / 2)
        c = cents(f0, h)
        worst[0] = max(worst[0], abs(c))
        if abs(c) > TOLERANCE or below > 0.2 * a or a < 0.3 * s[5:].max():
            bad.append(f'{r["id"]}: note {j + 1} in turn should be {h} Hz, heard {f0:.1f} ({c:+.1f} cents)')
    # together
    a0 = int((n['together'] + 0.05) * RATE)
    s, df = spectrum(x[a0:a0 + int(1.2 * RATE)], 1 << 18)
    top = s.max()
    for h in n['hz']:
        # its partials that no other note of the chord has a partial near
        others = [g for g in n['hz'] if g != h]
        alone = [k for k in range(1, 5) if not any(abs(cents(k * h, g * max(1, round(k * h / g)))) < 30 for g in others)]
        got, a = pitch(s, df, h, alone)
        c = cents(got, h)
        worst[0] = max(worst[0], abs(c))
        if not alone or abs(c) > TOLERANCE or a < 0.03 * top:
            bad.append(f'{r["id"]}: together, {h} Hz heard at {got:.1f} ({c:+.1f} cents, {a / top:.2f} of the top)')
    for b in np.argsort(s)[::-1][:400]:
        if s[b] < 0.1 * top or b < 5:
            continue
        fb = b * df
        if not any(abs(cents(fb, h * max(1, round(fb / h)))) < 30 for h in n['hz']):
            bad.append(f'{r["id"]}: together, an unexplained peak at {fb:.1f} Hz')
            break
    return length


def main():
    columns = json.load(open(ROOT / 'columns.json'))
    rows = [json.loads(l) for l in open(ROOT / 'rows.jsonl')]
    notes = {n['id']: n for n in map(json.loads, open(HERE / 'notes.jsonl'))}
    bad = []
    check_rows(rows, columns, bad)
    print(f'{len(rows)} rows: {len(KINDS)} kinds of chord on 12 roots; names, symbols, kinds, formulas, keys, roots and families checked')
    lengths, louds, peaks, worst = [], [], [], [0.0]
    for r in rows:
        n = notes[r['id']]
        if [round(440 * 2 ** ((note(k)[3] - 69) / 12), 3) for k in r['keys']] != n['hz']:
            bad.append(f'{r["id"]}: notes.jsonl has other notes than the row')
        lengths.append(check_sound(r, n, bad, worst))
        i, p = lufs(ROOT / 'media' / f'{r["id"]}.mp3')
        louds.append(i); peaks.append(p)
    L, I, P = np.array(lengths), np.array(louds), np.array(peaks)
    if P.max() > -0.5:
        bad.append(f'a true peak of {P.max():.1f} dBFS')
    size = sum((ROOT / r['sound']).stat().st_size for r in rows)
    print(f'{len(rows)} sounds, {size / 1e6:.1f} MB, {size / len(rows) / 1e3:.0f} kB each on average')
    print(f'length {L.min():.2f}-{L.max():.2f} s; loudness {I.min():.1f} to {I.max():.1f} LUFS (median {np.median(I):.1f}); true peak at most {P.max():.1f} dBFS')
    print(f'pitches: worst {worst[0]:.1f} cents from equal temperament')
    for b in bad:
        print('  ' + b)
    print('all good' if not bad else f'{len(bad)} problems')
    sys.exit(1 if bad else 0)


main()
