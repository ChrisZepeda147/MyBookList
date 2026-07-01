"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { BookEntry } from "@/lib/types";
import type { ShelfLayoutState } from "@/lib/bookshelf3d/layout";
import { BookshelfScene } from "@/components/bookshelf3d/BookshelfScene";

interface BookshelfCanvasProps {
  books: BookEntry[];
  layout: ShelfLayoutState;
  selectedBookId: string | null;
  onSelectBook: (book: BookEntry) => void;
  onMoveBook: (bookId: string, shelfId: string, slot: number) => void;
}

export function BookshelfCanvas({
  books,
  layout,
  selectedBookId,
  onSelectBook,
  onMoveBook,
}: BookshelfCanvasProps) {
  return (
    <Canvas
      key="bookshelf-canvas-v2"
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2.45, 5.15], fov: 36, near: 0.1, far: 30 }}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      className="h-full w-full bg-[#2a1f18]"
      onCreated={() => {
        THREE.Cache.clear();
      }}
    >
      <BookshelfScene
        books={books}
        layout={layout}
        selectedBookId={selectedBookId}
        onSelectBook={onSelectBook}
        onMoveBook={onMoveBook}
      />
    </Canvas>
  );
}
