/** Login form state. Separate from `actions.ts`, which may only export
 *  async functions under `"use server"`. */
export interface LoginState {
  status: "idle" | "error";
  message: string;
}

export const initialLoginState: LoginState = { status: "idle", message: "" };
