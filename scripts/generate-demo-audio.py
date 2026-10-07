"""Generate two original, instrumental demo loops without external audio assets."""
from array import array
from pathlib import Path
import math
import random
import sys
import wave

DEST = Path(__file__).resolve().parent.parent / "unseen-main" / "public" / "music"
RATE = 22050


def make_loop(name, bpm, root, seed):
    rng = random.Random(seed)
    beat_length = 60 / bpm
    duration = 32 * beat_length
    samples = array("h")
    bass_notes = [0, 0, 7, 3, 0, 10, 7, 3]
    melody_notes = [12, 15, 19, 22, 19, 15, 10, 7]
    for index in range(int(duration * RATE)):
        t = index / RATE
        beat = t / beat_length
        step = int(beat)
        within = (beat % 1) * beat_length
        bass = root * 2 ** (bass_notes[(step // 4) % 8] / 12)
        value = .19 * math.sin(2 * math.pi * bass * t) * math.exp(-within * 3)
        value += .035 * math.sin(2 * math.pi * bass * 2 * t) * math.exp(-within * 6)
        # Soft minor triad pad and a short pentatonic bell.
        for semitone in [12, 15, 19]:
            value += .035 * math.sin(2 * math.pi * root * 2 ** (semitone / 12) * t) * (.65 + .35 * math.sin(t * .8))
        melody = root * 2 ** (melody_notes[(int(beat * 2) + seed) % 8] / 12)
        half = (beat * 2 % 1) * beat_length / 2
        value += .07 * math.sin(2 * math.pi * melody * t) * math.exp(-half * 13)
        if step % 4 in (0, 2):
            phase = 2 * math.pi * (47 * within + 90 * (1 - math.exp(-within * 25)) / 25)
            value += .29 * math.sin(phase) * math.exp(-within * 19)
        noise = rng.uniform(-1, 1)
        if step % 4 in (1, 3):
            value += .09 * noise * math.exp(-within * 30)
        value += .026 * noise * math.exp(-half * 95)
        fade = min(1, t / .05, (duration - t) / .3)
        samples.append(int(math.tanh(value * 1.3) * .8 * 32767 * fade))
    if sys.byteorder != "little":
        samples.byteswap()
    with wave.open(str(DEST / name), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(samples.tobytes())


DEST.mkdir(parents=True, exist_ok=True)
make_loop("afterhours.wav", 96, 55, 7)
make_loop("neon-bloom.wav", 120, 65.406, 11)
print("Created afterhours.wav (20s) and neon-bloom.wav (16s).")
