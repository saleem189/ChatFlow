// Script to fix roles for existing users
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixRoles() {
  try {
    console.log("🔍 Checking users...\n");

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log(`Found ${users.length} users\n`);

    // Update users without role or with null role
    let updated = 0;
    for (const user of users) {
      if (!user.role || user.role === null) {
        // Set admin@example.com as admin, others as user
        const role = user.email === "admin@example.com" ? "admin" : "user";
        
        await prisma.user.update({
          where: { id: user.id },
          data: { role },
        });
        
        console.log(`✅ Updated ${user.email} → role: ${role}`);
        updated++;
      } else {
        console.log(`✓ ${user.email} already has role: ${user.role}`);
      }
    }

    console.log(`\n✨ Done! Updated ${updated} users.`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRoles();

