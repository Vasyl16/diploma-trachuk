import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

import { PageShell } from '@/components/layout';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <PageShell>
      <div className="flex flex-col gap-10 py-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            Recipe Studio
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Cook smarter with AI-assisted recipes
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Generate structured recipes from ingredients and hints — powered by
            your Nest API and favourite models.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Feed</CardTitle>
              <CardDescription>
                Browse recipes published by the community.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/feed"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "inline-flex gap-2",
                )}
              >
                Open feed
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">AI generator</CardTitle>
              <CardDescription>
                Open the form, describe your dish, and get title, ingredients,
                and steps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/recipes/new"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'inline-flex gap-2',
                )}
              >
                Open generator
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
