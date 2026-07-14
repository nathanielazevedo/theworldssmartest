"use client";

import { useEffect, useRef } from "react";
import Globe, { type GlobeInstance } from "globe.gl";
import type { MeshPhongMaterial } from "three";
import {
  altitudeFor,
  ringRadiusFor,
  type CountryFeature,
  type CountryProps,
} from "./countries";

export type Phase = "spinning" | "guessing" | "revealed";

/** The pulsing locator ring sitting on the target country. */
type Ring = { lat: number; lng: number; maxR: number };

type Props = {
  countries: CountryFeature[];
  /** The country to highlight. Null while spinning. */
  target: CountryProps | null;
  /** On a miss, the country the player wrongly picked — lit up in red. */
  wrongPick: CountryProps | null;
  phase: Phase;
};

const OCEAN = "#0e1520";
const LAND = "#2b313b";
const LAND_STROKE = "#4a515e";
const GOLD = "#ffd21e";
const EMERALD = "#10b981";
const ROSE = "#e11d48";

export default function GlobeCanvas({
  countries,
  target,
  wrongPick,
  phase,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);

  // Create the globe once. Country data never changes, so nothing here needs to
  // react to props — the second effect drives all of the per-round state.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const globe = new Globe(host, { animateIn: false })
      .backgroundColor("rgba(0,0,0,0)")
      .showGlobe(true)
      .showAtmosphere(true)
      .atmosphereColor(GOLD)
      .atmosphereAltitude(0.16)
      .polygonsData(countries)
      // Without this, hovering a country pops a tooltip with its name in it —
      // which is the entire answer.
      .polygonLabel(() => "")
      .polygonsTransitionDuration(400)
      .polygonSideColor(() => "rgba(255, 210, 30, 0.12)")
      .ringColor(() => (t: number) => `rgba(255, 210, 30, ${1 - t})`)
      .ringResolution(64)
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(700)
      .ringAltitude(0.01)
      .ringMaxRadius((r: object) => (r as Ring).maxR);

    (globe.globeMaterial() as MeshPhongMaterial).color.set(OCEAN);

    const controls = globe.controls();
    controls.enablePan = false;
    controls.autoRotateSpeed = 1.4;

    globeRef.current = globe;

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      globe.width(width).height(height);
    });
    resize.observe(host);

    return () => {
      resize.disconnect();
      globe._destructor();
      host.replaceChildren();
      globeRef.current = null;
    };
  }, [countries]);

  // Drive the round: recolor the polygons, park or spin the camera, pulse a ring.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const isTarget = (f: object) =>
      target != null && (f as CountryFeature).properties.name === target.name;
    const isWrong = (f: object) =>
      wrongPick != null &&
      (f as CountryFeature).properties.name === wrongPick.name;

    // Re-setting an accessor is what tells three-globe to re-evaluate it, so
    // these calls are the update, not just configuration.
    globe
      .polygonCapColor((f: object) => {
        if (isTarget(f)) return phase === "revealed" ? EMERALD : GOLD;
        if (isWrong(f)) return ROSE;
        return LAND;
      })
      .polygonStrokeColor((f: object) =>
        isTarget(f) || isWrong(f) ? "#ffffff" : LAND_STROKE,
      )
      .polygonAltitude((f: object) => (isTarget(f) || isWrong(f) ? 0.07 : 0.008));

    const controls = globe.controls();

    if (phase === "spinning" || !target) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 18;
      globe.ringsData([]);
      // Snapped, not tweened: a camera tween would fight autoRotate for control
      // of the camera position until it finished.
      globe.pointOfView({ altitude: 2.5 });
      return;
    }

    // Stop the spin *before* flying, for the same reason.
    controls.autoRotate = false;
    globe.pointOfView(
      { lat: target.lat, lng: target.lng, altitude: altitudeFor(target.size) },
      1500,
    );
    const ring: Ring = {
      lat: target.lat,
      lng: target.lng,
      maxR: ringRadiusFor(target.size),
    };
    globe.ringsData([ring]);
  }, [phase, target, wrongPick]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
