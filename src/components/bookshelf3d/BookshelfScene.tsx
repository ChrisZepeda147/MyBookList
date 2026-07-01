"use client";

import { Suspense } from "react";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import type { BookEntry } from "@/lib/types";
import type { ShelfLayoutState } from "@/lib/bookshelf3d/layout";
import { BookshelfCabinet } from "@/components/bookshelf3d/BookshelfCabinet";
import { BookshelfLighting } from "@/components/bookshelf3d/BookshelfLighting";
import { ShelfBooks } from "@/components/bookshelf3d/ShelfBooks";
import { VinylDecor } from "@/components/bookshelf3d/VinylDecor";
import { TurntableDecor } from "@/components/bookshelf3d/TurntableDecor";

interface BookshelfSceneProps {
  books: BookEntry[];
  layout: ShelfLayoutState;
  selectedBookId: string | null;
  onSelectBook: (book: BookEntry) => void;
  onMoveBook: (bookId: string, shelfId: string, slot: number) => void;
}

function SceneContent({
  books,
  layout,
  selectedBookId,
  onSelectBook,
  onMoveBook,
}: BookshelfSceneProps) {
  return (
    <>
      <color attach="background" args={["#2a1f18"]} />
      <fog attach="fog" args={["#2a1f18", 8, 18]} />
      <BookshelfLighting />
      <BookshelfCabinet />
      <VinylDecor />
      <TurntableDecor />
      <ShelfBooks
        books={books}
        layout={layout}
        selectedBookId={selectedBookId}
        onSelectBook={onSelectBook}
        onMoveBook={onMoveBook}
      />
      <ContactShadows
        position={[0, 0.01, 0.1]}
        opacity={0.55}
        scale={5.5}
        blur={2.8}
        far={4.5}
        color="#000000"
      />
      <Environment preset="lobby" environmentIntensity={0.35} />
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 2.35}
        maxPolarAngle={Math.PI / 2.02}
        minAzimuthAngle={-0.06}
        maxAzimuthAngle={0.06}
        minDistance={4.4}
        maxDistance={6.2}
        target={[0, 2.35, -0.05]}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

export function BookshelfScene(props: BookshelfSceneProps) {
  return (
    <Suspense fallback={null}>
      <SceneContent {...props} />
    </Suspense>
  );
}
