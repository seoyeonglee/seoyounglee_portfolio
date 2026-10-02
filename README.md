# Seoyoung Lee — Full-Stack & Applied AI Engineering Portfolio

Source for my public web portfolio.

**Live site:** https://seoyounglee-portfolio.vercel.app/

## What this portfolio covers

- full-stack applications, backend/data platforms, automation, and applied AI tooling
- software and web development background
- JavaScript / TypeScript / Python / Node.js
- React / Vue.js
- PostgreSQL / MySQL / SQL
- game development and programming instruction
- SnackFit recommendation-system work from undergraduate capstone through freelance commercial application
- fraud / abuse / AML monitoring
- privacy and security engineering
- digital forensics and blockchain analysis
- audit and control automation
- public engineering repositories and research

## Selected engineering work

- **[Audit Evidence / Operations](https://github.com/seoyeonglee/audit-evidence-agent)** — source-backed records, tenant/role boundaries, durable SQL jobs, human approval, and a separate RAG Lab. [Architecture](https://github.com/seoyeonglee/audit-evidence-agent/blob/main/docs/architecture.md) · [Tests](https://github.com/seoyeonglee/audit-evidence-agent/tree/main/tests/platform)
- **[FinScope](https://github.com/seoyeonglee/fintech-usage-recommender)** — interactive usage analytics, explainable hybrid ranking, cold-start handling, and time-split offline evaluation on synthetic sessions. [Live demo](https://seoyoung-finscope.onrender.com/) · [Evaluation & limitations](https://github.com/seoyeonglee/fintech-usage-recommender/blob/main/docs/model-card.md)
- **Crypto Transaction Tracer** — graph-based blockchain transaction investigation
- **High-Throughput Event Platform** — React/FastAPI event platform with Redis Streams and PostgreSQL architecture
- **Hold'em Real-Time Server Lab** — TypeScript, Node.js, WebSocket, CSPRNG shuffle, and state-machine lab
- **Privacy Access Monitor** — behavioral access monitoring and anomaly detection
- **Fraud Risk Engine** — explainable rule-based fraud scoring on synthetic transactions
- **Search API Benchmark** — reproducible API performance and result-quality benchmark

These are portfolio/reference implementations. FinScope metrics describe a bounded synthetic dataset. Audit’s public demo uses SQLite and fictional personas; PostgreSQL isolation is tested separately. Existing professional-experience sections remain distinct from these public projects.

## Portfolio implementation

The site is intentionally lightweight and framework-free:

- semantic HTML
- responsive CSS
- vanilla JavaScript
- dark / light theme
- EN / KR content toggle
- command palette
- tab routing
- reveal-on-scroll interactions

The UI is kept deliberately stable while the content evolves as new public-safe projects are added.

## Public-safe principle

Employer data, internal source code, private thresholds, and proprietary detection logic are not published. Public repositories use synthetic or openly available data and clearly distinguish portfolio prototypes from production claims.

## Verify locally

The site has no runtime dependencies or build step. Serve this directory with any static HTTP server.

For regression checks, use Node.js 22 or newer:

```sh
npm ci
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

The browser suite starts a temporary local server, tests desktop/mobile navigation, history, command-palette links, and layout, and saves screenshots under `artifacts/`. The GitHub Actions workflow runs the same checks and retains those screenshots as a review artifact. It does not deploy the site.
