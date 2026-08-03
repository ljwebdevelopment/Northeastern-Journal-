import { redirect } from "next/navigation";

/**
 * There is no "all collections" view worth building — the tabs already switch
 * between the four, and landing on a hub page would be one extra click before
 * every edit. Send people to the first tab.
 */
export default function CollectionsIndex() {
  redirect("/admin/collections/books");
}
