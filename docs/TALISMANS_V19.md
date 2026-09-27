# V19 — Permanent talismans and monetization foundation

Ownership automatically grants effects; no equipment slots. Nineteen fixed catalog entries, fixed grade and value per entry. Duplicate totals 1/3/7/15/31 unlock stars 1–5; maximum duplicates become dust. Star multipliers 1/1.25/1.5/1.75/2. A battle captures a server-loaded ownership snapshot at its start.

## Economy and rollout
- Login required. One-time welcome 3 tickets, daily 1 ticket using server Asia/Seoul date.
- Server-owned wallets and idempotent transaction ledger are isolated from existing client progression saves.
- The existing hero essence/level progression still uses client snapshots; it is **not suitable for sale as a verified paid currency yet**.
- Base grade odds 60/30/9/1 percent; uniform within each grade. At 10/50/100 unsuccessful draws guarantee rare/epic/legendary respectively. A higher grade also resets lower pity counters.
- One and ten pulls execute under a wallet row lock, as one database transaction. Repeated request IDs replay the original result. API authenticates HttpOnly session, checks Origin and account owner; direct RPC enforces auth and all economic rules.
- Client keeps only a pending request identifier/action to recover lost responses, never an authoritative balance.
- No paid or ad reward endpoint exists. Unregistered purchase and reward actions fail closed. Store product cards are disabled, with no active prices.
- Wave ticket rewards, dust crafting, paid draws and ad rewards are not enabled in this release. Wave rewards require trusted run validation. No IAP/AdMob credentials or registered products were available to enable them.

## Before monetization can go live
Choose web versus app release. Web uses a compatible web ad network and payment provider; app uses native AdMob and store billing integration. Complete provider onboarding, product and ad-unit registration, then implement receipt / signed SSV verification, idempotent entitlement delivery and refunds. Do not activate buttons based only on frontend callbacks. Move any sold essence progression into a server-owned transaction model first.

## Validation
`npm test` / `npm run check`.
SQL integration checks can run in an isolated PGlite database: install `@electric-sql/pglite` in a temporary directory, set NODE_PATH to its node_modules, then `node scripts/verify-talisman-sql.cjs`. No production user data is used. Tests cover welcome, daily, replay, insufficient funds, pity, max stars/dust, 10 pulls and permissions.
Browser integration uses a disposable DB plus the real API handler, with authentication stubbed: guest disabled, free claim, draw, response loss/retry, mobile overflow, start-coin bonus and frozen battle snapshot.
