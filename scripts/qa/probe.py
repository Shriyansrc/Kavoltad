"""Verify the encoded master against the delivery spec using ffprobe.

  python scripts/qa/probe.py deliverables/Kavolt_Kavey_20s_Final.mp4
"""
import json
import subprocess
import sys


def ffprobe(path, *args):
    r = subprocess.run(["ffprobe", "-v", "error", *args, "-of", "json", path], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def main(path, frames=1200, seconds=20.0):
    info = ffprobe(path, "-show_streams", "-show_format", "-count_frames")
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    fmt = info["format"]
    # Fast start: moov atom must precede mdat.
    with open(path, "rb") as fh:
        head = fh.read(4 * 1024 * 1024)
    moov, mdat = head.find(b"moov"), head.find(b"mdat")
    checks = {
        "video codec h264": v["codec_name"] == "h264",
        "1080x1920": (v["width"], v["height"]) == (1080, 1920),
        "square pixels": v.get("sample_aspect_ratio", "1:1") in ("1:1", "0:1", None),
        "r_frame_rate 60/1": v["r_frame_rate"] == "60/1",
        "avg_frame_rate 60/1": v["avg_frame_rate"] == "60/1",
        f"{frames} decoded frames": int(v.get("nb_read_frames", 0)) == frames,
        f"video duration {seconds:.3f} s": abs(float(v.get("duration", 0)) - seconds) < 0.001,
        "pix_fmt yuv420p": v["pix_fmt"] == "yuv420p",
        "color_space bt709": v.get("color_space") == "bt709",
        "color_primaries bt709": v.get("color_primaries") == "bt709",
        "color_transfer bt709": v.get("color_transfer") == "bt709",
        "color_range tv": v.get("color_range") == "tv",
        "audio present": a is not None,
        "audio aac": a is not None and a["codec_name"] == "aac",
        "audio 48 kHz": a is not None and a["sample_rate"] == "48000",
        "audio stereo": a is not None and a["channels"] == 2,
        "audio ~256 kbps": a is not None and 220000 <= int(a.get("bit_rate", 0)) <= 290000,
        "fast start (moov before mdat)": moov != -1 and (mdat == -1 or moov < mdat),
    }
    summary = {
        "file": path,
        "size_bytes": int(fmt["size"]),
        "format_duration": float(fmt["duration"]),
        "video": {k: v.get(k) for k in ["codec_name", "profile", "width", "height", "pix_fmt", "r_frame_rate", "avg_frame_rate", "nb_read_frames", "duration", "bit_rate", "color_space", "color_primaries", "color_transfer", "color_range"]},
        "audio": {k: a.get(k) for k in ["codec_name", "profile", "sample_rate", "channels", "channel_layout", "bit_rate", "duration", "start_time"]} if a else None,
        "checks": checks,
        "all_passed": all(checks.values()),
    }
    print(json.dumps(summary, indent=2))
    return 0 if summary["all_passed"] else 1


if __name__ == "__main__":
    # python scripts/qa/probe.py FILE [FRAMES SECONDS]
    sys.exit(main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 1200, float(sys.argv[3]) if len(sys.argv) > 3 else 20.0))
