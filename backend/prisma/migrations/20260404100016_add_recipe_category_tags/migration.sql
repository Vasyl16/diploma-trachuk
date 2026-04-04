-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "category" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Recipe_category_idx" ON "Recipe"("category");
