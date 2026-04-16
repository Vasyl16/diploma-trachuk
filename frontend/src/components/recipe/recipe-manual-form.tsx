"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { AlertMessage } from "@/components/feedback/alert-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";

export type RecipeManualFormValues = {
  title: string;
  ingredients: string[];
  steps: string[];
  category: string;
  tags: string[];
};

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitTags(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

type RecipeManualFormProps = {
  submitLabel: string;
  defaultTitle?: string;
  defaultIngredientsText?: string;
  defaultStepsText?: string;
  defaultCategory?: string;
  defaultTagsText?: string;
  onSubmit: (
    values: RecipeManualFormValues,
    imageFile: File | null,
  ) => Promise<void>;
};

export function RecipeManualForm({
  submitLabel,
  defaultTitle = "",
  defaultIngredientsText = "",
  defaultStepsText = "",
  defaultCategory = "",
  defaultTagsText = "",
  onSubmit,
}: RecipeManualFormProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [ingredientsText, setIngredientsText] = useState(defaultIngredientsText);
  const [stepsText, setStepsText] = useState(defaultStepsText);
  const [category, setCategory] = useState(defaultCategory);
  const [tagsText, setTagsText] = useState(defaultTagsText);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ing = splitLines(ingredientsText);
    const steps = splitLines(stepsText);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!ing.length) {
      setError("Add at least one ingredient (one per line).");
      return;
    }
    if (!steps.length) {
      setError("Add at least one step (one per line).");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(
        {
          title: title.trim(),
          ingredients: ing,
          steps,
          category: category.trim(),
          tags: splitTags(tagsText),
        },
        imageFile,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Recipe details</CardTitle>
        <CardDescription>
          One ingredient or step per line. Optional dish photo (JPEG, PNG, WebP, GIF — max 6MB).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <FormField id="title" label="Title">
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
            />
          </FormField>
          <FormField
            id="ingredients"
            label="Ingredients"
            hint="One per line."
          >
            <textarea
              id="ingredients"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              disabled={loading}
              required
            />
          </FormField>
          <FormField id="steps" label="Steps" hint="One per line.">
            <textarea
              id="steps"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[160px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              disabled={loading}
              required
            />
          </FormField>
          <FormField id="category" label="Category" hint="Optional.">
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
              placeholder="e.g. Italian, Breakfast"
            />
          </FormField>
          <FormField
            id="tags"
            label="Tags"
            hint="Comma-separated, optional."
          >
            <Input
              id="tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              disabled={loading}
              placeholder="pasta, quick, vegetarian"
            />
          </FormField>
          <FormField id="image" label="Dish image" hint="Optional.">
            <Input
              id="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImageFile(f);
              }}
            />
          </FormField>
          {error ? <AlertMessage>{error}</AlertMessage> : null}
          <Button type="submit" disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
