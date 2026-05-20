-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "diet" TEXT,
ADD COLUMN     "restrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Recipe_diet_idx" ON "Recipe"("diet");
