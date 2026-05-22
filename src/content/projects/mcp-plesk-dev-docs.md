---
title: 'mcp-plesk-dev-docs'
description: MCP server for semantic search over the Plesk documentation corpus. Vector embeddings, cross encoder reranking, and RAG evaluation.
publishDate: 'Nov 01 2024'
isFeatured: true
tags:
  - Python
  - LanceDB
  - FastMCP
  - RAG
  - Vector Search
seo:
  image:
    src: '../../assets/images/project-3.jpg'
    alt: mcp-plesk-dev-docs semantic search
---

## The Problem

Plesk documentation spans thousands of articles with inconsistent terminology. Keyword search produces noise. Engineers were spending significant time triangulating between search results to find actionable answers.

## The Solution

A FastMCP server exposing semantic search over the Plesk documentation corpus via LanceDB. Claude Desktop and Claude Code can query it directly to surface precise, ranked answers.

## Technical Highlights

- Full RAG pipeline: embedding, retrieval, cross encoder reranking, normalization, source deduplication
- RAG evaluation for faithfulness, context recall, and precision
- Multi engine routing with adaptive query selection by intent
- Quality gates for regression detection and baseline tracking
- Test suite with Ruff and pre commit enforcement
- Semantic versioning with structured changelog

[View on GitHub](https://github.com/barateza/mcp-plesk-dev-docs)
