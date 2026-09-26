# Entity Relationship Diagram

> TODO — render an actual diagram (e.g. via `prisma-erd-generator` or dbdiagram.io)
> once the schema stabilizes. Textual relationships below reflect
> `apps/api/prisma/schema.prisma` as of the initial scaffold.

## Entities

- **User** (`PASSENGER` | `DRIVER`)
  - has one `Tesla` (if driver)
  - has many `RideRequest`
- **Zone** — predefined Dhaka areas (Banani, Gulshan 1, Gulshan 2, Mohakhali,
  Dhanmondi, Mirpur, Uttara, Farmgate, Bashundhara)
  - referenced by `RideRequest.pickupZoneId` and `RideRequest.destinationZoneId`
- **Tesla** — one per driver, has a seat `capacity`
  - has many `Pool`
- **Pool** — one shared vehicle trip on a `Tesla`, bounded by its `capacity`
  - has many `RideRequest`
- **RideRequest** — one passenger's membership in a `Pool`, with its own
  `status` and `farePaisa`
  - belongs to one `User` (passenger)
  - belongs to one pickup `Zone` and one destination `Zone`
  - optionally belongs to one `Pool`

## TODO

- Embed generated ERD image.
- Document cardinality constraints not expressible in Prisma (e.g. seat
  capacity enforcement) and where they're enforced in application code.
