"""Intelligibility check: transcribe each placed narration line with an
offline Whisper model (sherpa-onnx, small.en) from both the isolated
narration stem and the full mix, and compare with the script.

This is an automated proxy for listening, not a substitute for it.

Usage: python scripts/qa/asr_check.py [--model-dir /opt/tts/sherpa-onnx-whisper-small.en]
       python scripts/qa/asr_check.py --prefix Kavolt_ChaosCity_30s --report audio/city-audio-report.json --out audio/city-asr-check.json
"""
import argparse
import json
import re

import numpy as np
import sherpa_onnx
import soundfile as sf
from scipy.signal import resample_poly


def norm(s):
    s = re.sub(r"(?<=[a-z])\.(?=[a-z])", " dot ", s.lower()).replace("whatsapp", "whats app").replace("razor pay", "razorpay").replace("-", " ").replace(" 7", " seven")
    return re.sub(r"[^a-z0-9 ]", "", s).split()


def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    d = np.zeros((len(r) + 1, len(h) + 1), dtype=int)
    d[:, 0] = range(len(r) + 1)
    d[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(r), len(h)] / max(1, len(r))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default="/opt/tts/sherpa-onnx-whisper-small.en")
    ap.add_argument("--report", default="audio/audio-report.json")
    ap.add_argument("--prefix", default="Kavolt_Kavey_20s")
    ap.add_argument("--out", default="audio/asr-check.json")
    args = ap.parse_args()
    md = args.model_dir
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=f"{md}/small.en-encoder.int8.onnx",
        decoder=f"{md}/small.en-decoder.int8.onnx",
        tokens=f"{md}/small.en-tokens.txt",
        num_threads=4,
    )
    rep = json.load(open(args.report))
    out = []
    for src in [f"audio/{args.prefix}_Narration.wav", f"audio/{args.prefix}_Mix.wav"]:
        audio, sr = sf.read(src, dtype="float32")
        mono = audio.mean(axis=1)
        for line in rep["narration"]:
            a = int((line["start"] - 0.1) * sr)
            b = int((line["end"] + 0.15) * sr)
            seg = resample_poly(mono[a:b], 1, 3).astype(np.float32)  # 48k -> 16k
            st = rec.create_stream()
            st.accept_waveform(16000, seg)
            rec.decode_stream(st)
            hyp = st.result.text.strip()
            w = wer(line["text"], hyp)
            out.append({"source": src.split("/")[-1], "id": line["id"], "script": line["text"], "heard": hyp, "wer": round(w, 3)})
            print(f"{src.split('_')[-1]:15s} {line['id']}  WER={w:4.2f}  script='{line['text']}'  asr='{hyp}'")
    json.dump(out, open(args.out, "w"), indent=2)


if __name__ == "__main__":
    main()
