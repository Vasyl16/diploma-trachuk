import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Generate recipe",
  description: "Create a recipe with AI",
};

export default function NewRecipeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
