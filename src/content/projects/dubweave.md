---
title: 'dubweave'
description: Fully local AI dubbing pipeline. Download, transcribe, translate, and dub YouTube videos, with nothing leaving your machine. No cloud APIs, no subscriptions.
publishDate: 'Mar 01 2025'
isFeatured: true
tags:
  - Python
  - Whisper
  - TTS
  - ffmpeg
  - AI
seo:
  image:
    src: '../../assets/images/project-2.jpg'
    alt: dubweave AI dubbing pipeline
---

## The Problem

Streaming platforms frequently have content available only in English, with no dubbed or subtitled alternative. Cloud dubbing services are expensive, slow, and require sending audio to third parties.

## The Solution

dubweave is a fully local AI dubbing pipeline: download → transcribe → translate → synthesize → assemble. Built with an empirical approach: every model decision is validated against measurable output quality.

## Technical Highlights

- **Whisper ASR** for transcription with high accuracy across accents
- **NLLB-200 / LLM translation** with 8-utterance lookback for context-aware output
- **Multi-model TTS**: Kokoro, XTTS, Google, ElevenLabs, Gemini, Supertonic; switchable via config
- **PT-PT → PT-BR normalizer**: 36 regex rules, validated against 50-sentence corpus with 0 false positives
- **Empirical calibration**: measured 15.1 chars/sec actual vs 18.0 assumed, fixing 70% systematic overtrimming
- 4 completed autoresearch loops with KEEP/DISCARD decisions logged in TSV
- Pipeline resumability: interrupted runs continue from last checkpoint

[View on GitHub](https://github.com/barateza/dubweave)

## Related Reading

[Building an internal AI assistant for support engineers with MCP](../blog/kcs-search-mcp.md) — Another MCP-based internal tool project that shares a similar philosophy of keeping data local and giving engineers direct access to the systems they trust.
