// ================================
// Database Seeder
// ================================
// Run with: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users = [
  { name: "Admin User", email: "admin@example.com", password: "Password123", role: "admin" },
  { name: "John Doe", email: "john@example.com", password: "Password123", role: "user" },
  { name: "Jane Smith", email: "jane@example.com", password: "Password123", role: "user" },
  { name: "Bob Wilson", email: "bob@example.com", password: "Password123", role: "user" },
  { name: "Alice Johnson", email: "alice@example.com", password: "Password123", role: "user" },
];

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.roomParticipant.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: await bcrypt.hash(u.password, 12),
        role: u.role,
        status: "offline",
      },
    });
    createdUsers.push(user);
    console.log(`✅ Created: ${user.email} (${u.role})`);
  }

  // Create group chat
  const group = await prisma.chatRoom.create({
    data: {
      name: "General Chat",
      isGroup: true,
      ownerId: createdUsers[0].id,
      participants: {
        create: createdUsers.map((u, i) => ({
          userId: u.id,
          role: i === 0 ? "admin" : "member",
        })),
      },
    },
  });
  console.log(`✅ Created room: ${group.name}`);

  // Add messages
  await prisma.message.createMany({
    data: [
      { content: "Welcome everyone! 👋", senderId: createdUsers[0].id, roomId: group.id },
      { content: "Hey! Great to be here!", senderId: createdUsers[1].id, roomId: group.id },
      { content: "Hello all! 🎉", senderId: createdUsers[2].id, roomId: group.id },
    ],
  });

  console.log("\n" + "═".repeat(45));
  console.log("🎉 Done! Login with any email below:");
  console.log("   Password for all: Password123");
  console.log("─".repeat(45));
  console.log("   👑 ADMIN: admin@example.com");
  users.filter(u => u.role === "user").forEach((u) => console.log(`   👤 USER:  ${u.email}`));
  console.log("═".repeat(45));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
