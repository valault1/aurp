import { useRef } from "react";
import { Box } from "@mui/material";
import { ARTICLE_SX } from "./tokens";

type Props = {
  html: string;
  /** Called with the Wikipedia title of whichever link the player picked. */
  onNavigate: (title: string) => void;
  /** Mid-fetch, or the run is over: links go inert. */
  locked: boolean;
};

/**
 * Renders the sanitised Wikipedia HTML and turns its `data-wiki` anchors into
 * hops. Click handling is delegated from the container, so an article with
 * 800 links still costs exactly one listener.
 */
export function ArticleView({ html, onNavigate, locked }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  const pick = (target: EventTarget | null) => {
    if (locked) return;
    const anchor = (target as HTMLElement | null)?.closest?.("a[data-wiki]");
    const title = anchor?.getAttribute("data-wiki");
    if (title) onNavigate(title);
  };

  return (
    <Box
      ref={ref}
      data-locked={locked ? "true" : "false"}
      onClick={(e) => {
        e.preventDefault();
        pick(e.target);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const anchor = (e.target as HTMLElement | null)?.closest?.("a[data-wiki]");
        if (!anchor) return;
        e.preventDefault();
        pick(e.target);
      }}
      sx={ARTICLE_SX}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
