/** Account page form state. Separate from `account-actions.ts`, which may
 *  only export async functions under `"use server"`. */
export type AccountFormStatus = "idle" | "saved" | "error";

export interface AccountFormState {
  status: AccountFormStatus;
  message: string;
  errors: Record<string, string>;
}

export const initialAccountFormState: AccountFormState = {
  status: "idle",
  message: "",
  errors: {},
};

/** Minimum length for a dashboard password. */
export const MIN_PASSWORD_LENGTH = 10;
