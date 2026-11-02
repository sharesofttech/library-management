const bcrypt = require("bcrypt");
const { User, Role } = require("../models");

async function seedRolesAndAdmin() {
  try {
    console.log("Seeding roles and default admin...");

    // Ensure the roles used by self-service applications exist.
    const [adminRole, adminCreated] = await Role.findOrCreate({
      where: { name: "admin" },
      defaults: {
        name: "admin",
        description: "Administrator with complete system access",
      },
    });
    if (adminCreated) console.log("Created 'admin' role.");

    const [userRole, userCreated] = await Role.findOrCreate({
      where: { name: "user" },
      defaults: {
        name: "user",
        description: "Standard registered application user",
      },
    });
    if (userCreated) console.log("Created 'user' role.");

    const [, librarianCreated] = await Role.findOrCreate({
      where: { name: "librarian" },
      defaults: {
        name: "librarian",
        description: "Library staff member with library operations access",
      },
    });
    if (librarianCreated) console.log("Created 'librarian' role.");

    // 2. Assign default role to any existing users that have null roleId
    const [updatedCount] = await User.update(
      { roleId: userRole.id },
      { where: { roleId: null } }
    );
    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} existing user(s) to 'user' role.`);
    }

    
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    let adminUser = await User.findOne({ where: { email: adminEmail } });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      adminUser = await User.create({
        name: "System Admin",
        email: adminEmail,
        countryCode: "+91",
        phone: "9876543210",
        password: hashedPassword,
        roleId: adminRole.id,
      });
      console.log(`Default Admin created: ${adminEmail} (password: ${adminPassword})`);
    } else if (adminUser.roleId !== adminRole.id) {
      adminUser.roleId = adminRole.id;
      await adminUser.save();
      console.log(`Ensured user ${adminEmail} has 'admin' role.`);
    }

    console.log("Roles and default admin setup completed.");
  } catch (err) {
    console.error("Error during seedRolesAndAdmin:", err);
  }
}

module.exports = seedRolesAndAdmin;
