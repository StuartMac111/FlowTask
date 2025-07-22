import { DatabaseStorage } from './storage';
import { db } from './db';
import { users } from '@shared/schema';

// Utility script to ensure all existing users have default lists
async function ensureAllUsersHaveDefaultLists() {
  const storage = new DatabaseStorage();
  
  try {
    console.log('🔄 Checking all users for default lists...');
    
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users in database`);
    
    for (const user of allUsers) {
      console.log(`Checking user: ${user.email || user.id}`);
      
      // This will automatically check and create missing default lists
      await storage.createDefaultLists(user.id);
      console.log(`✅ Default lists ensured for ${user.email || user.id}`);
    }
    
    console.log('✅ All users now have default lists!');
  } catch (error) {
    console.error('❌ Error ensuring default lists:', error);
  }
}

// Run the function immediately
ensureAllUsersHaveDefaultLists();

export { ensureAllUsersHaveDefaultLists };