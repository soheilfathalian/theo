"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { STATUS_COLOR, STATUS_LABEL, type Unit } from "@/lib/unit-types";
import { GLOW_LAYOUT, unitPosition } from "@/lib/unit-config";

interface Props {
  unit: Unit;
  onClick?: (unit: Unit) => void;
}

const colorCache: Record<string, THREE.Color> = {};
function getColor(hex: string): THREE.Color {
  if (!colorCache[hex]) colorCache[hex] = new THREE.Color(hex);
  return colorCache[hex];
}

export function UnitGlow({ unit, onClick }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  const targetColor = getColor(STATUS_COLOR[unit.status]);
  const position = unitPosition(unit);

  useFrame((_, delta) => {
    if (!matRef.current) return;

    // Smoothly lerp emissive color toward target
    matRef.current.emissive.lerp(targetColor, Math.min(delta * 6, 1));
    matRef.current.color.lerp(targetColor, Math.min(delta * 6, 1));

    // Pulse intensity for yellow (tutorial sent) and red (urgent)
    if (matRef.current.userData) {
      const t = matRef.current.userData.t ?? 0;
      matRef.current.userData.t = t + delta;
      const pulse = unit.status === "yellow"
        ? 0.6 + Math.sin(t * 6) * 0.3
        : unit.status === "red"
        ? 0.5 + Math.sin(t * 4) * 0.25
        : 0.65;
      matRef.current.emissiveIntensity = hovered ? pulse + 0.4 : pulse;
    }

    // Mild hover scale
    if (meshRef.current) {
      const target = hovered ? 1.12 : 1.0;
      const s = meshRef.current.scale.x;
      const ns = s + (target - s) * Math.min(delta * 10, 1);
      meshRef.current.scale.set(ns, ns, ns);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        renderOrder={999}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(unit);
        }}
      >
        <planeGeometry args={[GLOW_LAYOUT.width, GLOW_LAYOUT.height]} />
        <meshStandardMaterial
          ref={matRef}
          color={STATUS_COLOR[unit.status]}
          emissive={STATUS_COLOR[unit.status]}
          emissiveIntensity={0.65}
          toneMapped={false}
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {hovered && (
        <Html distanceFactor={6} position={[0, GLOW_LAYOUT.height / 2 + 0.15, 0.05]} center>
          <div className="pointer-events-none whitespace-nowrap rounded-md bg-black/85 px-2 py-1 text-[11px] font-medium text-white shadow-lg ring-1 ring-white/10">
            <div className="font-semibold">{unit.label}</div>
            <div className="text-[10px] text-zinc-300">
              {unit.badge ?? STATUS_LABEL[unit.status]}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
