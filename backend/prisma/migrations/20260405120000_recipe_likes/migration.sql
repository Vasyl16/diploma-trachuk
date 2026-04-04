-- CreateTable
CREATE TABLE "RecipeLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeLike_userId_recipeId_key" ON "RecipeLike"("userId", "recipeId");

-- CreateIndex
CREATE INDEX "RecipeLike_recipeId_idx" ON "RecipeLike"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeLike_userId_idx" ON "RecipeLike"("userId");

-- AddForeignKey
ALTER TABLE "RecipeLike" ADD CONSTRAINT "RecipeLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLike" ADD CONSTRAINT "RecipeLike_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing "Favorite" rows were used as both like and save; copy into likes so counts stay correct.
INSERT INTO "RecipeLike" ("id", "userId", "recipeId", "createdAt")
SELECT 'mig_' || "id", "userId", "recipeId", "createdAt"
FROM "Favorite";
