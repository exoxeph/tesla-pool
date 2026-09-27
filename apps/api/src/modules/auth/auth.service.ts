import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { HttpError } from "../../common/httpError";
import { prisma } from "../../db/prisma";
import type { DriverSignupInput, LoginInput, SignupInput } from "./auth.schema";

const SALT_ROUNDS = 10;

function signToken(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, config.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function toPublicUser(user: {
  id: string;
  name: string;
  phone: string;
  role: string;
}) {
  return { id: user.id, name: user.name, phone: user.phone, role: user.role };
}

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({
    where: { phone: input.phone },
  });
  if (existing) {
    throw new HttpError(409, "Phone number is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      phone: input.phone,
      passwordHash,
      role: "PASSENGER",
    },
  });

  return { token: signToken(user.id, user.role), user: toPublicUser(user) };
}

export async function driverSignup(input: DriverSignupInput) {
  const existing = await prisma.user.findUnique({
    where: { phone: input.phone },
  });
  if (existing) {
    throw new HttpError(409, "Phone number is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Single transaction: a driver with no vehicle (or a vehicle with no
  // owner) is an invalid state, so both inserts commit or neither does.
  const { user, tesla } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        passwordHash,
        role: "DRIVER",
      },
    });
    const tesla = await tx.tesla.create({
      data: {
        driverId: user.id,
        label: input.vehicleLabel,
        capacity: input.capacity,
        isOnline: false,
      },
    });
    return { user, tesla };
  });

  return {
    token: signToken(user.id, user.role),
    user: toPublicUser(user),
    tesla: {
      id: tesla.id,
      label: tesla.label,
      capacity: tesla.capacity,
      isOnline: tesla.isOnline,
    },
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { phone: input.phone },
  });
  if (!user) {
    throw new HttpError(401, "Invalid phone or password");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );
  if (!passwordMatches) {
    throw new HttpError(401, "Invalid phone or password");
  }

  return { token: signToken(user.id, user.role), user: toPublicUser(user) };
}
