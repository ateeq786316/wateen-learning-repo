import 'dotenv/config';
import app from './app.js';
import prisma from './services/prismaService.ts';

(globalThis as any).__prisma = prisma;

async function main() {
  await prisma.$connect();
  console.log('Database connected successfully');

  const PORT = process.env.PORT || 3000;
  (app as any).listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
