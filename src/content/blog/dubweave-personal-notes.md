---
title: Dubweave, for Aline
excerpt: A personal and technical deep dive into dubweave for my wife, explained simply and shaped by the way I work.
publishDate: 'May 25 2026'
tags:
  - Dubweave
  - Audio
  - Dubbing
  - Personal
  - Autism
seo:
  pageType: article
  title: Dubweave, for Aline
  description: A warm, simple technical deep dive into dubweave, the fully local dubbing pipeline I built for my wife.
---
I built dubweave for my wife, Aline. She speaks Portuguese, and I kept finding these videos (essays, documentaries, interviews) that I wanted to show her. Subtitles help, yeah, but it's not the same. When you dub something, you can both just... listen. You sit together and watch without the reading part happening in your head.

So I built this for that. To not send our videos to some company's server. To keep it mine. And as I built it, it got complicated in the ways that feel honest to me, because I like (and obviously prefer) systems I can understand and trust.

If I had to explain what dubweave actually does, I'd say it's like a workshop. Not a fancy one. Just a series of stations where each person passes the work to the next person: just clear handoffs.

## The workshop tour, step by step

### Station 1: Get the video

If you give it a local file, it converts to mp4 and pulls out the audio. If you give it a video link, yt-dlp tries a few different ways to download it. Sometimes it is fast, sometimes it falls back. The pipeline has a bunch of ways to keep trying. It rotates client profiles. It uses your cookies if you have them. If all else fails, it just extracts the audio from the video file itself. The point is not to be clever about it. The point is to keep working.

### Station 2: Listen and mark the time

Whisper does two things: First it listens and figures out what language the audio is. Then it transcribes what it hears and marks down the exact time each word starts and stops. That timing is everything — it's the skeleton. If I don't respect it, the dubbed voice will start moving around and the speaker's mouth won't match. So I keep that timing sacred.

### Station 3: Glue the pieces together

Whisper chops up speech into tiny bits. A lot of tiny bits.

But translation works better on whole thoughts, not fragments. So I have a few simple rules: do not make utterances too short, do not make them too long, if there is a big gap in the audio maybe split there, if there is punctuation maybe stop there. I keep track of which original fragments I combined, so later I can spread the translation back across the original timing. This is not just tidying up. This is the difference between a translation that sounds natural and one that sounds broken.

### Station 4: Translate, then fix it

If you have an API key, translation goes through Gemini. I break it into chunks, number them, and give it a bit of context from previous translations so pronouns and tone stay consistent. If the API fails or you don't have a key, it falls back to a local model instead. Either way, the translation runs through a PT-BR fixer afterward.

Most systems either guess at these rules or bury them. I keep 36 explicit regex rules in code and in a JSON file so I can edit them without redeploying:

```python
_PTPT_TO_PTBR = [
    (r"\btu\b", "você"), 
    (r"\bteu\b", "seu"), 
    (r"\bestás\b", "está"),
    (r"\bautocarro\b", "ônibus"),
    (r"\btelemóvel\b", "celular"),
    # ... and 31 more rules for pronouns, verbs, vocabulary
]
```

The rules load from a JSON file first. You can edit them, test them, see what's actually happening.

### Station 5: Does it fit?

This is the center of everything. Each translated sentence is checked against how long it has to fit. Here is the unique part: I measured the actual speech rate for every voice, not guessed it.

```python
VOICE_CALIBRATION: dict[str, float] = {
    "pf_dora": 13.3,           # Kokoro female
    "pm_alex": 13.1,           # Kokoro male  
    "pt-BR-FranciscaNeural": 11.1,  # Google (fast)
    "M1": 16.0, "F1": 16.0,    # Supertonic
    "default": 15.1,
}

def _estimate_synth_duration(text: str, cps: float = 15.1):
    return len(text.strip()) / cps
```

These numbers come from autoresearch loops where I ran actual samples and measured them. Not guesses. The data.

Then if something is too long, I try an LLM rephrase. If that fails, I trim to the nearest word boundary. Because the worst failure is when the voice keeps going and the mouth is already closed.

### Station 6: Speak

I support a bunch of different text-to-speech engines — Kokoro, XTTS v2, Edge, Google, Gemini, ElevenLabs, Supertonic. They all work differently but I make them all follow the same rules: generate audio, measure how long it is, then speed it up or slow it down to fit the time slot. If one breaks, it becomes a short silence instead of killing the whole run. That's not fancy. That's just reliability.

### Station 7: Mix it all together

I build the final audio directly in a numpy array. Each clip sits at its time offset. Then I make sure nothing is clipping loud, and I put it back into the original video with ffmpeg. Subtitles are generated separately using basic reading-speed math, and tiny gaps get merged so the subtitles feel like they were written by a person, not an algorithm.

## How it persists and resumes

Another unique part. If you run dubweave for hours and it stops at station 5, you restart from stage 5 without redoing 1–4. This is baked in:

```python
def save_project_stage(name: str, stage: str, data):
    d = project_dir(name)  # projects/my_project/
    if stage == "download":
        shutil.copy2(str(v_src), str(d / "video.mp4"))
    elif stage == "translate":
        (d / "translated.json").write_text(json.dumps(data))
    elif stage == "synthesize":
        (d / "timed_clips.json").write_text(json.dumps(data))
    # each stage: one file on disk

def load_project_stage(name: str, stage: str):
    # Load back from disk at any point
    return json.loads((d / "translated.json").read_text())
```

Every stage is a file. Pause. Come back. Tweak manually if needed.

## What makes it different

**Local and resumable**: Everything runs local by default. Every stage saves to disk. Stop and restart from where you left off.

**Timing is measured, not guessed**: 13.3 chars/sec for Kokoro pf_dora. 11.1 for Google Francisca. These come from actual measured output, kept per-voice in code.

**Normalization is explicit and editable**: 36 regex rules for PT-PT → PT-BR. Not buried in code. In a JSON file. You can edit pronouns, verb forms, gerunds, vocabulary. Change them and run again.

**Translation has a safety net**: Gemini with context windows for consistency. If the API fails or you don't have a key, it falls back to a local NLLB model. Normalization runs either way.

**Seven TTS engines, one contract**: Kokoro, XTTS v2, Edge, Google, Gemini, ElevenLabs, Supertonic. All generate audio, get time-stretched to fit, fail silently. Same code path.

**Measured, not guessed**: Autoresearch loops with KEEP and DISCARD logged. I do not assume something is better. I measure it. The numbers are in the README.

## How I work

I am autistic. I don't build by guessing. I measure, I calibrate, I make small changes and then check if they actually worked. I keep logs. I write rules down in JSON. I tune things like speech rate over and over until the numbers match what I hear, because my ears alone aren't reliable enough. Ambiguity exhausts me, so I build systems with explicit rules instead. This is not a personality thing. This is how I keep systems honest, and this is how I keep myself functional.

## That is it

dubweave is a technical system, but it's also a personal one. It was built for my wife. It was built the way I know how to build. If you are thinking about hiring me, this is what you are hiring: someone who builds things by measuring them, not guessing. Someone who keeps explicit rules and keeps them in files. Who cares about timing and context windows and graceful failure. Someone who would rather spend an hour understanding a thing than thirty minutes assuming it works.
