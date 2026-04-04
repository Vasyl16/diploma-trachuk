import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Recipe } from "@/types/recipe";

type RecipePreviewCardProps = {
  recipe: Recipe;
  /** Subtitle under the title */
  description?: string;
};

export function RecipePreviewCard({
  recipe,
  description = "Ingredients and steps from your last generation.",
}: RecipePreviewCardProps) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-md shadow-black/5 dark:shadow-black/20">
      <div
        className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500"
        aria-hidden
      />
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <CardTitle className="text-2xl leading-tight">{recipe.title}</CardTitle>
            {recipe.isAI ? (
              <Badge variant="ai" className="shrink-0 font-medium">
                AI Generated
              </Badge>
            ) : null}
          </div>
          <CardDescription className="text-base">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-0">
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ingredients
          </h3>
          <ul className="space-y-2 text-sm leading-relaxed text-foreground">
            {recipe.ingredients.map((line, i) => (
              <li
                key={i}
                className="flex gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Steps
          </h3>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-4 text-sm leading-relaxed text-foreground"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </CardContent>
    </Card>
  );
}
