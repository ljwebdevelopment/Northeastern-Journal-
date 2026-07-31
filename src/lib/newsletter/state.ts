/**
 * Form state shapes for the newsletter actions. Kept out of
 * `actions.ts` because a `"use server"` module may only export async
 * functions.
 */

export interface SubscribeState {
  status: "idle" | "success" | "error";
  message: string;
  /** True when the address was already on the list. */
  alreadySubscribed?: boolean;
}

export const initialSubscribeState: SubscribeState = { status: "idle", message: "" };

export interface UnsubscribeState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialUnsubscribeState: UnsubscribeState = { status: "idle", message: "" };
