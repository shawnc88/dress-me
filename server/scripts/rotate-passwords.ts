/**
 * Rotate all test account passwords in the database.
 * Run: npx tsx scripts/rotate-passwords.ts
 *
 * Generates strong random passwords and updates the DB directly.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generatePassword(): string {
  return crypto.randomBytes(16).toString('base64url'); // ~22 chars, URL-safe
}

async function main() {
  const accounts = [
    { email: 'admin@bewithme.com', label: 'Admin' },
    { email: 'bella@bewithme.com', label: 'Creator (Bella)' },
    { email: 'viewer@bewithme.com', label: 'Viewer' },
  ];

  console.log('=== BE WITH ME PASSWORD ROTATION ===\n');
  console.log('Generating new passwords and updating database...\n');

  const results: Array<{ label: string; email: string; password: string }> = [];

  for (const account of accounts) {
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email: account.email },
      data: { passwordHash: hash },
    });

    results.push({ label: account.label, email: account.email, password });
  }

  console.log('Passwords rotated successfully!\n');
  console.log('--- SAVE THESE SECURELY (they will not be shown again) ---\n');

  for (const r of results) {
    console.log(`  ${r.label}: ${r.email} / ${r.password}`);
  }

  console.log('\n--- Store these in a password manager, NOT in code or chat ---');
  console.log('\nDone. Update Render env vars if these are used for API access.');
}

main()
  .catch((e) => {
    console.error('Rotation failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
