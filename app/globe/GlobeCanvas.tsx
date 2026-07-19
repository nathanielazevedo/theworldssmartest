"use client";

import { useEffect, useRef } from "react";
import Globe, { type GlobeInstance } from "globe.gl";
import type { MeshPhongMaterial } from "three";
import {
  altitudeFor,
  revealAltitudeFor,
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
  /** Auto-rotate speed while spinning. Higher = more dramatic whirl. */
  spinSpeed?: number;
  /** When true, the reveal pulls the camera way out to show global context. */
  revealZoomOut?: boolean;
  /** Realistic day-Earth texture instead of the stylized dark globe. */
  lightMode?: boolean;
};

// Dark globe, but with real contrast between the three layers so the country
// outlines (grid lines) actually read: a near-black ocean, a lifted slate land,
// and a distinctly brighter border. The gold highlight still out-values all of
// them, so it keeps its "spotlight on the answer" pop.
const OCEAN = "#0a0f17";
const LAND = "#333c49";
const LAND_STROKE = "#8b96a8";
const GOLD = "#ffd21e";
const EMERALD = "#10b981";
const ROSE = "#e11d48";

// Light (realistic) mode: transparent country fills so the real Earth texture
// shows through, with a subtle dark border to keep countries delineated.
const LIGHT_ATMOSPHERE = "#8ec5ff";
const LIGHT_STROKE = "rgba(12, 20, 34, 0.45)";
const TRANSPARENT = "rgba(0, 0, 0, 0)";

export default function GlobeCanvas({
  countries,
  target,
  wrongPick,
  phase,
  spinSpeed = 18,
  revealZoomOut = false,
  lightMode = false,
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
      .atmosphereColor(lightMode ? LIGHT_ATMOSPHERE : GOLD)
      .atmosphereAltitude(lightMode ? 0.2 : 0.16)
      .polygonsData(countries)
      // Without this, hovering a country pops a tooltip with its name in it —
      // which is the entire answer.
      .polygonLabel(() => "")
      .polygonsTransitionDuration(400)
      .polygonSideColor(() => "rgba(255, 210, 30, 0.18)")
      .ringColor(() => (t: number) => `rgba(255, 210, 30, ${1 - t})`)
      .ringResolution(64)
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(700)
      .ringAltitude(0.01)
      .ringMaxRadius((r: object) => (r as Ring).maxR);

    if (lightMode) globe.globeImageUrl("/earth.jpg");
    // In light mode the texture supplies the color; a white material lets it
    // show true. In dark mode the flat ocean color is the globe.
    (globe.globeMaterial() as MeshPhongMaterial).color.set(
      lightMode ? "#ffffff" : OCEAN,
    );

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
  }, [countries, lightMode]);

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
    // these calls are the update, not just configuration. In light mode the
    // non-highlighted countries are transparent so the real Earth shows through.
    globe
      .polygonCapColor((f: object) => {
        if (isTarget(f)) return phase === "revealed" ? EMERALD : GOLD;
        if (isWrong(f)) return ROSE;
        return lightMode ? TRANSPARENT : LAND;
      })
      .polygonStrokeColor((f: object) =>
        isTarget(f) || isWrong(f)
          ? "#ffffff"
          : lightMode
            ? LIGHT_STROKE
            : LAND_STROKE,
      )
      .polygonAltitude((f: object) =>
        isTarget(f) || isWrong(f) ? 0.07 : lightMode ? 0.004 : 0.008,
      );

    const controls = globe.controls();

    if (phase === "spinning" || !target) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = spinSpeed;
      globe.ringsData([]);
      // Snapped, not tweened: a camera tween would fight autoRotate for control
      // of the camera position until it finished.
      globe.pointOfView({ altitude: 2.5 });
      return;
    }

    // Stop the spin *before* flying, for the same reason. By default the camera
    // holds one framing from guessing through reveal; with revealZoomOut it
    // pulls way back on reveal for a dramatic "there it is" beat.
    controls.autoRotate = false;
    const revealing = phase === "revealed" && revealZoomOut;
    globe.pointOfView(
      {
        lat: target.lat,
        lng: target.lng,
        altitude: revealing
          ? revealAltitudeFor(target.size)
          : altitudeFor(target.size),
      },
      revealing ? 1100 : 800,
    );
    const ring: Ring = {
      lat: target.lat,
      lng: target.lng,
      maxR: ringRadiusFor(target.size),
    };
    globe.ringsData([ring]);
  }, [phase, target, wrongPick, spinSpeed, revealZoomOut, lightMode]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
