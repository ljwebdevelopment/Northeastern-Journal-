"use server";

/**
 * Publishing from the dashboard. Authors write and publish into any
 * section; owners can additionally publish on behalf of another author
 * and remove anyone's piece.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import { getAuthors, getCategories } from "@/lib/content/api";
import type { Article, CategorySlug } from "@/lib/content/types";
import {
  deleteArticle,
  getStoredArticle,
  saveArticle,
  uniqueSlug,
} from "@/lib/store/articles";
import { parseArticleForm } from "./schema";
import type { ArticleFormState } from "./state";

/**
 * Refreshes every surface an article can appear on. Sections appear and
 * disappear based on whether they contain anything, so publishing the
 * first piece in a section has to refresh navigation too.
 */
function revalidateArticleSurfaces(article: Article) {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath(`/category/${article.category}`);
  revalidatePath(`/article/${article.category}/${article.slug}`);
  revalidatePath(`/author/${article.authorSlug}`);
  revalidatePath("/authors");
  revalidatePath("/search");
}

async function canEditArticle(slug: string) {
  const account = await getCurrentAccount();
  if (!account) return { error: "Your session expired. Sign in again." as const };

  const existing = await getStoredArticle(slug);
  if (!existing) return { account, existing: null };

  const mine = existing.authorSlug === account.authorSlug;
  if (account.role !== "owner" && !mine) {
    return { error: "You can only edit your own articles." as const };
  }
  return { account, existing };
}

export async function saveArticleAction(
  _prev: ArticleFormState,
  formData: FormData
): Promise<ArticleFormState> {
  const account = await getCurrentAccount();
  if (!account) {
    return { status: "error", message: "Your session expired. Sign in again.", errors: {} };
  }

  const currentSlug = String(formData.get("currentSlug") ?? "").trim();
  if (currentSlug) {
    const permission = await canEditArticle(currentSlug);
    if ("error" in permission && permission.error) {
      return { status: "error", message: permission.error, errors: {} };
    }
  }

  const [categories, authors] = await Promise.all([getCategories(), getAuthors()]);
  const parsed = parseArticleForm(
    formData,
    categories.map((c) => c.slug as CategorySlug),
    authors.map((a) => a.slug)
  );

  // An author may only publish under their own byline.
  if (account.role !== "owner" && account.authorSlug) {
    parsed.values.authorSlug = account.authorSlug;
    delete parsed.errors.authorSlug;
    parsed.ok = Object.keys(parsed.errors).length === 0;
  }

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: parsed.errors,
    };
  }

  const slug = await uniqueSlug(parsed.values.title, currentSlug || undefined);

  try {
    const saved = await saveArticle({ ...parsed.values, slug });

    // Renaming produces a new slug; drop the record under the old one.
    if (currentSlug && currentSlug !== slug) {
      await deleteArticle(currentSlug);
      revalidatePath(`/article/${saved.category}/${currentSlug}`);
    }

    revalidateArticleSurfaces(saved);

    return {
      status: "saved",
      slug,
      errors: {},
      message:
        saved.status === "published"
          ? "Published. It's live on the site now."
          : "Draft saved. It stays hidden until you publish.",
    };
  } catch (error) {
    console.error("[articles] save failed", error);
    return {
      status: "error",
      message: "We couldn't save this article. Please try again.",
      errors: {},
    };
  }
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return;

  const permission = await canEditArticle(slug);
  if ("error" in permission && permission.error) return;

  const existing = await getStoredArticle(slug);
  await deleteArticle(slug);
  if (existing) revalidateArticleSurfaces(existing);

  redirect("/admin/articles");
}

/** Publish or unpublish without opening the editor. */
export async function toggleArticleStatusAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim();
  const permission = await canEditArticle(slug);
  if ("error" in permission && permission.error) return;

  const existing = await getStoredArticle(slug);
  if (!existing) return;

  const next = (existing.status ?? "published") === "published" ? "draft" : "published";
  const saved = await saveArticle({ ...existing, status: next });
  revalidateArticleSurfaces(saved);
  revalidatePath("/admin/articles");
}
