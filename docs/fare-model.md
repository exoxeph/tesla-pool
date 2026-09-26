# Fare Model

> TODO — this is a placeholder for the fare calculation logic. Money is
> always stored as **integer paisa** (never float/decimal) to avoid
> rounding errors; 1 BDT = 100 paisa.

## Open questions

- Base fare per zone pair vs. distance/time-based calculation.
- How per-passenger fare is split within a shared `Pool` (equal split vs.
  distance-proportional).
- Surge/demand pricing — in scope for MVP or explicitly out of scope?

## TODO

- Define the actual formula once matching/pooling logic is implemented.
- Document worked examples using the seeded Dhaka zones.
