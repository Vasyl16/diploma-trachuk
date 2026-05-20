/**
 * Demo data: Clerk users + many published recipes + likes (and some saves).
 *
 * On each run: deletes ALL recipes, likes, and favorites; deletes every user
 * except the one with email PROTECTED_EMAIL (then re-seeds demo users).
 *
 * Requires: DATABASE_URL, CLERK_SECRET_KEY in backend/.env
 *
 * Password (all accounts): SeedUser123!
 * Emails: user1@gmail.com … user8@gmail.com
 *
 * Run: npm run db:seed
 */

import { createClerkClient } from '@clerk/backend';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

/** Preserved across wipe (no email in responses from /users/search). */
const PROTECTED_EMAIL = 'mira07081984@gmail.com';

const SEED_PASSWORD = 'SeedUser123!';

const USER_DEFS: { email: string; name: string; avatarUrl: string }[] = [
  { email: 'user1@gmail.com', name: 'Anna Chef', avatarUrl: 'https://i.pravatar.cc/300?img=47' },
  { email: 'user2@gmail.com', name: 'Ben Baker', avatarUrl: 'https://i.pravatar.cc/300?img=12' },
  { email: 'user3@gmail.com', name: 'Clara Kitchen', avatarUrl: 'https://i.pravatar.cc/300?img=32' },
  { email: 'user4@gmail.com', name: 'David Spice', avatarUrl: 'https://i.pravatar.cc/300?img=15' },
  { email: 'user5@gmail.com', name: 'Elena Pasta', avatarUrl: 'https://i.pravatar.cc/300?img=45' },
  { email: 'user6@gmail.com', name: 'Frank Grill', avatarUrl: 'https://i.pravatar.cc/300?img=68' },
  { email: 'user7@gmail.com', name: 'Gina Vegan', avatarUrl: 'https://i.pravatar.cc/300?img=44' },
  { email: 'user8@gmail.com', name: 'Hugo Dessert', avatarUrl: 'https://i.pravatar.cc/300?img=33' },
];

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80',
  'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
  'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80',
  'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&q=80',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80',
  'https://images.unsplash.com/photo-1482049016-7a729e0cb7a6?w=800&q=80',
];

type RecipeSeed = {
  title: string;
  ingredients: string[];
  steps: string[];
  imageUrl: string | null;
  isAI: boolean;
  category: string;
  tags: string[];
  diet: string | null;
  restrictions: string[];
};

function inferCategory(tags: string[]): string {
  const lower = tags.map((x) => x.toLowerCase());
  if (lower.some((t) => ['italian', 'pasta', 'pizza'].includes(t)))
    return 'Italian';
  if (lower.some((t) => ['mexican', 'street'].includes(t))) return 'Mexican';
  if (lower.some((t) => ['indian', 'curry'].includes(t))) return 'Indian';
  if (lower.some((t) => ['thai', 'vietnamese', 'pho'].includes(t))) return 'Southeast Asian';
  if (lower.some((t) => ['japanese', 'ramen', 'sushi'].includes(t))) return 'Japanese';
  if (lower.some((t) => ['korean'].includes(t))) return 'Korean';
  if (lower.some((t) => ['french'].includes(t))) return 'French';
  if (lower.some((t) => ['american', 'bbq'].includes(t))) return 'American';
  if (lower.some((t) => ['british'].includes(t))) return 'British';
  if (lower.some((t) => ['spanish'].includes(t))) return 'Spanish';
  if (lower.some((t) => ['greek', 'mediterranean'].includes(t))) return 'Mediterranean';
  if (lower.some((t) => ['middle eastern'].includes(t))) return 'Middle Eastern';
  if (lower.some((t) => ['breakfast', 'brunch'].includes(t))) return 'Breakfast';
  if (lower.some((t) => ['dessert', 'chocolate', 'baking', 'sweet'].includes(t)))
    return 'Dessert';
  if (lower.some((t) => ['soup', 'comfort'].includes(t))) return 'Soup';
  if (lower.some((t) => ['salad'].includes(t))) return 'Salad';
  if (lower.some((t) => ['vegan', 'vegetarian', 'bowl'].includes(t))) return 'Plant-based';
  if (lower.some((t) => ['asian', 'stir-fry', 'dumpling'].includes(t))) return 'Asian';
  if (lower.some((t) => ['fish', 'seafood'].includes(t))) return 'Seafood';
  const raw = lower[0] ?? 'general';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function inferDietAndRestrictions(tags: string[]): {
  diet: string | null;
  restrictions: string[];
} {
  const lower = tags.map((x) => x.toLowerCase());
  if (lower.includes('vegan')) {
    return {
      diet: 'vegan',
      restrictions: ['dairy-free', 'egg-free', 'honey-free'],
    };
  }
  if (lower.includes('vegetarian')) {
    return { diet: 'vegetarian', restrictions: ['meat-free', 'fish-free'] };
  }
  if (lower.includes('dessert') || lower.includes('chocolate')) {
    return { diet: null, restrictions: ['nut-free'] };
  }
  return { diet: null, restrictions: [] };
}

/** Deterministic pseudo-random 0..max-1 from string (stable across runs). */
function hashPick(s: string, max: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % max;
}

function buildRecipeCatalog(): RecipeSeed[] {
  const titles: { title: string; tags: string[]; ai: boolean }[] = [
    { title: 'Morning oats & berries', tags: ['breakfast', 'quick'], ai: false },
    { title: 'Garlic butter pasta', tags: ['pasta', 'italian'], ai: false },
    { title: 'Roasted vegetable bowl', tags: ['vegan', 'bowl'], ai: true },
    { title: 'Classic margherita pizza', tags: ['pizza', 'italian'], ai: false },
    { title: 'Thai green curry', tags: ['curry', 'spicy'], ai: true },
    { title: 'French onion soup', tags: ['soup', 'comfort'], ai: false },
    { title: 'Grilled salmon & dill', tags: ['fish', 'healthy'], ai: false },
    { title: 'Beef tacos with salsa', tags: ['mexican', 'street'], ai: false },
    { title: 'Chicken tikka masala', tags: ['indian', 'curry'], ai: true },
    { title: 'Caesar salad', tags: ['salad', 'quick'], ai: false },
    { title: 'Mushroom risotto', tags: ['rice', 'italian'], ai: false },
    { title: 'Shakshuka', tags: ['eggs', 'brunch'], ai: false },
    { title: 'BBQ pulled pork sandwich', tags: ['bbq', 'american'], ai: false },
    { title: 'Sushi bowl', tags: ['japanese', 'bowl'], ai: true },
    { title: 'Greek salad with feta', tags: ['salad', 'mediterranean'], ai: false },
    { title: 'Pumpkin soup', tags: ['soup', 'vegan'], ai: false },
    { title: 'Steak frites', tags: ['beef', 'french'], ai: false },
    { title: 'Pad thai', tags: ['thai', 'noodles'], ai: true },
    { title: 'Lasagna bolognese', tags: ['pasta', 'bake'], ai: false },
    { title: 'Caprese skewers', tags: ['starter', 'italian'], ai: false },
    { title: 'Chicken noodle soup', tags: ['soup', 'comfort'], ai: false },
    { title: 'Fish & chips', tags: ['fish', 'british'], ai: false },
    { title: 'Vegetable stir-fry', tags: ['asian', 'vegan'], ai: false },
    { title: 'Chocolate lava cake', tags: ['dessert', 'chocolate'], ai: true },
    { title: 'Tiramisu cups', tags: ['dessert', 'italian'], ai: false },
    { title: 'Banana bread', tags: ['baking', 'breakfast'], ai: false },
    { title: 'Berry smoothie bowl', tags: ['breakfast', 'healthy'], ai: false },
    { title: 'Eggs Benedict', tags: ['brunch', 'classic'], ai: false },
    { title: 'Cobb salad', tags: ['salad', 'american'], ai: false },
    { title: 'Pho bo', tags: ['vietnamese', 'soup'], ai: true },
    { title: 'Butter chicken', tags: ['indian', 'curry'], ai: false },
    { title: 'Fish tacos', tags: ['mexican', 'fish'], ai: false },
    { title: 'Quiche Lorraine', tags: ['french', 'brunch'], ai: false },
    { title: 'Ratatouille', tags: ['french', 'vegan'], ai: false },
    { title: 'Burger & sweet potato fries', tags: ['american', 'comfort'], ai: false },
    { title: 'Coconut curry lentils', tags: ['vegan', 'curry'], ai: false },
    { title: 'Spaghetti carbonara', tags: ['pasta', 'italian'], ai: false },
    { title: 'Dumpling soup', tags: ['asian', 'soup'], ai: true },
    { title: 'Chili con carne', tags: ['mexican', 'spicy'], ai: false },
    { title: 'Falafel wrap', tags: ['middle eastern', 'vegan'], ai: false },
    { title: 'Seafood paella', tags: ['spanish', 'rice'], ai: true },
    { title: 'Croque monsieur', tags: ['french', 'sandwich'], ai: false },
    { title: 'Apple crumble', tags: ['dessert', 'baking'], ai: false },
    { title: 'Pancakes & maple syrup', tags: ['breakfast', 'sweet'], ai: false },
    { title: 'Baked feta pasta', tags: ['pasta', 'viral'], ai: false },
    { title: 'Korean bibimbap', tags: ['korean', 'bowl'], ai: true },
    { title: 'Lamb kofta & tzatziki', tags: ['greek', 'grill'], ai: false },
    { title: 'Tom yum soup', tags: ['thai', 'soup'], ai: false },
    { title: 'Spinach & ricotta cannelloni', tags: ['pasta', 'bake'], ai: false },
    { title: 'Crème brûlée', tags: ['dessert', 'french'], ai: false },
    { title: 'Avocado toast deluxe', tags: ['brunch', 'quick'], ai: false },
    { title: 'Chicken shawarma plate', tags: ['middle eastern'], ai: false },
    { title: 'Miso ramen', tags: ['japanese', 'noodles'], ai: true },
    { title: 'Shepherd’s pie', tags: ['british', 'comfort'], ai: false },
    { title: 'Zucchini fritters', tags: ['starter', 'vegetarian'], ai: false },
    { title: 'Pear & gorgonzola salad', tags: ['salad', 'italian'], ai: false },
    { title: 'Churros & chocolate', tags: ['dessert', 'spanish'], ai: false },
    { title: 'Breakfast burrito', tags: ['mexican', 'breakfast'], ai: false },
    { title: 'Teriyaki chicken bowl', tags: ['japanese', 'bowl'], ai: false },
    { title: 'Minestrone', tags: ['soup', 'italian'], ai: false },
    { title: 'Profiteroles', tags: ['dessert', 'french'], ai: true },
    { title: 'Halloumi & watermelon salad', tags: ['salad', 'summer'], ai: false },
    { title: 'Beef bourguignon', tags: ['french', 'slow'], ai: false },
    { title: 'Coconut rice pudding', tags: ['dessert', 'vegan'], ai: false },
    { title: 'Spinach gnocchi', tags: ['pasta', 'italian'], ai: false },
    { title: 'Harissa chicken traybake', tags: ['spicy', 'easy'], ai: false },
    { title: 'Matcha cheesecake', tags: ['dessert', 'japanese'], ai: true },
  ];

  return titles.map((t, i) => {
    const img = FOOD_IMAGES[i % FOOD_IMAGES.length];
    const tagStr = t.tags.join(', ');
    const tags = t.tags.map((x) => x.toLowerCase());
    const category = inferCategory(t.tags);
    const { diet, restrictions } = inferDietAndRestrictions(t.tags);
    return {
      title: `[Demo] ${t.title}`,
      ingredients: [
        `${t.tags[0]} base ingredients 300g`,
        'Olive oil 2 tbsp',
        'Garlic 2 cloves',
        `Fresh herbs (${tagStr})`,
        'Salt & pepper',
      ],
      steps: [
        `Prep ingredients for ${t.title.toLowerCase()}; preheat pan or oven as needed.`,
        `Cook core components with spices matching: ${tagStr}.`,
        'Taste, adjust seasoning, plate and serve warm.',
      ],
      imageUrl: img,
      isAI: t.ai,
      category,
      tags,
      diet,
      restrictions,
    };
  });
}

function pickLikers(
  recipeId: string,
  authorUserId: string,
  allUsers: { id: string }[],
): { id: string }[] {
  const others = allUsers.filter((u) => u.id !== authorUserId);
  const n = Math.min(others.length, 3 + hashPick(recipeId, 5));
  return [...others]
    .sort(
      (a, b) =>
        hashPick(recipeId + a.id, 1e9) - hashPick(recipeId + b.id, 1e9),
    )
    .slice(0, n);
}

async function ensureClerkUser(
  clerk: ReturnType<typeof createClerkClient>,
  email: string,
  firstName: string,
  lastName: string,
): Promise<string> {
  const existing = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }
  const created = await clerk.users.createUser({
    emailAddress: [email],
    password: SEED_PASSWORD,
    firstName,
    lastName: lastName || 'User',
    skipPasswordChecks: true,
  });
  return created.id;
}

async function wipeAppDataExceptProtectedUser() {
  console.log('Wiping all recipes, likes, favorites, and users (except protected)…');
  await prisma.recipeLike.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.recipe.deleteMany({});
  const keep = await prisma.user.findUnique({
    where: { email: PROTECTED_EMAIL },
  });
  if (keep) {
    await prisma.user.deleteMany({ where: { NOT: { id: keep.id } } });
    console.log(`  Kept user ${PROTECTED_EMAIL}.`);
  } else {
    await prisma.user.deleteMany({});
    console.log(
      `  No user with ${PROTECTED_EMAIL} — all users removed.`,
    );
  }
}

async function main() {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error(
      'CLERK_SECRET_KEY is missing in backend/.env — required to create sign-in accounts.',
    );
  }

  await wipeAppDataExceptProtectedUser();

  const clerk = createClerkClient({ secretKey: secret });
  const catalog = buildRecipeCatalog();

  console.log('Seeding users (Clerk + Prisma)…');
  const users: { id: string; email: string }[] = [];

  for (const def of USER_DEFS) {
    const [firstName, ...rest] = def.name.split(' ');
    const lastName = rest.join(' ') || 'Cook';
    const clerkId = await ensureClerkUser(clerk, def.email, firstName, lastName);
    const user = await prisma.user.upsert({
      where: { email: def.email },
      create: {
        clerkId,
        email: def.email,
        name: def.name,
        avatarUrl: def.avatarUrl,
        isPremium: false,
      },
      update: {
        clerkId,
        name: def.name,
        avatarUrl: def.avatarUrl,
      },
    });
    users.push({ id: user.id, email: user.email });
    console.log(`  ${def.email}`);
  }

  const userIds = users.map((u) => u.id);

  console.log(`Creating ${catalog.length} published recipes (round-robin authors)…`);
  const createdIds: string[] = [];
  for (let i = 0; i < catalog.length; i++) {
    const tpl = catalog[i];
    const author = users[i % users.length];
    const r = await prisma.recipe.create({
      data: {
        title: tpl.title,
        ingredients: tpl.ingredients,
        steps: tpl.steps,
        imageUrl: tpl.imageUrl,
        isAI: tpl.isAI,
        isPublished: true,
        category: tpl.category,
        tags: tpl.tags,
        diet: tpl.diet,
        restrictions: tpl.restrictions,
        userId: author.id,
      },
    });
    createdIds.push(r.id);
  }

  console.log('Seeding likes (each post liked by several other users)…');
  const likeRows: { userId: string; recipeId: string }[] = [];
  for (const recipeId of createdIds) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { userId: true },
    });
    if (!recipe) continue;
    const pick = pickLikers(recipeId, recipe.userId, users);
    for (const u of pick) {
      likeRows.push({ userId: u.id, recipeId });
    }
  }
  const likeResult = await prisma.recipeLike.createMany({
    data: likeRows,
    skipDuplicates: true,
  });
  console.log(`  ${likeResult.count} likes created.`);

  console.log('Seeding a few saves…');
  const favRows: { userId: string; recipeId: string }[] = [];
  for (let i = 0; i < createdIds.length; i += 7) {
    const rid = createdIds[i];
    const recipe = await prisma.recipe.findUnique({
      where: { id: rid },
      select: { userId: true },
    });
    if (!recipe) continue;
    const saver = users.find((u) => u.id !== recipe.userId);
    if (saver) favRows.push({ userId: saver.id, recipeId: rid });
  }
  await prisma.favorite.createMany({ data: favRows, skipDuplicates: true });

  console.log('');
  console.log(`Done. ${catalog.length} recipes, ${likeResult.count} likes.`);
  console.log('Sign-in: user1@gmail.com … user8@gmail.com  |  Password: SeedUser123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
