"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { BuildingModel } from "./building-model";
import { UnitGlow } from "./unit-glow";
import type { Unit } from "@/lib/unit-types";

interface Props {
  units: Unit[];
  onUnitClick?: (unit: Unit) => void;
}

export function BuildingScene({ units, onUnitClick }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 2.5, 9], fov: 42 }}
      shadows
      dpr={[1, 2]}
      className="!h-full !w-full"
    >
      <color attach="background" args={["#0a0b14"]} />
      <fog attach="fog" args={["#0a0b14", 10, 22]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 7, 5]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 3, 3]} intensity={0.45} color="#7dd3fc" />

      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={0.4} />
        <group>
          <BuildingModel />
          {units.map((u) => (
            <UnitGlow key={u.id} unit={u} onClick={onUnitClick} />
          ))}
        </group>
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1.5, 0]}
      />
    </Canvas>
  );
}
