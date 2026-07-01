"use client";

import * as THREE from "three";
import { SHELF_Y, COLUMN_CENTERS } from "@/lib/bookshelf3d/constants";

/** Sleek turntable on lower center shelf — no acrylic blur. */
export function TurntableDecor() {
  const y = SHELF_Y[4] + 0.05;
  const x = COLUMN_CENTERS.center;

  return (
    <group position={[x, y, -0.02]}>
      {/* Matte plinth */}
      <mesh castShadow receiveShadow position={[0, 0.028, 0]}>
        <boxGeometry args={[0.48, 0.056, 0.36]} />
        <meshStandardMaterial color="#141414" roughness={0.55} metalness={0.08} />
      </mesh>
      {/* Rubber mat */}
      <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.165, 0.165, 0.004, 64]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.85} />
      </mesh>
      {/* Metal platter */}
      <mesh castShadow position={[0, 0.068, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.012, 64]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.18} metalness={0.72} />
      </mesh>
      {/* Vinyl record */}
      <mesh position={[0, 0.076, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.146, 0.146, 0.003, 64]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.078, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 0.004, 32]} />
        <meshStandardMaterial color="#9a3a2a" roughness={0.65} />
      </mesh>
      {/* Open dust cover frame — no transmission blur */}
      <mesh position={[0, 0.19, -0.04]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.46, 0.2, 0.34]} />
        <meshStandardMaterial
          color="#2a2a2a"
          transparent
          opacity={0.12}
          roughness={0.15}
          metalness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Tonearm base */}
      <mesh position={[0.16, 0.075, 0.04]} castShadow>
        <cylinderGeometry args={[0.025, 0.028, 0.04, 24]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.6} />
      </mesh>
      <group position={[0.16, 0.1, 0.04]} rotation={[0, 0, -0.35]}>
        <mesh castShadow>
          <boxGeometry args={[0.17, 0.01, 0.01]} />
          <meshStandardMaterial color="#d0d0d0" metalness={0.85} roughness={0.18} />
        </mesh>
        <mesh position={[0.08, 0.02, 0]}>
          <boxGeometry args={[0.02, 0.04, 0.01]} />
          <meshStandardMaterial color="#c8c8c8" metalness={0.8} roughness={0.22} />
        </mesh>
      </group>
    </group>
  );
}
