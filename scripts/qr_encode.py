"""A QR code, as a grid of modules, for the paper models' sheets (forge #161).

Contract: qr_matrix(text, mask=None) -> list[list[bool]]  (True = dark; a square of 21 + 4 (version - 1) modules, no quiet zone)
          version_for(n_bytes) -> int          the smallest version 1..6 that holds n bytes at level M
          rs_remainder(data, n) -> list[int]    Reed-Solomon error-correction codewords (GF(256), polynomial 0x11D)
          format_bits(mask) -> int              the 15 format bits for level M and that mask
          penalty(grid) -> int                  ISO/IEC 18004 section 7.8.3's four rules

WHY HERE AND NOT A LIBRARY. Every sheet carries a code that opens its world in the app, and the brief installs
nothing: no qrcode, no segno. The sheets need one kind of code only -- a short web address, byte mode, error
correction level M (15 % of the codewords may be lost to a crease or a smudge) -- so this is ISO/IEC 18004:2015 for
versions 1 to 6 (up to 106 bytes), and nothing more: no numeric or kanji mode, no version-information block (it is
only on version 7 and up), no structured append. A longer text is refused, not truncated.

HOW IT IS CHECKED. tests/test_paper_models.py holds this against the published example of ISO/IEC 18004 Annex I
("01234567" at level M: its data and error-correction codewords), against the format-bit table of Annex C (all
eight masks at level M), and, on a Mac, decodes the codes the sheets print with the system's own CoreImage QR
reader (CIDetector), so a wrong module anywhere is a failure there, not a phone that will not scan in a classroom.
"""

from __future__ import annotations

# Level M, versions 1..6: (error-correction codewords per block, [data codewords of each block]).
# ISO/IEC 18004:2015 Table 9.
EC_M = {1: (10, [16]), 2: (16, [28]), 3: (26, [44]), 4: (18, [32, 32]), 5: (24, [43, 43]), 6: (16, [27, 27, 27, 27])}
# The second coordinate of the alignment pattern's centre (the first is always 6); Annex E. Version 1 has none.
ALIGN = {2: 18, 3: 22, 4: 26, 5: 30, 6: 34}
# Bits left over after the last codeword: Table 1.
REMAINDER = {1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7}


def version_for(n_bytes: int) -> int:
    """Byte mode needs 4 mode bits, 8 count bits (versions 1..9) and 8 per byte."""
    for v, (_, blocks) in EC_M.items():
        if 4 + 8 + 8 * n_bytes <= 8 * sum(blocks):
            return v
    raise ValueError(f"qr_encode: {n_bytes} bytes is more than version 6 at level M holds (106)")


# --- GF(256) and Reed-Solomon ---------------------------------------------------------------------------------
EXP = [0] * 512
LOG = [0] * 256
_x = 1
for _i in range(255):
    EXP[_i] = _x
    LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D
for _i in range(255, 512):
    EXP[_i] = EXP[_i - 255]


def gf_mul(a: int, b: int) -> int:
    return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]


def rs_generator(n: int) -> list[int]:
    """The generator polynomial (x - a^0)(x - a^1)...(x - a^(n-1)), highest power first, leading 1 included."""
    g = [1]
    for i in range(n):
        nxt = [0] * (len(g) + 1)
        for j, c in enumerate(g):
            nxt[j] ^= c
            nxt[j + 1] ^= gf_mul(c, EXP[i])
        g = nxt
    return g


def rs_remainder(data: list[int], n: int) -> list[int]:
    """The n error-correction codewords of one block: data * x^n mod the generator."""
    g = rs_generator(n)
    rem = list(data) + [0] * n
    for i in range(len(data)):
        c = rem[i]
        if c:
            for j in range(1, len(g)):
                rem[i + j] ^= gf_mul(g[j], c)
    return rem[len(data):]


# --- the codewords -------------------------------------------------------------------------------------------

def data_codewords(payload: bytes, version: int) -> list[int]:
    """Mode, count, the bytes, the terminator, then the pad bytes 0xEC 0x11 up to the version's data capacity."""
    cap = 8 * sum(EC_M[version][1])
    bits = [0, 1, 0, 0] + [(len(payload) >> i) & 1 for i in range(7, -1, -1)]
    for b in payload:
        bits += [(b >> i) & 1 for i in range(7, -1, -1)]
    bits += [0] * min(4, cap - len(bits))
    bits += [0] * (-len(bits) % 8)
    words = [int("".join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    pad = [0xEC, 0x11]
    while len(words) < cap // 8:
        words.append(pad[(len(words) - len(bits) // 8) % 2])
    return words


def interleave(words: list[int], version: int) -> list[int]:
    """Split into blocks, add each block's error correction, and interleave column by column (section 7.6)."""
    n_ec, sizes = EC_M[version]
    blocks, at = [], 0
    for s in sizes:
        blocks.append(words[at:at + s])
        at += s
    ecs = [rs_remainder(b, n_ec) for b in blocks]
    out = []
    for i in range(max(sizes)):
        out += [b[i] for b in blocks if i < len(b)]
    for i in range(n_ec):
        out += [e[i] for e in ecs]
    return out


# --- the grid ------------------------------------------------------------------------------------------------

def format_bits(mask: int) -> int:
    """Level M is 00; five bits, a BCH(15,5) remainder with generator 0x537, XOR 0x5412 (Annex C)."""
    data = (0 << 3) | mask
    rem = data
    for _ in range(10):
        rem = (rem << 1) ^ ((rem >> 9) * 0x537)
    return ((data << 10) | rem) ^ 0x5412


MASKS = [
    lambda r, c: (r + c) % 2 == 0,
    lambda r, c: r % 2 == 0,
    lambda r, c: c % 3 == 0,
    lambda r, c: (r + c) % 3 == 0,
    lambda r, c: (r // 2 + c // 3) % 2 == 0,
    lambda r, c: (r * c) % 2 + (r * c) % 3 == 0,
    lambda r, c: ((r * c) % 2 + (r * c) % 3) % 2 == 0,
    lambda r, c: ((r + c) % 2 + (r * c) % 3) % 2 == 0,
]


def _function_grid(version: int) -> tuple[list[list[bool]], list[list[bool]]]:
    """(modules, is_function): the finders, separators, timing, alignment, the dark module and the reserved format areas."""
    n = 17 + 4 * version
    m = [[False] * n for _ in range(n)]
    f = [[False] * n for _ in range(n)]

    def put(r: int, c: int, dark: bool) -> None:
        m[r][c] = dark
        f[r][c] = True

    for cr, cc in ((3, 3), (3, n - 4), (n - 4, 3)):
        for dr in range(-4, 5):
            for dc in range(-4, 5):
                r, c = cr + dr, cc + dc
                if 0 <= r < n and 0 <= c < n:
                    d = max(abs(dr), abs(dc))
                    put(r, c, d not in (2, 4))
    for i in range(8, n - 8):
        put(6, i, i % 2 == 0)
        put(i, 6, i % 2 == 0)
    if version in ALIGN:
        a = ALIGN[version]
        for dr in range(-2, 3):
            for dc in range(-2, 3):
                put(a + dr, a + dc, max(abs(dr), abs(dc)) != 1)
    for i in range(9):
        f[8][i] = f[i][8] = True
    for i in range(8):
        f[8][n - 1 - i] = f[n - 1 - i][8] = True
    put(n - 8, 8, True)
    return m, f


def _place(m: list[list[bool]], f: list[list[bool]], words: list[int], version: int) -> None:
    """The zigzag: two-module columns from the right, up then down, skipping the vertical timing column."""
    n = len(m)
    bits = [(w >> i) & 1 for w in words for i in range(7, -1, -1)] + [0] * REMAINDER[version]
    k = 0
    right = n - 1
    while right >= 1:
        if right == 6:
            right = 5
        upward = ((right + 1) & 2) == 0
        for vert in range(n):
            r = n - 1 - vert if upward else vert
            for j in (0, 1):
                c = right - j
                if not f[r][c] and k < len(bits):
                    m[r][c] = bool(bits[k])
                    k += 1
        right -= 2


def _draw_format(m: list[list[bool]], mask: int) -> None:
    n = len(m)
    bits = format_bits(mask)
    bit = lambda i: bool((bits >> i) & 1)  # noqa: E731
    for i in range(6):
        m[i][8] = bit(i)
    m[7][8] = bit(6)
    m[8][8] = bit(7)
    m[8][7] = bit(8)
    for i in range(9, 15):
        m[8][14 - i] = bit(i)
    for i in range(8):
        m[8][n - 1 - i] = bit(i)
    for i in range(8, 15):
        m[n - 15 + i][8] = bit(i)
    m[n - 8][8] = True


def penalty(g: list[list[bool]]) -> int:
    """Rule 1: runs of five or more (3 + the excess); rule 2: 2 x 2 blocks (3 each); rule 3: the finder-like
    1:1:3:1:1 with four light modules on a side (40 each); rule 4: 10 for every 5 % the dark share is from half."""
    n = len(g)
    score = 0
    lines = [row for row in g] + [[g[r][c] for r in range(n)] for c in range(n)]
    pat_a = [True, False, True, True, True, False, True, False, False, False, False]
    pat_b = pat_a[::-1]
    for line in lines:
        run = 1
        for i in range(1, n):
            if line[i] == line[i - 1]:
                run += 1
            else:
                if run >= 5:
                    score += 3 + run - 5
                run = 1
        if run >= 5:
            score += 3 + run - 5
        for i in range(n - 10):
            seg = line[i:i + 11]
            if seg == pat_a or seg == pat_b:
                score += 40
    for r in range(n - 1):
        for c in range(n - 1):
            if g[r][c] == g[r][c + 1] == g[r + 1][c] == g[r + 1][c + 1]:
                score += 3
    dark = sum(map(sum, g))
    score += 10 * (abs(dark * 20 - n * n * 10) // (n * n))
    return score


def qr_matrix(text: str, mask: int | None = None) -> list[list[bool]]:
    """The code for `text` (UTF-8), at level M, in the smallest version that holds it, with the best of eight masks
    (or the one `mask` names: the test reads every mask back)."""
    payload = text.encode("utf-8")
    version = version_for(len(payload))
    words = interleave(data_codewords(payload, version), version)
    best, best_score = None, None
    for mask in (range(8) if mask is None else [mask]):
        m, f = _function_grid(version)
        _place(m, f, words, version)
        for r in range(len(m)):
            for c in range(len(m)):
                if not f[r][c] and MASKS[mask](r, c):
                    m[r][c] = not m[r][c]
        _draw_format(m, mask)
        s = penalty(m)
        if best_score is None or s < best_score:
            best, best_score = m, s
    return best
