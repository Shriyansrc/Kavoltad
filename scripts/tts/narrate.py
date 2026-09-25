"""Generate the eight narration lines with a local neural TTS voice.

Engine: Kokoro-82M (Apache-2.0) via kokoro-onnx, running fully offline from
model files downloaded once from the kokoro-onnx GitHub release. The voice is
a stock synthetic voice, not an imitation of any real person.

Lines are rendered separately at natural speed (speed = 1.0), trimmed of
silence, and written as 24 kHz mono WAVs plus a JSON report. They are placed
into their recording windows by scripts/audio/mix.ts. If a line overruns its
window the script reports it; it never time-compresses speech.

Usage:
  python scripts/tts/narrate.py --model /opt/tts/kokoro-v1.0.onnx \
      --voices /opt/tts/voices-v1.0.bin --voice af_heart --out audio-src/narration
"""

import argparse
import json
import os

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

# Exact lines and windows (seconds) from plan section 7 / src/config/copy.ts.
LINES = [
    ("l1", "Booking chaos?", 0.15, 1.40),
    ("l2", "Kavolt. Live in seven days.", 2.60, 4.65),
    ("l3", "Start on WhatsApp.", 5.15, 6.70),
    ("l4", "Payments connected. Reminders automated.", 7.15, 9.65),
    ("l5", "Review on your phone.", 10.15, 11.70),
    ("l6", "Your code. Your keys.", 12.15, 13.70),
    ("l7", "Shipped. Not mocked up.", 14.20, 15.70),
    ("l8", "Ready to ship? Check the website.", 17.20, 19.55),
]

# Provisional brand pronunciation from the plan: a neutral "kuh-volt".
PRONUNCIATION = {
    "kˈævoʊlt": "kəvˈoʊlt",
}


def trim(audio, sr, threshold_db=-42.0, pad_ms=12):
    """Trim leading/trailing silence using a short-window RMS gate."""
    win = int(sr * 0.005)
    thr = 10 ** (threshold_db / 20)
    frames = len(audio) // win
    rms = np.array([np.sqrt(np.mean(audio[i * win:(i + 1) * win] ** 2)) for i in range(frames)])
    idx = np.where(rms > thr)[0]
    if len(idx) == 0:
        return audio
    pad = int(sr * pad_ms / 1000)
    start = max(0, idx[0] * win - pad)
    end = min(len(audio), (idx[-1] + 1) * win + pad)
    out = audio[start:end].copy()
    fade = int(sr * 0.004)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="/opt/tts/kokoro-v1.0.onnx")
    ap.add_argument("--voices", default="/opt/tts/voices-v1.0.bin")
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--out", default="audio-src/narration")
    ap.add_argument("--lines", default=None, help="JSON list of {id,text,start,end}; defaults to the 20 s film")
    args = ap.parse_args()
    lines = [(lid, text, start, end, None, None) for lid, text, start, end in LINES]
    if args.lines:
        # Each line may override the voice and speed (e.g. shop owners vs narrator).
        lines = [(d["id"], d["text"], d.get("start", 0), d.get("end", 99), d.get("voice"), d.get("speed")) for d in json.load(open(args.lines))]

    os.makedirs(args.out, exist_ok=True)
    k = Kokoro(args.model, args.voices)
    report = {"engine": "kokoro-onnx (Kokoro-82M)", "voice": args.voice, "speed": args.speed, "lines": []}
    for lid, text, start, end, voice, speed in lines:
        voice = voice or args.voice
        speed = speed or args.speed
        lang = "en-gb" if voice.startswith("b") else "en-us"
        ph = k.tokenizer.phonemize(text, lang)
        for a, b in PRONUNCIATION.items():
            ph = ph.replace(a, b)
        audio, sr = k.create(ph, voice=voice, speed=speed, lang=lang, is_phonemes=True)
        audio = trim(np.asarray(audio, dtype=np.float32), sr)
        path = os.path.join(args.out, f"{lid}.wav")
        sf.write(path, audio, sr, subtype="FLOAT")
        dur = len(audio) / sr
        window = end - start
        report["lines"].append(
            {"id": lid, "text": text, "voice": voice, "speed": speed, "phonemes": ph, "window": [start, end], "duration": round(dur, 3), "fits": dur <= window + 1e-6, "sr": sr, "file": path}
        )
        print(f"{lid} {dur:5.2f}s / window {window:4.2f}s {'OK ' if dur <= window else 'OVER'}  {text}")
    with open(os.path.join(args.out, "report.json"), "w") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
