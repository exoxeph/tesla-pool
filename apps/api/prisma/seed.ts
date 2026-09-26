import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DHAKA_ZONES = [
  "Banani",
  "Gulshan 1",
  "Gulshan 2",
  "Mohakhali",
  "Dhanmondi",
  "Mirpur",
  "Uttara",
  "Farmgate",
  "Bashundhara",
];

const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const zones = new Map<string, string>();
  for (const name of DHAKA_ZONES) {
    const zone = await prisma.zone.upsert({
      where: { name },
      update: {},
      create: { name },
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
