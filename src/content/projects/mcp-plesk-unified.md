---
title: 'mcp-plesk-unified'
description: MCP server for semantic search over the full Plesk documentation corpus. Vector embeddings, cross-encoder reranking, and RAGAS-evaluated quality gates.
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
    alt: mcp-plesk-unified semantic search
---

## The Problem

Plesk documentation spans thousands of articles with inconsistent terminology. Keyword search produces noise. Engineers were spending significant time triangulating between search results to find actionable answers.

## The Solution

A FastMCP server exposing semantic search over the full Plesk documentation corpus via LanceDB. Claude Desktop/Code connects to it directly: engineers query in natural language and get precise, ranked answers.

## Technical Highlights

- **Full RAG pipeline**: embedding → retrieval → cross-encoder reranking → sigmoid normalization → source deduplication
- **RAGAS evaluation**: faithfulness, context recall, and precision measured across a golden test set
- **Multi-engine routing**: baseline vs. pageindex-pilot engines with adaptive query routing by type (lookup / structural / multi-hop)
- **Quality gates**: `--fail-on-gate` flag for CI integration; baseline capture and regression detection
- **114-test suite** with Ruff + pre-commit CI enforcement
- Semantic versioning with structured CHANGELOG across 9 releases

[View on GitHub](https://github.com/barateza/mcp-plesk-unified)
