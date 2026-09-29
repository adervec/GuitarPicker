// Next.js routing only — the actual screen lives in the FSD "pages" layer
// (src/views/tuner — named `views` rather than FSD's usual `pages` because
// Next.js itself treats a top-level `pages/` directory as the legacy Pages
// Router and will refuse to build with both routers matching the same path),
// same split the tanstack-query.md guide in Next's own bundled docs uses for
// products/[id]/page.tsx vs. product-view.tsx.
import { TunerPage } from "@/views/tuner";

export default function Page() {
  return <TunerPage />;
}
