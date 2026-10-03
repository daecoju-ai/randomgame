# Daily festival V45

Three authenticated entries per KST day: slime 60s, mine 60s, roulette 90s. Guest games are clearly labeled practice and grant no currency or campaign eligibility. Basic entries are ad free. Starting a game consumes its entry. A run can be resumed within two hours on the same Korean calendar day; actions persist locally. A missing action history cannot produce a reward-bearing success.

Gold, diamonds and talisman summon tickets use existing account wallets. Battle coins are banked (up to 1,000) and consumed once when the next authenticated main battle starts. Box rewards are once per day, after all three distinct games finish. Sponsor image viewing can double each run's base reward once; first-champion, first-mine and mining-record bonuses are excluded. One additional sponsor entry per KST day. The sponsor is an owned static image placement, not an AdMob SDK or verified third-party ad callback. It requires ten seconds after a server-recorded viewing start; clicking the outbound link is optional.

## Golden king

90,000 HP, 80 defense; event-specific treasure damage x2.4. Damage mitigation is 100/(100+defense). Slot positioning and range matter. Water, earth, wind and electric control slow the escape path, with skill-rank growth extending the control contribution. Basic T4 forms are provided so new users can participate; their permanent level, star and skill upgrades apply. Owned T5 forms, including supports, become selectable. Event-specific damage and support coefficients differ from the main combat engine.

The deterministic budget test starts with no currency, buys level upgrades at the existing 12*level gold price and a representative skill at 8*rank diamonds, without purchasing units or premium currency. It assumes daily play, optional doubled gold rewards and 11 diamonds/day from mine plus averaged daily rewards. Under that model the first clear occurs on day 25. This is a calibration scenario, not a promise to every player; play, placement and sponsor participation affect results. Basic Lv.1 / skill rank 1 units deal about 30,014 damage against the armored king, while Lv.25 / rank 5 can clear in 60 seconds with a fixed six-unit formation. Continue tuning against real participation data.

The single first-clear award is 2,000 diamonds. `private.event_simulate` replays timestamped placements and seeded roulette rolls using the persisted growth snapshot; client-supplied damage, victory and rewards are ignored. The campaign singleton row is locked in the same transaction that grants currency and saves the run result. Earliest valid completion transaction wins. Repeated finishes, including different request IDs, cannot grant another reward. No player email is exposed by the campaign UI.

## Verification

`npm test` covers input tampering, tier trial rolls, cooldowns, mine support/growth and the month-long budget scenario. `scripts/verify-mini-events.sql` checks currency idempotency, single champion, exclusion from doubled rewards, ad duration, additional entry limit, daily box, coin bank and KST rollover, all inside a rolled-back transaction. Only run this script using privileged database tooling; it temporarily changes an existing fixture account inside that transaction and leaves no committed test data.

New tables are private, RLS enabled and directly inaccessible to anon/authenticated. The public RPC is security invoker; its private privileged implementation checks auth.uid(), derives the wallet snapshot server-side and constrains the replay. Browser authentication uses the existing secure account cookies and API origin guard.
