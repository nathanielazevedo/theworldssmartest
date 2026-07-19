"use client";

import { useEffect, useState } from "react";

const KEY = "globeLight";

/**
 * Persisted "realistic light Earth" preference, shared across every globe mode
 * (play, record, spin). Starts dark to match server render, then hydrates from
 * localStorage — a one-frame flip at most.
 */
export function useLightGlobe(): [boolean, (v: boolean) => void] {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(localStorage.getItem(KEY) === "1");
  }, []);

  const set = (v: boolean) => {
    setLight(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      // Private mode / storage disabled — the toggle still works for this session.
    }
  };

  return [light, set];
}
