---
title: 'Zendesk Real-Time Notifier'
description: Chrome extension for real-time Zendesk ticket monitoring. Built to solve missed tickets while context-switching between browser tabs during high-volume support shifts.
publishDate: 'Jan 01 2025'
isFeatured: true
tags:
  - JavaScript
  - Chrome Extension
  - MV3
  - Playwright
seo:
  image:
    src: '../../assets/images/project-1.jpg'
    alt: Zendesk Real-Time Notifier
---

## The Problem

During high-volume support shifts, tickets would land and go unnoticed while I was context-switching between Zendesk tabs, documentation, and terminals. The built-in Zendesk notification system was unreliable and slow.

## The Solution

A Chrome extension using Manifest V3 that polls Zendesk in real time and fires desktop notifications the moment a new ticket is assigned or updated.

## Technical Details

- **Manifest V3** service worker architecture
- **Playwright** E2E test suite for reliability across browser updates
- **Chrome API** for notifications, storage, and background polling
- Configurable polling interval and notification rules per queue

## Outcome

Zero missed tickets since deployment. Used daily during active support shifts.

[View on GitHub](https://github.com/barateza/barateza-ticket-notifier-v3)
