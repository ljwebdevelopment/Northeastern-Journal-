/** Edit Profile form state. Kept out of `actions.ts`, which may only export
 *  async functions under `"use server"`. */
export interface ProfileFormState {
  status: "idle" | "saved" | "error";
  message: string;
  errors: Record<string, string>;
}

export const initialProfileFormState: ProfileFormState = {
  status: "idle",
  message: "",
  errors: {},
};
