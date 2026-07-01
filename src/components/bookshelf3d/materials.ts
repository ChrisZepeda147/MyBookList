"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { WOOD_SHELF, WOOD_WALNUT } from "@/lib/bookshelf3d/assets";

function configureWood(map: THREE.Texture, repeatX: number, repeatY: number) {
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;
}

/** Photographic walnut materials from local Pexels textures. */
export function useBookshelfMaterials() {
  const [walnut, shelfWood] = useTexture([WOOD_WALNUT, WOOD_SHELF]);

  return useMemo(() => {
    configureWood(walnut, 1.4, 1.8);
    configureWood(shelfWood, 2.2, 0.35);

    const cabinet = new THREE.MeshStandardMaterial({
      map: walnut,
      roughness: 0.48,
      metalness: 0.03,
      color: "#8a5a38",
    });

    const shelf = new THREE.MeshStandardMaterial({
      map: shelfWood,
      roughness: 0.42,
      metalness: 0.04,
      color: "#9a6840",
    });

    const darkBack = new THREE.MeshStandardMaterial({
      map: walnut.clone(),
      roughness: 0.72,
      metalness: 0.02,
      color: "#3d2416",
    });
    darkBack.map!.repeat.set(0.9, 1.4);

    const knob = new THREE.MeshStandardMaterial({
      color: "#b8b0a8",
      roughness: 0.28,
      metalness: 0.82,
    });

    return { cabinet, shelf, darkBack, knob };
  }, [walnut, shelfWood]);
}
