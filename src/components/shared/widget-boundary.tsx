"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps one broken widget from taking the page down with it.
 *
 * An article is mostly server-rendered prose surrounded by small interactive
 * pieces — the type-size control, the heart, share, the comment thread. React
 * has no partial failure: an error thrown while any one of them renders
 * unmounts the whole tree, so a reader whose browser blocks site data, or who
 * hits a bug in the share row, loses the story itself rather than the button.
 *
 * The prose is the thing readers came for and the only part that cannot be
 * retried, so the widgets are wrapped and the article is not. A widget that
 * fails renders as absent: no error text, no empty frame, nothing to explain.
 * The reader is left with the piece, missing a control they may never have
 * reached for.
 */
export class WidgetBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Swallowed for the reader, surfaced for us: this is how a widget that
    // fails only in a particular browser gets noticed at all.
    console.error("[widget] render failed:", error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
