import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const game = await prisma.game.upsert({
    where: { slug: "africa-landmarks" },
    update: {
      title: "Africa: Landmarks & Wonders",
      description: "Piece together the places and landmarks that tell Africa's story.",
      category: "Geography",
      coverImage: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=85",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      slug: "africa-landmarks",
      title: "Africa: Landmarks & Wonders",
      description: "Piece together the places and landmarks that tell Africa's story.",
      category: "Geography",
      coverImage: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=85",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  await prisma.puzzle.upsert({
    where: { gameId_slug: { gameId: game.id, slug: "africa-landmarks-60" } },
    update: {
      title: "Landmarks & Wonders — 60 Pieces",
      imageUrl: game.coverImage,
      pieceCount: 60,
      difficulty: "RELAXED",
      sortOrder: 1,
      isActive: true,
    },
    create: {
      gameId: game.id,
      slug: "africa-landmarks-60",
      title: "Landmarks & Wonders — 60 Pieces",
      imageUrl: game.coverImage,
      pieceCount: 60,
      difficulty: "RELAXED",
      sortOrder: 1,
      isActive: true,
    },
  });

  console.log("Staging seed complete: published Africa landmarks game with one active 60-piece puzzle.");
}

main()
  .catch((error) => {
    console.error("Staging seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
