import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DHAKA_ZONES: { name: string; lat: number; lng: number }[] = [
  { name: "Banani", lat: 23.793993, lng: 90.404272 },
  { name: "Gulshan 1", lat: 23.797911, lng: 90.414391 },
  { name: "Gulshan 2", lat: 23.7925, lng: 90.4078 },
  { name: "Mohakhali", lat: 23.777628, lng: 90.405449 },
  { name: "Dhanmondi", lat: 23.746466, lng: 90.376015 },
  { name: "Mirpur", lat: 23.82235, lng: 90.365417 },
  { name: "Uttara", lat: 23.872839, lng: 90.396028 },
  { name: "Farmgate", lat: 23.756107, lng: 90.387196 },
  { name: "Bashundhara", lat: 23.814311, lng: 90.437596 },
];

const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const zones = new Map<string, string>();
  for (const { name, lat, lng } of DHAKA_ZONES) {
    const zone = await prisma.zone.upsert({
      where: { name },
      update: { lat, lng },
      create: { name, lat, lng },
    });
    zones.set(name, zone.id);
  }

  const jashim = await prisma.user.upsert({
    where: { phone: "01700000001" },
    update: {},
    create: {
      name: "Jashim",
      phone: "01700000001",
      passwordHash,
      role: Role.DRIVER,
    },
  });

  const bullet = await prisma.tesla.upsert({
    where: { driverId: jashim.id },
    update: {},
    create: {
      driverId: jashim.id,
      label: "Bullet",
      capacity: 3,
      isOnline: true,
    },
  });

  const nusrat = await prisma.user.upsert({
    where: { phone: "01700000002" },
    update: {},
    create: {
      name: "Nusrat",
      phone: "01700000002",
      passwordHash,
      role: Role.PASSENGER,
    },
  });

  const rafiq = await prisma.user.upsert({
    where: { phone: "01700000003" },
    update: {},
    create: {
      name: "Rafiq",
      phone: "01700000003",
      passwordHash,
      role: Role.PASSENGER,
    },
  });

  const shirin = await prisma.user.upsert({
    where: { phone: "01700000004" },
    update: {},
    create: {
      name: "Shirin",
      phone: "01700000004",
      passwordHash,
      role: Role.PASSENGER,
    },
  });

  const pool = await prisma.pool.create({
    data: {
      teslaId: bullet.id,
      status: "OPEN",
      seatsTaken: 3,
    },
  });

  await prisma.rideRequest.createMany({
    data: [
      {
        passengerId: nusrat.id,
        pickupZoneId: zones.get("Banani")!,
        destinationZoneId: zones.get("Mohakhali")!,
        seats: 1,
        status: "MATCHED",
        farePaisa: 15000,
        poolId: pool.id,
      },
      {
        passengerId: rafiq.id,
        pickupZoneId: zones.get("Banani")!,
        destinationZoneId: zones.get("Gulshan 1")!,
        seats: 1,
        status: "MATCHED",
        farePaisa: 12000,
        poolId: pool.id,
      },
      {
        passengerId: shirin.id,
        pickupZoneId: zones.get("Dhanmondi")!,
        destinationZoneId: zones.get("Gulshan 2")!,
        seats: 1,
        status: "MATCHED",
        farePaisa: 18000,
        poolId: pool.id,
      },
    ],
  });

  console.log("Seed complete. Demo password for all users:", DEMO_PASSWORD);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
