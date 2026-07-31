import type { ArticleFieldErrors } from "./schema";

/** Article editor form state. Kept out of `actions.ts`, which may only
 *  export async functions under `"use server"`. */
export interface ArticleFormState {
  status: "idle" | "saved" | "error";
  message: string;
  errors: ArticleFieldErrors;
  /** Slug of the saved article, so a new piece can redirect to itself. */
  slug?: string;
}

export const initialArticleFormState: ArticleFormState = {
  status: "idle",
  message: "",
  errors: {},
};
