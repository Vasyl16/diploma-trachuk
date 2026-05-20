'use client';

import { Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/forms/form-field';
import { AlertMessage } from '@/components/feedback/alert-message';

export type AiRecipeFormValues = {
  ingredients: string;
  dishType: string;
  complexity: string;
  diet: string;
  restrictions: string;
  avoidIngredients: string;
};

type AiRecipeFormCardProps = {
  values: AiRecipeFormValues;
  onChange: (field: keyof AiRecipeFormValues, value: string) => void;
  /** When true, the API also generates a dish image on the server after the recipe is saved. */
  generateImage: boolean;
  onGenerateImageChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
};

export function AiRecipeFormCard({
  values,
  onChange,
  generateImage,
  onGenerateImageChange,
  onSubmit,
  loading,
  error,
}: AiRecipeFormCardProps) {
  const busy = loading;
  const loadingLabel = generateImage
    ? 'Generating recipe and image…'
    : 'Generating recipe…';

  return (
    <Card className="border-border/80 shadow-md shadow-black/5 dark:shadow-black/20">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl">Inputs</CardTitle>
        <CardDescription>
          Comma-separated ingredients; complexity supports free text or
          suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <FormField
            id="ingredients"
            label="Ingredients"
            hint="Separate items with commas."
          >
            <Input
              id="ingredients"
              placeholder="e.g. eggs, milk, flour, butter"
              value={values.ingredients}
              onChange={(e) => onChange('ingredients', e.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormField id="dishType" label="Dish type">
            <Input
              id="dishType"
              placeholder="e.g. breakfast, pasta, soup"
              value={values.dishType}
              onChange={(e) => onChange('dishType', e.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormField
            id="complexity"
            label="Complexity"
            hint="Optional. Leave empty for the model to decide."
          >
            <Input
              id="complexity"
              list="complexity-options"
              placeholder="Type (e.g. easy) or pick from suggestions"
              value={values.complexity}
              onChange={(e) => onChange('complexity', e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
            <datalist id="complexity-options">
              <option value="easy" />
              <option value="medium" />
              <option value="hard" />
            </datalist>
          </FormField>

          <FormField
            id="ai-diet"
            label="Diet"
            hint="Optional — stored on the recipe (e.g. vegan)."
          >
            <Input
              id="ai-diet"
              placeholder="e.g. vegan, keto"
              value={values.diet}
              onChange={(e) => onChange('diet', e.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormField
            id="ai-restrictions"
            label="Dietary restrictions"
            hint="Comma-separated labels stored on the recipe."
          >
            <Input
              id="ai-restrictions"
              placeholder="gluten-free, nut-free"
              value={values.restrictions}
              onChange={(e) => onChange('restrictions', e.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormField
            id="ai-avoid"
            label="Avoid ingredients"
            hint="Comma-separated — passed to the model only (not stored as a list)."
          >
            <Input
              id="ai-avoid"
              placeholder="e.g. shellfish, peanuts, dairy"
              value={values.avoidIngredients}
              onChange={(e) => onChange('avoidIngredients', e.target.value)}
              disabled={busy}
            />
          </FormField>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
                checked={generateImage}
                onChange={(e) => onGenerateImageChange(e.target.checked)}
                disabled={busy}
              />
              <span>
                <span className="font-medium text-foreground">
                  Generate dish image
                </span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Generated on the server — no extra accounts or popups.
                </span>
              </span>
            </label>
          </div>

          {error ? <AlertMessage>{error}</AlertMessage> : null}

          <Button
            type="submit"
            disabled={busy}
            size="lg"
            className="inline-flex w-full items-center gap-2 sm:w-auto"
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" />
                {loadingLabel}
              </>
            ) : (
              <>
                <Sparkles className="size-4 opacity-90" />
                Generate Recipe
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
