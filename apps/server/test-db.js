require('dotenv').config();
const { createDatabaseAdapter } = require('./build/database');

async function test() {
  try {
    console.log('Creating database adapter...');
    const db = createDatabaseAdapter();
    console.log('Database adapter created successfully');
    
    // Test a simple query
    const result = await db.query('SELECT 1 as test');
    console.log('Test query result:', result);
    
    await db.close();
    console.log('Database closed successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

test();