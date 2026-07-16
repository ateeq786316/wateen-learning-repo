require('dotenv').config();
const app = require('./app');

async function main() {
  try {
    const db = await import('./services/prismaService.ts');
    const prisma = db.default;
    console.log('prisma type:', typeof prisma);
    console.log('constructor:', typeof prisma.constructor);
    console.log('constructor name:', prisma.constructor?.name);
    console.log('proto keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(prisma)));
    console.log('has $connect:', typeof prisma['$connect']);
  } catch (err) {
    console.error('Init failed:', err.message, err.stack?.substring(0, 300));
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

main();
