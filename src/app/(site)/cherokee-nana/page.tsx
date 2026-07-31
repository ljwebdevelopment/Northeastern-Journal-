import { redirect } from "next/navigation";

/**
 * Cherokee Nana is a co-founder, not the whole masthead. Her standalone
 * hub duplicated what every journalist profile now does, so this route
 * survives only to keep old links working.
 */
export default function CherokeeNanaPage() {
  redirect("/author/cherokee-nana");
}
