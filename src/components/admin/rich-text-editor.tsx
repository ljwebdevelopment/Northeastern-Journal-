"use client";

import { useCallback, useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The writing surface. Deliberately restrained — the same handful of controls
 * a Medium or Ghost editor gives you, no font pickers or colour wells, because
 * every article should look like it belongs to the same newspaper.
 *
 * Emits HTML through `onChange`. The server sanitizes it again on save; this
 * component is a convenience, not a trust boundary.
 */
export function RichTextEditor({
  value,
  onChange,
  onImageRequest,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Opens the media uploader; resolves to a public URL, or null if cancelled. */
  onImageRequest?: () => Promise<string | null>;
}) {
  const editor = useEditor({
    // Required in the App Router: the editor must not render during SSR.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Placeholder.configure({
        placeholder: "Start writing the story…",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none min-h-[28rem] px-4 py-4 focus:outline-none prose-headings:font-serif prose-p:leading-relaxed",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Keep the editor in sync when the parent replaces the body wholesale
  // (importing markdown, for example).
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
    // Intentionally keyed on `value` only: reacting to `editor` would fight
    // with the user's own typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(async () => {
    if (!editor) return;
    const url = onImageRequest
      ? await onImageRequest()
      : window.prompt("Image URL", "https://");
    if (!url) return;
    const alt = window.prompt("Describe the image for screen readers", "") ?? "";
    editor.chain().focus().setImage({ src: url, alt }).run();
  }, [editor, onImageRequest]);

  if (!editor) {
    return (
      <div className="min-h-[32rem] animate-pulse rounded-xl border border-border bg-surface" />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface focus-within:border-brand">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface-muted/60 px-2 py-1.5">
        <ToolbarButton
          editor={editor}
          label="Bold"
          icon={Bold}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          editor={editor}
          label="Italic"
          icon={Italic}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          editor={editor}
          label="Strikethrough"
          icon={Strikethrough}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <Divider />

        <ToolbarButton
          editor={editor}
          label="Heading"
          icon={Heading2}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          editor={editor}
          label="Subheading"
          icon={Heading3}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />

        <Divider />

        <ToolbarButton
          editor={editor}
          label="Bulleted list"
          icon={List}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          editor={editor}
          label="Numbered list"
          icon={ListOrdered}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          editor={editor}
          label="Pull quote"
          icon={Quote}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          editor={editor}
          label="Inline code"
          icon={Code}
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />

        <Divider />

        <ToolbarButton
          editor={editor}
          label="Link"
          icon={Link2}
          active={editor.isActive("link")}
          onClick={addLink}
        />
        <ToolbarButton
          editor={editor}
          label="Insert image"
          icon={ImagePlus}
          active={false}
          onClick={addImage}
        />
        <ToolbarButton
          editor={editor}
          label="Divider"
          icon={Minus}
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton
            editor={editor}
            label="Undo"
            icon={Undo2}
            active={false}
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolbarButton
            editor={editor}
            label="Redo"
            icon={Redo2}
            active={false}
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;
}

function ToolbarButton({
  label,
  icon: Icon,
  active,
  onClick,
  disabled,
}: {
  editor: Editor;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-35",
        active ? "bg-brand text-brand-foreground" : "text-foreground/70 hover:bg-surface"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
