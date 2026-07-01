"use client";

import { Search } from "lucide-react";

export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get" role="search" className="flex max-w-md gap-2">
      <label htmlFor="search-q" className="sr-only">
        Search articles
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Search articles, authors, topics..."
          className="w-full rounded-full border border-border bg-surface py-2.5 pl-9 pr-4 text-sm outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
      >
        Search
      </button>
    </form>
  );
}
