/**
 * What the collections are made of.
 *
 * Books, videos, and conversations are the same screen with
 * different fields: a list, a form, a publish toggle, a delete. Describing them
 * as data rather than writing three near-identical CRUD screens means the list
 * page, the editor, the save action, and the delete action each exist once —
 * and adding a fourth collection later is an entry in this file.
 *
 * Newsletter issues are deliberately NOT here. They have their own composer at
 * /admin/newsletter (migration 0010), which selects articles, sends the issue,
 * and freezes a snapshot of what shipped. A generic form over a body field
 * would be a worse tool for the same job.
 *
 * Deliberately not used for articles. An article has drafts, review,
 * scheduling, announcements, SEO, and tags; forcing it through a generic form
 * would make both worse.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "html"
  | "url"
  | "image"
  | "date"
  | "number"
  | "select"
  | "author"
  | "category"
  | "slugs"
  | "dialogue";

export interface Field {
  /** The database column this writes to. */
  name: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export type CollectionType = "books" | "videos" | "conversations";

export interface CollectionDef {
  type: CollectionType;
  table: "books" | "videos" | "conversations";
  /** Plural, for headings. */
  label: string;
  /** Singular and lowercase, for sentences: "Add a book". */
  singular: string;
  /** Where the public sees one, minus the slug. */
  publicPath: string;
  /** Extra columns to show in the list, beyond title and date. */
  subtitleColumn?: string;
  fields: Field[];
}

const PUBLISHED_AT: Field = {
  name: "published_at",
  label: "Date",
  kind: "date",
  hint: "Used for ordering and shown to readers.",
};

const SORT_ORDER: Field = {
  name: "sort_order",
  label: "Pin order",
  kind: "number",
  hint: "Lower numbers come first. Leave at 0 to order by date.",
};

export const COLLECTIONS: Record<CollectionType, CollectionDef> = {
  books: {
    type: "books",
    table: "books",
    label: "Books",
    singular: "book",
    publicPath: "/books",
    subtitleColumn: "synopsis",
    fields: [
      { name: "title", label: "Title", kind: "text", required: true },
      { name: "author_id", label: "Author", kind: "author", hint: "A byline from the roster." },
      { name: "cover_url", label: "Cover", kind: "image" },
      {
        name: "synopsis",
        label: "Synopsis",
        kind: "textarea",
        hint: "What the book is about, in the publisher's sense.",
      },
      {
        name: "review_excerpt",
        label: "Review excerpt",
        kind: "textarea",
        hint: "A line or two from the Journal's review. Shown on the card.",
      },
      { name: "buy_url", label: "Where to buy", kind: "url" },
      { name: "reading_guide_url", label: "Reading guide", kind: "url" },
      PUBLISHED_AT,
      SORT_ORDER,
    ],
  },

  videos: {
    type: "videos",
    table: "videos",
    label: "Videos",
    singular: "video",
    publicPath: "/videos",
    subtitleColumn: "description",
    fields: [
      { name: "title", label: "Title", kind: "text", required: true },
      {
        name: "youtube_id",
        label: "YouTube ID",
        kind: "text",
        required: true,
        hint: "Just the id — the part after v= in the watch URL. Pasting the whole link works too.",
      },
      { name: "description", label: "Description", kind: "textarea" },
      { name: "category_id", label: "Section", kind: "category" },
      {
        name: "thumbnail_url",
        label: "Custom thumbnail",
        kind: "image",
        hint: "Optional. YouTube's own thumbnail is used when this is empty.",
      },
      { name: "playlist", label: "Playlist", kind: "text", hint: "Groups videos on the index." },
      PUBLISHED_AT,
      SORT_ORDER,
    ],
  },

  conversations: {
    type: "conversations",
    table: "conversations",
    label: "Conversations",
    singular: "conversation",
    publicPath: "/conversations",
    subtitleColumn: "excerpt",
    fields: [
      { name: "title", label: "Title", kind: "text", required: true },
      {
        name: "format",
        label: "Format",
        kind: "select",
        options: [
          { value: "dialogue", label: "Dialogue" },
          { value: "point-counterpoint", label: "Point / counterpoint" },
          { value: "interview", label: "Interview" },
          { value: "roundtable", label: "Roundtable" },
        ],
      },
      {
        name: "participants",
        label: "Participants",
        kind: "slugs",
        hint: "Author slugs, comma separated — they link to the profiles.",
      },
      { name: "excerpt", label: "Summary", kind: "textarea" },
      { name: "image_url", label: "Lead image", kind: "image" },
      {
        name: "body",
        label: "Transcript",
        kind: "dialogue",
        hint: "One turn per paragraph, starting with the speaker and a colon.",
      },
      PUBLISHED_AT,
      SORT_ORDER,
    ],
  },

};

export const COLLECTION_TYPES = Object.keys(COLLECTIONS) as CollectionType[];

export const isCollectionType = (value: string): value is CollectionType =>
  Object.prototype.hasOwnProperty.call(COLLECTIONS, value);

/**
 * Pulls the id out of whatever an editor pasted.
 *
 * People paste the watch URL, the share URL, or the embed URL far more often
 * than they paste a bare id, and silently accepting all four is cheaper than
 * an error message telling them to go and edit it themselves.
 */
export function youtubeId(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const match =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(
      value
    );
  return match ? match[1] : value;
}

/**
 * "Name: what they said" per paragraph, into ordered turns.
 *
 * A line with no colon continues the previous speaker, so a multi-paragraph
 * answer doesn't need the name repeating — which is how anyone actually types
 * up an interview.
 */
export function parseDialogue(raw: string): { speaker: string; text: string }[] {
  const turns: { speaker: string; text: string }[] = [];

  for (const line of raw.split(/\n\s*\n|\n/)) {
    const text = line.trim();
    if (!text) continue;

    // `[\s\S]` rather than `.` with the `s` flag: the build targets an older
    // ES level where dotAll isn't available.
    const match = /^([^:]{1,60}):\s*([\s\S]+)$/.exec(text);
    if (match) {
      turns.push({ speaker: match[1].trim(), text: match[2].trim() });
    } else if (turns.length > 0) {
      turns[turns.length - 1].text += `\n\n${text}`;
    } else {
      turns.push({ speaker: "", text });
    }
  }

  return turns;
}

/** The inverse, so the editor can be reopened and edited. */
export function formatDialogue(turns: { speaker: string; text: string }[]): string {
  return turns
    .map((turn) => (turn.speaker ? `${turn.speaker}: ${turn.text}` : turn.text))
    .join("\n\n");
}
