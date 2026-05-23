"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/apartment.glb";

useGLTF.preload(MODEL_URL);

// Target height of the building in scene units. The glow plane layout in
// unit-config.ts is calibrated against this size, so any GLB will fit.
const TARGET_HEIGHT = 3.0;

export function BuildingModel() {
  const { scene } = useGLTF(MODEL_URL);

  const { scale, offset, info } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const fitScale = TARGET_HEIGHT / size.y;

    // After scaling, recompute where the base sits and offset so base is at Y=0
    // and center is at X=0, Z=0.
    return {
      scale: fitScale,
      offset: new THREE.Vector3(
        -center.x * fitScale,
        -box.min.y * fitScale,
        -center.z * fitScale,
      ),
      info: {
        rawSize: size.toArray(),
        rawCenter: center.toArray(),
        scale: fitScale,
      },
    };
  }, [scene]);

  // Log once for calibration (use JSON so headless logs show actual numbers)
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[theo] building auto-fit " + JSON.stringify(info));
  }

  return (
    <primitive
      object={scene}
      scale={scale}
      position={[offset.x, offset.y, offset.z]}
    />
  );
}
