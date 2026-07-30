import { createServerSupabase } from "@/lib/supabase/server";
import { requireNewsroomUser, canPublish } from "@/lib/auth/roles";
import { ArticleEditor } from "@/components/admin/article-editor";
import { blankArticle, loadEditorContext } from "../editor-data";

export const metadata = { title: "New Article" };

export default async function NewArticlePage() {
  const user = await requireNewsroomUser("/admin/articles/new");
  const isAdmin = user.profile.role === "admin";
  const context = await loadEditorContext(isAdmin);

  // Default the byline to the writer's own profile so a contributor never has
  // to remember to set it.
  let defaultAuthorSlug = "";
  if (user.profile.author_id) {
    const supabase = await createServerSupabase();
    const { data } = await supabase!
      .from("authors")
      .select("slug")
      .eq("id", user.profile.author_id)
      .maybeSingle();
    defaultAuthorSlug = data?.slug ?? "";
  }

  return (
    <ArticleEditor
      article={blankArticle(defaultAuthorSlug)}
      categories={context.categories}
      authors={context.authors}
      canPublish={canPublish(user.profile.role)}
      subscriberCount={context.subscriberCount}
      emailReady={context.emailReady}
    />
  );
}
