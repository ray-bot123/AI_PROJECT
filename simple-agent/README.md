# Simple OpenAI Agent

A small Python CLI agent built with the OpenAI SDK and the Responses API. It supports multi-turn chat and two local function tools:

- `get_current_time` for IANA timezones
- `calculate` for simple arithmetic

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
setx OPENAI_API_KEY "your_api_key_here"
```

Restart your terminal after `setx`, or set the key for the current shell:

```powershell
$env:OPENAI_API_KEY="your_api_key_here"
```

## Run

Ask a single question:

```powershell
python agent.py "What time is it in Asia/Tokyo, and what is 42 * 17?"
```

Start an interactive chat:

```powershell
python agent.py
```

Use a different model:

```powershell
$env:OPENAI_MODEL="gpt-5.5"
python agent.py "Explain what tools you can use."
```
