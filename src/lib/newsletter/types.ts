export type SubscriberStatus = "subscribed" | "unsubscribed";

export interface Subscriber {
  /** Lowercased, trimmed address. Doubles as the record key. */
  email: string;
  status: SubscriberStatus;
  /** ISO timestamp of the original signup. */
  subscribedAt: string;
  /** ISO timestamp of the most recent status change. */
  updatedAt: string;
  unsubscribedAt?: string;
  /** Page path the signup form was submitted from. */
  source?: string;
  /**
   * Author slugs this reader follows. A reader can subscribe to the
   * Journal generally (empty) and/or to individual journalists, the way
   * Substack readers follow individual writers.
   */
  authors?: string[];
  /** Whether the welcome email was accepted by Resend. */
  welcomeEmailSent?: boolean;
}
