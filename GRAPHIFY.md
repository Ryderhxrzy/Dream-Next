# Graphify Installation

Graphify builds a local knowledge graph for this repository so agents can answer architecture and codebase questions from `graphify-out/graph.json`.

## Requirements

- Python 3.10 or newer
- One of these Python package managers:
  - `uv` recommended
  - `pip` as a fallback

Check Python:

```powershell
python --version
```

## Install With uv

From the repository root:

```powershell
cd C:\Users\user\Desktop\PROJECTS\Dream-Next
uv tool install --upgrade graphifyy
```

Verify the command is available:

```powershell
graphify --help
```

If PowerShell cannot find `graphify`, restart your terminal and try again.

## Install With pip

Use this if `uv` is not installed:

```powershell
cd C:\Users\user\Desktop\PROJECTS\Dream-Next
python -m pip install --upgrade graphifyy
```

Verify the install:

```powershell
graphify --help
```

If the command is not available, use:

```powershell
python -m graphify --help
```

## Build The Repo Graph

Run Graphify from the repository root:

```powershell
graphify .
```

To also generate the agent-readable wiki:

```powershell
graphify . --wiki
```

Graphify writes its output to:

```text
graphify-out/
  graph.json
  graph.html
  GRAPH_REPORT.md
  wiki/
```

## Keep The Graph Updated

After changing code or documentation, run:

```powershell
graphify update .
```

This refreshes the graph incrementally instead of rebuilding everything from scratch.

## Query The Graph

Once `graphify-out/graph.json` exists, ask codebase questions with:

```powershell
graphify query "How is this project structured?"
graphify explain "package.json"
graphify path "frontend" "build"
```

## Optional Semantic Extraction

Graphify can use Gemini for richer semantic extraction if you set a Gemini API key:

```powershell
$env:GEMINI_API_KEY="your-api-key"
python -m pip install --upgrade "graphifyy[gemini]"
graphify . --wiki
```

Without this key, Graphify still performs deterministic code extraction and can build a useful graph for code navigation.

## Troubleshooting

If `graphify` is not recognized:

```powershell
python -m graphify .
```

If the graph looks stale:

```powershell
graphify update .
```

If you want a clean rebuild, delete `graphify-out/` and run:

```powershell
graphify . --wiki
```
