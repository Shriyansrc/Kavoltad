"""Scan WAV stems for clicks (isolated discontinuities), clipping and DC.

Method: second difference of each channel; a click is a spike more than 10x
the local second-difference RMS within +/-1.5 ms (excluding +/-2 samples) and
above -54 dBFS. Noise-based transients raise their whole neighbourhood, so
they are not flagged.

Every stem also gets a self-test: a -48 dBFS step at two places and a
-40 dBFS single-sample impulse are injected into a copy; the report says how
many of the three were found (sensitivity). Dense, noisy stems can mask such
small faults; that is why the SFX events are additionally audited one by one
at their source (scripts/audio/city/audit-run.ts).

  python scripts/qa/clicks.py audio/Kavolt_ChaosCity_30s_*.wav
"""
import json
import sys

import numpy as np
import soundfile as sf


def d2scan(x, sr, ratio=10.0, floor_db=-54.0, win_ms=1.5):
    win = int(win_ms / 1000 * sr)
    floor = 10 ** (floor_db / 20)
    d2 = np.abs(np.diff(x, 2))
    cs = np.concatenate([[0.0], np.cumsum(d2**2)])
    n = len(d2)
    idx = np.arange(n)
    lo, hi = np.clip(idx - win, 0, n), np.clip(idx + win + 1, 0, n)
    c0, c1 = np.clip(idx - 2, 0, n), np.clip(idx + 3, 0, n)
    local = np.sqrt((cs[hi] - cs[lo] - (cs[c1] - cs[c0])) / np.maximum((hi - lo) - (c1 - c0), 1))
    cand = np.where((d2 > floor) & (d2 > ratio * (local + 1e-9)))[0]
    hits, last = [], -(10**9)
    for i in cand:
        if i - last < sr * 0.005:
            continue
        last = i
        hits.append({"t": round((i + 1) / sr, 4), "ratio": round(float(d2[i] / (local[i] + 1e-12)), 1)})
    return hits


def scan(path):
    x, sr = sf.read(path, always_2d=True)
    res = {"file": path, "sr": sr, "clipped": int(np.sum(np.abs(x) >= 0.99999)), "dc": [float(np.mean(x[:, c])) for c in range(x.shape[1])], "clicks": []}
    for c in range(x.shape[1]):
        for h in d2scan(x[:, c], sr):
            res["clicks"].append({"ch": c, **h})
    res["click_count"] = len(res["clicks"])
    # self-test on the left channel
    y = x[:, 0].copy()
    marks = [0.31, 0.53, 0.77]
    ts = [m * len(y) / sr for m in marks]
    y[int(ts[0] * sr):] += 0.004
    y[int(ts[1] * sr):] -= 0.004
    y[int(ts[2] * sr)] += 0.01
    found = [t for t in ts if any(abs(h["t"] - t) < 0.002 for h in d2scan(y, sr))]
    res["self_test_found"] = f"{len(found)}/3"
    return res


if __name__ == "__main__":
    results = [scan(p) for p in sys.argv[1:]]
    for r in results:
        print(f"{r['file']}: clicks={r['click_count']} clipped={r['clipped']} dc={['%.1e' % d for d in r['dc']]} self-test={r['self_test_found']}")
        for c in r["clicks"][:25]:
            print("   ", c)
    json.dump(results, open("out/qa_clicks.json", "w"), indent=1)
