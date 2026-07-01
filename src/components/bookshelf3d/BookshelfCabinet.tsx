"use client";

import type * as THREE from "three";
import { useBookshelfMaterials } from "@/components/bookshelf3d/materials";
import {
  BOOKCASE_BACK_Z,
  BOOKCASE_DEPTH,
  COLUMN_CENTERS,
  COLUMN_WIDTHS,
  SHELF_Y,
  type ColumnId,
} from "@/lib/bookshelf3d/constants";

const TOTAL_W = 4.08;
const TOTAL_H = 5.6;
const DIVIDER_X = [-0.69, 0.69] as const;
const SHELF_THICK = 0.048;
const SHELF_LIP = 0.022;
const COLUMNS: ColumnId[] = ["left", "center", "right"];

function ShelfPlank({
  x,
  y,
  width,
  material,
  lipMaterial,
}: {
  x: number;
  y: number;
  width: number;
  material: THREE.MeshStandardMaterial;
  lipMaterial: THREE.MeshStandardMaterial;
}) {
  const depth = BOOKCASE_DEPTH - 0.1;
  const z = -0.1;

  return (
    <group position={[x, y, z]}>
      <mesh castShadow receiveShadow position={[0, SHELF_THICK / 2, 0]} material={material}>
        <boxGeometry args={[width - 0.05, SHELF_THICK, depth]} />
      </mesh>
      <mesh
        castShadow
        position={[0, -SHELF_LIP / 2 + 0.004, depth / 2 - 0.008]}
        material={lipMaterial}
      >
        <boxGeometry args={[width - 0.04, SHELF_LIP, 0.018]} />
      </mesh>
    </group>
  );
}

/** Built-in walnut bookcase — photographic wood, no glass doors. */
export function BookshelfCabinet() {
  const { cabinet, shelf, darkBack, knob } = useBookshelfMaterials();

  return (
    <group>
      <mesh position={[0, 2.88, BOOKCASE_BACK_Z]} receiveShadow material={darkBack}>
        <boxGeometry args={[TOTAL_W - 0.1, TOTAL_H - 0.4, 0.055]} />
      </mesh>

      {COLUMNS.map((col) => (
        <mesh
          key={col}
          position={[COLUMN_CENTERS[col], 2.88, BOOKCASE_BACK_Z + 0.02]}
          receiveShadow
          material={darkBack}
        >
          <boxGeometry args={[COLUMN_WIDTHS[col] - 0.14, TOTAL_H - 0.55, 0.04]} />
        </mesh>
      ))}

      <mesh position={[-TOTAL_W / 2 + 0.045, 2.88, -0.1]} castShadow receiveShadow material={cabinet}>
        <boxGeometry args={[0.09, TOTAL_H - 0.15, BOOKCASE_DEPTH]} />
      </mesh>
      <mesh position={[TOTAL_W / 2 - 0.045, 2.88, -0.1]} castShadow receiveShadow material={cabinet}>
        <boxGeometry args={[0.09, TOTAL_H - 0.15, BOOKCASE_DEPTH]} />
      </mesh>

      {DIVIDER_X.map((x) => (
        <mesh key={x} position={[x, 2.88, -0.08]} castShadow receiveShadow material={cabinet}>
          <boxGeometry args={[0.085, TOTAL_H - 0.42, BOOKCASE_DEPTH - 0.02]} />
        </mesh>
      ))}

      {SHELF_Y.map((y, i) => (
        <group key={i}>
          {COLUMNS.map((col) => (
            <ShelfPlank
              key={col}
              x={COLUMN_CENTERS[col]}
              y={y}
              width={COLUMN_WIDTHS[col]}
              material={shelf}
              lipMaterial={cabinet}
            />
          ))}
        </group>
      ))}

      <mesh position={[0, 5.42, -0.04]} castShadow material={cabinet}>
        <boxGeometry args={[TOTAL_W + 0.04, 0.12, BOOKCASE_DEPTH + 0.08]} />
      </mesh>
      <mesh position={[0, 5.52, 0.02]} castShadow material={cabinet}>
        <boxGeometry args={[TOTAL_W + 0.1, 0.07, BOOKCASE_DEPTH + 0.14]} />
      </mesh>

      {COLUMNS.map((col) => (
        <mesh key={`led-${col}`} position={[COLUMN_CENTERS[col], 5.28, 0.05]}>
          <boxGeometry args={[COLUMN_WIDTHS[col] - 0.2, 0.018, 0.04]} />
          <meshStandardMaterial
            color="#ffcc88"
            emissive="#ffaa55"
            emissiveIntensity={2.2}
            roughness={0.4}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.34, -0.06]} castShadow receiveShadow material={cabinet}>
        <boxGeometry args={[TOTAL_W - 0.02, 0.62, BOOKCASE_DEPTH]} />
      </mesh>
      {DIVIDER_X.map((x) => (
        <mesh key={`base-${x}`} position={[x, 0.34, -0.04]} material={darkBack}>
          <boxGeometry args={[0.06, 0.54, BOOKCASE_DEPTH - 0.14]} />
        </mesh>
      ))}
      {[-1.53, -0.51, 0.51, 1.53].map((x, i) => (
        <group key={`door-${i}`}>
          <mesh position={[x, 0.34, 0.2]} castShadow material={darkBack}>
            <boxGeometry args={[0.94, 0.5, 0.028]} />
          </mesh>
          <mesh position={[x + (x < 0 ? 0.4 : -0.4), 0.34, 0.34]} material={knob}>
            <sphereGeometry args={[0.02, 20, 20]} />
          </mesh>
        </group>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0.25]} receiveShadow>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color="#1a120c" roughness={0.92} />
      </mesh>
    </group>
  );
}
