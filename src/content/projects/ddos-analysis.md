---
title: 'ddos-analysis'
description: Real-time DDoS detection and log analysis scripts written during an actual incident. Automates triage of HTTP flood and credential stuffing from raw access logs.
publishDate: 'Jun 01 2024'
isFeatured: false
tags:
  - Shell
  - Bash
  - Security
---

## The Context

Written during a live HTTP flood incident affecting a customer's server. The standard tooling was too slow for real-time triage; I needed something I could pipe raw access logs through and get actionable data immediately.

## What It Does

- Parses raw Apache/Nginx access logs in real time
- Detects HTTP flood patterns and credential stuffing signatures
- Outputs ranked IP lists, request rate summaries, and User-Agent patterns
- Designed to run on a live server without additional dependencies

## Technical Details

- Pure Shell/Bash — no Python, no dependencies, deploys in seconds
- Uses `awk`, `grep`, `sort`, `uniq` pipelines for speed
- Written incrementally during the actual incident, then cleaned and generalized

[View on GitHub](https://github.com/barateza/ddos-analysis)
