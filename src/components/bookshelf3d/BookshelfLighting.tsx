"use client";

import { COLUMN_CENTERS } from "@/lib/bookshelf3d/constants";

/** Warm integrated down-lighting like the reference cabinet photo. */
export function BookshelfLighting() {
  return (
    <>
      <ambientLight intensity={0.22} color="#fff0dc" />
      <hemisphereLight intensity={0.18} color="#ffeedd" groundColor="#1a1008" />
      <directionalLight
        position={[0.8, 5.5, 4.5]}
        intensity={0.75}
        color="#ffe4c0"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={16}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={6}
        shadow-camera-bottom={0}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-2.5, 3, 2]} intensity={0.08} color="#8a9ab8" />
      {Object.values(COLUMN_CENTERS).map((x, i) => (
        <spotLight
          key={i}
          position={[x, 5.15, 0.22]}
          angle={0.62}
          penumbra={0.92}
          intensity={28}
          color="#ffc880"
          distance={6}
          decay={2}
          castShadow
        />
      ))}
    </>
  );
}
