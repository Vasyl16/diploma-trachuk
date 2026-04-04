import { RecipeDetail } from "./recipe-detail";

type Props = { params: Promise<{ recipeId: string }> };

export default async function RecipePage({ params }: Props) {
  const { recipeId } = await params;
  return <RecipeDetail key={recipeId} recipeId={recipeId} />;
}
