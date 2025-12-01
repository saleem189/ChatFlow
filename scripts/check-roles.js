// Quick script to check if roles exist in database
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkRoles() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log("\n📊 Users in Database:");
    console.log("=".repeat(60));
    users.forEach((user) => {
      console.log(`  ${user.email.padEnd(30)} | Role: ${user.role || "MISSING"}`);
    });
    console.log("=".repeat(60));
    console.log(`\nTotal users: ${users.length}`);
    console.log(`Users with role: ${users.filter(u => u.role).length}`);
    console.log(`Users without role: ${users.filter(u => !u.role).length}`);
    
    // Update users without role
    const usersWithoutRole = users.filter(u => !u.role);
    if (usersWithoutRole.length > 0) {
      console.log("\n⚠️  Found users without role. Updating...");
      for (const user of usersWithoutRole) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "user" },
        });
        console.log(`  ✅ Updated ${user.email} to role: user`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();

