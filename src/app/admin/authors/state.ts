/** Author form state. Kept out of `actions.ts`, which may only export async
 *  functions under `"use server"`. */
export interface AuthorFormState {
  status: "idle" | "saved" | "error";
  message: string;
  errors: Record<string, string>;
  /** The slug as saved, so the form's preview links follow a URL change. */
  slug?: string;
}

export const initialAuthorFormState: AuthorFormState = {
  status: "idle",
  message: "",
  errors: {},
};
