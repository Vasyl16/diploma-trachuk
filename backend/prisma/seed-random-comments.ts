/**
 * Adds demo comments across recipes (published + drafts).
 *
 * Requires: DATABASE_URL (and migrated schema with RecipeComment).
 * Requires at least one user in DB.
 *
 * Run: npm run db:seed-comments
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

/** Human-ish lines (vary length and tone). */
const PHRASES = [
  'Tried this last night — really enjoyed it!',
  'Saving this for meal prep.',
  'Looks incredible, thanks for posting.',
  'Made it with olive oil instead of butter and it still worked.',
  'How long did the sauce take to thicken for you?',
  'My partner asked me to bookmark this 😄',
  'Added a pinch of smoked paprika — chef’s kiss.',
  'Simple steps, clear instructions.',
  'Will definitely make again.',
  'First time cooking this style — nailed it!',
  'Do you think this freezes well?',
  'Shared with my family — big hit.',
  'Used what I had in the fridge; flexible recipe.',
  'Five stars from the picky teenager.',
  'Quick weeknight winner.',
  'Photo does not do it justice.',
  'I halved the recipe for two portions.',
  'More salt next time for my taste.',
  'Love the ingredient list.',
  'Bookmarked!',
];

function rndInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[rndInt(0, items.length - 1)]!;
}

function pickCommenter(
  userIds: string[],
  recipeAuthorId: string,
): string {
  const others = userIds.filter((id) => id !== recipeAuthorId);
  const pool = others.length > 0 ? others : userIds;
  return pick(pool);
}

function randomBody(title: string): string {
  const base = pick(PHRASES);
  if (Math.random() < 0.35) {
    return `"${title}" — ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  }
  return base;
}

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: { id: true, title: true, userId: true },
    orderBy: { createdAt: 'asc' },
  });
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) {
    throw new Error('No users found — seed users first (npm run db:seed).');
  }
  if (recipes.length === 0) {
    console.log('No recipes — nothing to do.');
    return;
  }

  const userIds = users.map((u) => u.id);
  /** “A few” per recipe: inclusive range. */
  const minComments = 2;
  const maxComments = 5;

  let total = 0;
  const rows: { recipeId: string; userId: string; body: string }[] = [];

  for (const r of recipes) {
    const n = rndInt(minComments, maxComments);
    for (let i = 0; i < n; i++) {
      rows.push({
        recipeId: r.id,
        userId: pickCommenter(userIds, r.userId),
        body: randomBody(r.title),
      });
      total++;
    }
  }

  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await prisma.recipeComment.createMany({ data: chunk });
  }

  console.log(
    `Done — added ${total} comments across ${recipes.length} recipe(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
