#!/usr/bin/env python3
"""The KTX2 plan (spec 0056 task 2, internal #156): the command line, the GPU arithmetic, and a run against a fake `ktx`."""
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import _ktx2  # noqa: E402

bad = []


def check(cond, msg):
    print(("  ok: " if cond else "  ** ") + msg)
    if not cond:
        bad.append(msg)


# the flags are the probe's, character for character (.github/workflows/textures.yml)
wf = (ROOT / ".github/workflows/textures.yml").read_text(encoding="utf-8")
cmd = " ".join(_ktx2.ktx_command(Path("a.png"), Path("a.ktx2"), "etc1s"))
check(cmd == "ktx create --format R8G8B8_SRGB --assign-tf srgb --encode basis-lz --qlevel 128 --generate-mipmap a.png a.ktx2",
      "ETC1S asks what the probe asked")
check("--encode basis-lz --qlevel 128 --generate-mipmap" in wf, "...and the workflow's probe still says the same")
check("--encode uastc --uastc-quality 2 --zstd 18" in " ".join(_ktx2.ktx_command(Path("a"), Path("b"), "uastc")), "UASTC asks what the probe asked")
try:
    _ktx2.ktx_command(Path("a"), Path("b"), "astc")
    check(False, "an unknown kind must be refused")
except ValueError:
    check(True, "an unknown kind is refused, not defaulted")
# 4096 x 2048 at 1 byte a pixel is 8 388 608 B; the whole chain adds a third
base = _ktx2.gpu_bytes(4096, 2048, mips=False)
check(base == 8388608, f"4096 x 2048 is 8 MiB of 4x4 blocks ({base})")
full = _ktx2.gpu_bytes(4096, 2048)
check(base * 4 // 3 <= full <= base * 4 // 3 + 4096, f"the mip chain adds about a third ({full})")
check(_ktx2.gpu_bytes(1, 1) == 16, "a 1 x 1 level still costs a block")

# the run, against a fake encoder that writes deterministic bytes
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    (tmp / "tex" / "4k").mkdir(parents=True)
    plan = [("a", "4k/a.webp", "etc1s", "R8G8B8_SRGB"), ("b", "4k/b.webp", "uastc", "R8G8B8_SRGB")]
    for _, rel, _, _ in plan:
        (tmp / "tex" / rel).write_bytes(b"x")
    calls = []

    def fake(args, check=False):
        calls.append(args)
        if args[1] == "create":
            Path(args[-1]).write_bytes(b"KTX2" + args[-2].encode())

    rows = _ktx2.encode_all(tmp / "tex", tmp / "out", lambda s, d: d.write_bytes(b"png"), run=fake, plan=plan)
    check([c[1] for c in calls] == ["create", "validate", "create", "validate"], "every file is encoded and then validated, in order")
    check([r["stem"] for r in rows] == ["a", "b"] and all(r["bytes"] > 4 for r in rows), "a row per map, with the bytes on disk")
    check(not list((tmp / "out").glob("*.png")), "the intermediate PNGs are removed")
    again = _ktx2.encode_all(tmp / "tex", tmp / "out", lambda s, d: d.write_bytes(b"png"), run=fake, plan=plan)
    check([r["sha256"] for r in rows] == [r["sha256"] for r in again], "two runs give the same digests")
check(all((ROOT / "site/textures" / rel).exists() for _, rel, _, _ in _ktx2.PLAN), "every map in the plan is a shipped 4k file")
sys.exit(1 if bad else 0)
