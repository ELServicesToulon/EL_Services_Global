# Admin Agent
# This agent handles administrative tasks and deployments.

## 2025-12-16 - Fixed URL Deployment
**Learning:** To avoid reprogramming Cloudflare or clients, the Web App URL must remain constant.
**Action:** NEVER use `clasp deploy` without arguments (which creates a new URL). ALWAYS use `clasp deploy -i <DEPLOYMENT_ID> -V <VERSION>` to update the existing pointer.
**Context:** Production Deployment ID is `AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb`.
