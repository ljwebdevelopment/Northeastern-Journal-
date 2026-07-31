import type { FieldErrors } from "./profile-schema";

/** Edit Profile form state. Separate from `actions.ts`, which may only
 *  export async functions under `"use server"`. */
export interface ProfileFormState {
  status: "idle" | "saved" | "error";
  message: string;
  errors: FieldErrors;
  /** ISO timestamp of the save, used to show "Saved just now". */
  savedAt?: string;
}

export const initialProfileFormState: ProfileFormState = {
  status: "idle",
  message: "",
  errors: {},
};
