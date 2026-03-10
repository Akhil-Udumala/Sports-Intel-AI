import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';

const PlayerVisual = ({ color = "#0ea5e9" }) => {
    const mesh = useRef();

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Sphere args={[1, 100, 100]} scale={1.5}>
                <MeshDistortMaterial
                    color={color}
                    attach="material"
                    distort={0.4}
                    speed={2}
                    roughness={0}
                    metalness={1}
                />
            </Sphere>
        </Float>
    );
};

const Player3DHighlight = ({ color }) => {
    return (
        <div className="h-full w-full relative">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} />
                <PlayerVisual color={color} />
                <OrbitControls enableZoom={false} autoRotate />
            </Canvas>
            <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
                <p className="text-xs text-slate-400 uppercase tracking-widest">Performance Aura</p>
            </div>
        </div>
    );
};

export default Player3DHighlight;
