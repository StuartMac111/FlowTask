import * as cron from 'node-cron';
import { DatabaseStorage } from './storage';

let storage: DatabaseStorage;

export function initializeDailyCleanup(dbStorage: DatabaseStorage) {
  storage = dbStorage;
  
  // Schedule daily cleanup at midnight (00:00) every day
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Starting daily My Day cleanup at:', new Date().toISOString());
    
    try {
      await storage.cleanupMyDayList();
      console.log('✅ Daily My Day cleanup completed successfully');
    } catch (error) {
      console.error('❌ Error during daily My Day cleanup:', error);
    }
  }, {
    timezone: "UTC" // You can change this to user's timezone if needed
  });
  
  console.log('⏰ Daily cleanup scheduler initialized - runs at midnight UTC');
}

// Manual trigger for testing
export async function triggerManualCleanup() {
  if (!storage) {
    throw new Error('Daily cleanup not initialized');
  }
  
  console.log('🧹 Manual cleanup triggered at:', new Date().toISOString());
  await storage.cleanupMyDayList();
  console.log('✅ Manual cleanup completed');
}