// ================================
// MongoDB Initialization Script
// ================================
// This script runs when the MongoDB container is first created
// It sets up the chatapp database and creates a dedicated user

// Switch to the chatapp database
db = db.getSiblingDB("chatapp");

// Create a dedicated user for the application
db.createUser({
  user: "chatapp_user",
  pwd: "chatapp_password",
  roles: [
    {
      role: "readWrite",
      db: "chatapp",
    },
  ],
});

// Create indexes for better query performance
// These will be managed by Prisma, but we can add some basic ones

print("MongoDB initialization complete!");
print("Database: chatapp");
print("User: chatapp_user created with readWrite permissions");

