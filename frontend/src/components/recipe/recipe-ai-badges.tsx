import { Badge } from "@/components/ui/badge";

/** Shown on AI-generated recipes (feed, detail, profile). */
export function RecipeAiBadges() {
  return (
    <>
      <Badge variant="ai">AI</Badge>
      <Badge variant="aiHelp">With AI help</Badge>
    </>
  );
}
