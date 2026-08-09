---
name: ai-landscape-scan-design
description: Design for re-analyzing all 21 raw transcripts with a focused AI adoption and Data Maturity lens, producing a consolidated findings report and new market study section content for the 2024 ASEAN SME Academy Market Study
metadata:
  type: project
---

# Design: AI Adoption Landscape Scan & Market Study Section

**Project:** 2024 ASEAN SME Academy Market Study  
**Date:** 2026-06-15  
**Approach:** B — Direct subagent scan (one-off, no new pipeline script)  
**Output target:** `4.C.i AI Adoption Landscape and Data Maturity` (new subsection inside `4.C.`) + one paragraph addition to `4.B.`

---

## Objective

Re-analyze all 21 raw transcript files in `Raw Data - Input/` with a focused AI/Data Maturity extraction lens. The original `extract.py` pass captured these signals superficially (most summaries returned "None detected" for `ai_digital_signals`). This scan goes deeper, applying a specialized persona and a medium-scope signal definition.

The output answers: *Is the existing 2024 transcript corpus sufficient to validate AI-related gaps, fields, weaknesses, and strengths for the ASEAN SME market study? And what does the landscape look like?*

---

## Signal Scope (Medium)

### Category 1 — Explicit AI Signals
- Direct mentions of AI, artificial intelligence, generative AI, ChatGPT, machine learning
- Named AI tools or platforms (e.g., "Elsa" from CEDAR, Google AI program from ASEAN Foundation)
- AI in curriculum, training, or capacity building programs

### Category 2 — Data Maturity Signals
- Digital diagnostic tools or readiness assessments (explicit or in development)
- Data analytics usage by SMEs or supporting organizations
- Monitoring dashboards, completion tracking, beneficiary measurement
- Absence of data practices (negative signals — e.g., "we don't have that yet")
- Data frameworks or maturity models referenced

### Category 3 — Implied Digital Readiness Signals
- Tech adoption barriers (connectivity, cost, literacy, age)
- What tools SMEs actually use as baseline (WhatsApp, Zoom, Instagram, basic web)
- Gap between what organizations offer vs. what SMEs can absorb
- Attitudes toward new technology (fear, enthusiasm, indifference)
- Any mention of AI in the broader industry context even if not SME-specific

---

## Persona: AI & Data Maturity Signal Analyst

A specialized extension of the existing `extraction_persona.md`, focused exclusively on AI/data maturity signals. See `architecture/ai_scan_persona.md`.

**Key behavioral rules for this persona:**
- Absence of AI mention IS a signal — record it as "AI Absent" not "None detected"
- Distinguish between AI awareness (knows it exists), AI adoption (using it), and AI readiness (infrastructure/skills in place)
- Treat digital maturity as a spectrum: basic digital → digital tools user → data-informed → AI-ready
- Verbatim quote required for every signal, including absence signals (quote where respondent describes their current tech ceiling)

---

## Execution Plan

### Phase 1 — Parallel transcript scan (subagents)
Spawn parallel read agents across all 21 raw transcripts. Each agent:
1. Reads the raw file
2. Applies the AI scan persona
3. Returns structured findings: signals found (with verbatim quotes), signal category, source strength, and a placement recommendation (4.B or 4.C)

### Phase 2 — Consolidation
Compile all signals into a single findings table in `Output/ai_landscape_scan_20260615.md`:
- Per-source signal inventory
- Cross-source pattern summary
- Sufficiency verdict

### Phase 3 — Market study content drafting
Using only signals with verbatim evidence, draft:
1. **4.B paragraph** — AI/digital technology as emerging but under-articulated training need
2. **4.C.i section** — AI Adoption Landscape and Data Maturity (current state → early signals → gaps → implications for ASEAN SME Academy)

All content uses `[NEW — {source}:{signal_id}]` notation per project rules.

---

## Output Files

| File | Purpose |
|------|---------|
| `architecture/ai_scan_persona.md` | Specialized persona for this scan |
| `Output/ai_landscape_scan_20260615.md` | Consolidated findings report with sufficiency verdict |
| Market study additions (inline) | 4.B paragraph + 4.C.i section, drafted for human review |

---

## Market Study Section Structure (4.C.i)

```
4.C.i  AI Adoption Landscape and Data Maturity

  1. Current State Snapshot
     — Where the ASEAN SME ecosystem sits on AI/data maturity as of 2024
     — Based on transcript evidence only

  2. Early Signals of AI Emergence
     — Specific programs, tools, or initiatives mentioned by respondents
     — Grounded in verbatim quotes

  3. Gaps and Weaknesses
     — What is absent, unaddressed, or not yet on respondents' radar
     — Includes structural barriers (connectivity, literacy, cost)

  4. Implication for the ASEAN SME Academy
     — What this means for curriculum, platform design, and partnerships
```

---

## Constraints

- **Source of truth:** Only `Raw Data - Input/` files. No inference beyond what transcripts say.
- **Verbatim anchor:** Every claim in the market study section must cite a verbatim quote and source.
- **Model:** `claude-sonnet-4-6` for LLM-assisted signal extraction.
- **No hallucination:** If a transcript has genuinely no AI/data maturity signal, that absence is itself a documented finding.
- **Temporal context:** Recordings are from 2024. AI was emerging but not mainstream in this market. Low signal volume is expected and is itself a finding.
