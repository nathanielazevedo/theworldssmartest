"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";

// Create the client lazily so a missing NEXT_PUBLIC_CONVEX_URL at build /
// prerender time doesn't crash the build (new ConvexReactClient(undefined)
// throws). A real URL is still required at runtime; the placeholder only keeps
// the constructor from throwing during static prerender when the env is absent.
function makeClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    if (typeof window !== "undefined") {
      console.error(
        "NEXT_PUBLIC_CONVEX_URL is not set — the app cannot reach its backend. " +
          "Set it in your environment (or use `npx convex deploy --cmd 'npm run build'`).",
      );
    }
    return new ConvexReactClient("https://placeholder.convex.cloud");
  }
  return new ConvexReactClient(url);
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
