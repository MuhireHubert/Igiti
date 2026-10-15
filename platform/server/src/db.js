import { PrismaClient } from "@prisma/client";

const prisma = globalThis.__igitiPlayPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__igitiPlayPrisma = prisma;

export default prisma;
