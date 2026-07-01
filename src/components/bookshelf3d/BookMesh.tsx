"use client";

import { Suspense, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { BookEntry } from "@/lib/types";
import { resolveCoverUrl } from "@/lib/cover-url";
import { spineColorForBook } from "@/lib/library-spine";
import { proxyImageUrl } from "@/lib/bookshelf3d/assets";
import {
  createPageBlockTexture,
  createSpineFromCover,
  createSpineLabelTexture,
} from "@/lib/bookshelf3d/textures";
import type { BookTransform } from "@/lib/bookshelf3d/layout";

interface BookMeshProps {
  book: BookEntry;
  transform: BookTransform;
  hovered: boolean;
  selected: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
  onDragStart: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: () => void;
}

function BookMeshInner({
  book,
  transform,
  hovered,
  selected,
  coverUrl,
  onPointerOver,
  onPointerOut,
  onClick,
  onDragStart,
  onDrag,
  onDragEnd,
}: BookMeshProps & { coverUrl: string | null }) {
  const spineColor = spineColorForBook(book.id);
  const dragging = useRef(false);

  const coverTexture = useTexture(
    coverUrl ? proxyImageUrl(coverUrl) : "/bookshelf/walnut.jpg",
  );
  coverTexture.colorSpace = THREE.SRGBColorSpace;

  const pageTexture = useMemo(() => createPageBlockTexture(), []);

  const spineTexture = useMemo(() => {
    if (coverUrl) {
      try {
        return createSpineFromCover(coverTexture, spineColor, book.title);
      } catch {
        return createSpineLabelTexture(book.title, spineColor);
      }
    }
    return createSpineLabelTexture(book.title, spineColor);
  }, [coverUrl, coverTexture, spineColor, book.title]);

  const edgeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1c1410", roughness: 0.88 }),
    [],
  );
  const pageMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: pageTexture,
        roughness: 0.92,
        color: "#f4efe6",
      }),
    [pageTexture],
  );
  const spineMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: spineTexture,
        roughness: 0.68,
        emissive: new THREE.Color(spineColor),
        emissiveIntensity: hovered ? 0.15 : selected ? 0.1 : 0.03,
      }),
    [spineTexture, spineColor, hovered, selected],
  );

  const materials = useMemo(
    () => [edgeMat, edgeMat, pageMat, edgeMat, spineMat, pageMat],
    [edgeMat, pageMat, spineMat],
  );

  const lift = hovered ? 0.014 : 0;
  const scale = hovered ? 1.025 : 1;

  return (
    <group
      position={[transform.x, transform.y + lift, transform.z]}
      rotation={[0, transform.rotationY, 0]}
      scale={[scale, scale, scale]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!dragging.current) onPointerOver();
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        if (!dragging.current) onPointerOut();
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!dragging.current) onClick();
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        dragging.current = true;
        onDragStart();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        document.body.style.cursor = "grabbing";
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (!dragging.current) return;
        onDrag(e.point.x, e.point.y);
      }}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        if (!dragging.current) return;
        dragging.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        onDragEnd();
        document.body.style.cursor = hovered ? "grab" : "auto";
      }}
    >
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[transform.thickness, transform.height, transform.depth]} />
      </mesh>
    </group>
  );
}

function BookMeshFallback({
  book,
  transform,
  hovered,
  onPointerOver,
  onPointerOut,
  onClick,
  onDragStart,
  onDrag,
  onDragEnd,
}: BookMeshProps) {
  const spineColor = spineColorForBook(book.id);
  const spineTexture = useMemo(
    () => createSpineLabelTexture(book.title, spineColor),
    [book.title, spineColor],
  );
  const dragging = useRef(false);
  const pageMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f4efe6", roughness: 0.9 }),
    [],
  );
  const edgeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1c1410", roughness: 0.88 }),
    [],
  );
  const spineMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: spineTexture,
        roughness: 0.7,
        emissive: new THREE.Color(spineColor),
        emissiveIntensity: hovered ? 0.12 : 0.04,
      }),
    [spineTexture, spineColor, hovered],
  );
  const materials = [edgeMat, edgeMat, pageMat, edgeMat, spineMat, pageMat];
  const lift = hovered ? 0.014 : 0;

  return (
    <group
      position={[transform.x, transform.y + lift, transform.z]}
      rotation={[0, transform.rotationY, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!dragging.current) onPointerOver();
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        if (!dragging.current) onPointerOut();
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!dragging.current) onClick();
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        dragging.current = true;
        onDragStart();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        document.body.style.cursor = "grabbing";
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (!dragging.current) return;
        onDrag(e.point.x, e.point.y);
      }}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        if (!dragging.current) return;
        dragging.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        onDragEnd();
        document.body.style.cursor = hovered ? "grab" : "auto";
      }}
    >
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[transform.thickness, transform.height, transform.depth]} />
      </mesh>
    </group>
  );
}

export function BookMesh(props: BookMeshProps) {
  const coverUrl = resolveCoverUrl(props.book.coverUrl, "modal");

  if (!coverUrl) {
    return <BookMeshFallback {...props} />;
  }

  return (
    <Suspense fallback={<BookMeshFallback {...props} />}>
      <BookMeshInner {...props} coverUrl={coverUrl} />
    </Suspense>
  );
}
