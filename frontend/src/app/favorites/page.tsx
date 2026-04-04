import { redirect } from "next/navigation";

/** @deprecated Use `/profile?tab=saved`. */
export default function FavoritesPage() {
  redirect("/profile?tab=saved");
}
