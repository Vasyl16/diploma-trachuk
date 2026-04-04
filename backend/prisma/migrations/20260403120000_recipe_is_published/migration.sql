-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Recipe_isPublished_createdAt_idx" ON "Recipe"("isPublished", "createdAt");
