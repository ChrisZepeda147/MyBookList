"use client";

import { useMemo } from "react";
import { VINYL_DECOR, SHELF_BY_ID, SLOT_WIDTH } from "@/lib/bookshelf3d/constants";
import {
  createIconicAlbumTexture,
  createVinylDiscTexture,
} from "@/lib/bookshelf3d/textures";

const SLEEVE_SIZE = 0.303;
const SLEEVE_THICK = 0.003;

/** Fixed classic-rock vinyl with realistic sleeves + discs. */
export function VinylDecor() {
  return (
    <group>
      {VINYL_DECOR.map((vinyl) => {
        const shelf = SHELF_BY_ID[vinyl.shelfId];
        if (!shelf) return null;
        return (
          <VinylRecord
            key={`${vinyl.shelfId}-${vinyl.artist}-${vinyl.slotOffset}`}
            vinyl={vinyl}
            shelf={shelf}
          />
        );
      })}
    </group>
  );
}

function VinylRecord({
  vinyl,
  shelf,
}: {
  vinyl: (typeof VINYL_DECOR)[number];
  shelf: NonNullable<(typeof SHELF_BY_ID)[string]>;
}) {
  const coverTex = useMemo(
    () => createIconicAlbumTexture(vinyl.artKey),
    [vinyl.artKey],
  );
  const discTex = useMemo(() => createVinylDiscTexture(), []);

  const startX = shelf.x - shelf.width / 2 + SLOT_WIDTH * 0.65;
  const x = startX + vinyl.slotOffset * SLOT_WIDTH;
  const y = shelf.y + SLEEVE_SIZE / 2 + 0.024;
  const leanZ = vinyl.leanZ ?? 0;

  if (vinyl.faceForward) {
    return (
      <group
        position={[x, y, -0.04 + leanZ]}
        rotation={[0, vinyl.rotationY, 0]}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[SLEEVE_SIZE, SLEEVE_SIZE, SLEEVE_THICK]} />
          <meshStandardMaterial map={coverTex} roughness={0.78} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0, -0.004]}>
          <boxGeometry args={[SLEEVE_SIZE - 0.01, SLEEVE_SIZE - 0.01, 0.001]} />
          <meshStandardMaterial color="#e8e0d4" roughness={0.95} />
        </mesh>
      </group>
    );
  }

  return (
    <group
      position={[x, y, -0.05 + leanZ]}
      rotation={[0, vinyl.rotationY + Math.PI / 2, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[SLEEVE_THICK, SLEEVE_SIZE, SLEEVE_SIZE]} />
        <meshStandardMaterial color="#e8e0d4" roughness={0.9} />
      </mesh>
      <mesh position={[SLEEVE_THICK / 2 + 0.0008, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SLEEVE_SIZE, SLEEVE_SIZE]} />
        <meshStandardMaterial map={coverTex} roughness={0.75} />
      </mesh>
      <mesh position={[SLEEVE_THICK / 2 + 0.006, 0, 0.04]} rotation={[0, 0, vinyl.rotationY * 0.5]}>
        <cylinderGeometry args={[0.146, 0.146, 0.0025, 48]} />
        <meshStandardMaterial map={discTex} roughness={0.35} metalness={0.08} />
      </mesh>
    </group>
  );
}
