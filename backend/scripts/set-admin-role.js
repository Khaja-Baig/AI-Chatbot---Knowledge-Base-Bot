import { admin } from '../src/config/firebase.js';

const uid = process.argv[2];

if (!uid) {
  console.error('❌ Error: Please provide a Firebase UID.');
  console.error('Usage: node scripts/set-admin-role.js <uid>');
  process.exit(1);
}

async function setAdminRole() {
  try {
    // Attempt to retrieve user info to confirm user existence
    const user = await admin.auth().getUser(uid);
    console.log(`Found user: ${user.email} (UID: ${uid})`);
    console.log('Current claims:', user.customClaims);

    // Apply role claim
    console.log('Applying role claim: { role: "admin" }...');
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
    console.log('✅ Admin role claim applied successfully!');

    // Retrieve again to verify
    const updatedUser = await admin.auth().getUser(uid);
    console.log('Updated claims:', updatedUser.customClaims);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin claims:', error.message);
    process.exit(1);
  }
}

setAdminRole();
