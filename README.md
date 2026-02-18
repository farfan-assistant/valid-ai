# Valid.ai — Instant SaaS Idea Validator

**Validate your SaaS idea in 30 seconds.** Get a structured analysis with market sizing, competition landscape, risk assessment, and actionable next steps — powered by AI.

## Why?

Every indie hacker has a graveyard of ideas they spent weeks on before realizing the market didn't exist. Valid.ai gives you a reality check *before* you write a single line of code.

## What You Get

Enter your idea in plain English and receive:

- 📊 **Market Analysis** — TAM/SAM/SOM estimates with reasoning
- 🏆 **Competition Landscape** — Existing players, their strengths, and your differentiation opportunity
- 🎯 **Target Audience** — Who exactly has this problem, and how badly
- 💰 **Revenue Model** — Pricing strategy suggestions based on market norms
- ⚠️ **Risk Assessment** — Technical, market, and execution risks
- ✅ **Next Steps** — Concrete actions to validate further
- 🔢 **Validation Score** — 0-100 overall viability rating

## Quick Start

```bash
# Clone and install
git clone https://github.com/farfan-assistant/valid-ai.git
cd valid-ai
npm install

# Configure
cp .env.example .env
# Edit .env with your API key

# Run
npm start
# Open http://localhost:3400
```

## API Usage

```bash
# Validate an idea via API
curl -X POST http://localhost:3400/api/validate \
  -H "Content-Type: application/json" \
  -d '{"idea": "A Chrome extension that summarizes terms and conditions"}'

# Get a previous validation
curl http://localhost:3400/api/validations/:id

# List recent validations
curl http://localhost:3400/api/validations
```

## Tech Stack

- **Runtime:** Node.js + Express
- **AI:** OpenAI-compatible API (GPT-4, Claude, local models via LiteLLM, etc.)
- **Database:** SQLite (better-sqlite3)
- **Frontend:** Vanilla HTML/CSS/JS — zero build step
- **Search:** Integrated web search for competition analysis

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3400` | Server port |
| `OPENAI_API_KEY` | — | API key for OpenAI-compatible endpoint |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Base URL (override for Claude, local models, etc.) |
| `OPENAI_MODEL` | `gpt-4o` | Model to use for analysis |
| `DATABASE_PATH` | `./data/valid.db` | SQLite database path |

## Revenue Model (Planned)

- **Free:** 3 validations/day
- **Pro ($9/mo):** Unlimited validations, export reports, comparison mode
- **Team ($29/mo):** Shared workspace, idea pipeline, team scoring

## License

MIT
