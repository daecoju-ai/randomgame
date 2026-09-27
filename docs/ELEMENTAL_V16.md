# V16: six elements, five evolution tiers

- Six elements × four growth stages + twelve final forms = 36 playable entries.
- Tier 1 round spirits; tier 2 tall eggs with sharper eyes; tier 3 child humanoids; tier 4 adolescent humanoids; tier 5 crowned attackers or halo/staff supports. Canvas renderer is shared by all views.
- Each evolution consumes three of the same element and previous tier. Both final choices consume the same three tier-4 units; choose the desired result in the codex.
- All four inherited skills remain available at level 1 of an appropriate tier. Final skills unlock at hero levels 1, 10, 20. At level 30 only the first final skill gains 1.5× damage/buff/healing strength.
- Final branches have independent hero levels and skill ranks. Skill ranks cost rank × tier × 10 essence and cap at 10.
- Summon tiers: 70%, 20%, 7%, 2.5%, 0.5%; uniform within each tier.
- Unit health enables actual healing, shielding, mitigation and enemy attack debuffs. Nearby enemies attack; bosses inflict slow/stun. Zero HP causes six seconds of incapacitation then recovery at half HP. No permanent unit loss. The existing 80-monster loss condition is unchanged.
- In the fixed-placement arena, movement-speed buffs give slow resistance. They also grant the requested attack-speed bonus. This is stated in the skill description.
- Same-category auras use the strongest source; damage reduction is capped at 70%, dodge at 50%. Boss crowd-control duration is halved; low-HP execution has a 2× boss rather than 4× normal multiplier.
- V3 progression migrates on read to version 4: tier 6 merges into 5, unsupported growth types merge into their new element base, higher levels survive, duplicate level investment and old skill training investment are refunded. Raw legacy snapshots are backed up locally. V4 cleaning is idempotent. Account writes block a stale V3 client from overwriting an already-migrated V4 account.

## Extension points

`public/evolution.js` owns stable element/type IDs and save validation; `public/skills.js` owns skill definitions and effects; `public/hero-art.js` owns character rendering. Add future final variants with new stable type IDs without adding tier 6. Update catalog/recipes, server and SQL allowlists, and migration tests together. Do not reuse existing IDs or skill slots for unrelated powers.

## Verification

`npm run check` and `npm test`. Tests cover all recipes and 36 entries, progression/refunds, all effect execution, range/global attacks, branch unlocks, aura nonstacking, shield/heal/cleanse, incapacitation, account validation and previous economy/account regressions. Numeric balance still needs longer playtesting.

Verified: 49 Node tests; local Chromium phone (390×844) and desktop (1440×900) dialog/battle flows without runtime errors or page overflow; temporary PGlite database validates the migration, locked-skill rejection, stale-v3 rejection and revision conflicts. Production migration was not applied: automatic approval review requires explicit permission for changes to the production save function.
