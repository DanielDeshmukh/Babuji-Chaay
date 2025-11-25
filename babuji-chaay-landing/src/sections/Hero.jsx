import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float, Stage, useGLTF } from "@react-three/drei";
import { motion } from "framer-motion";
import { Suspense } from "react";

// ☕ Custom 3D Teacup Model Component
function TeacupModel() {
  const { scene } = useGLTF("/models/teacup.glb"); // <-- place model in public/models/
  return <primitive object={scene} scale={1.8} position={[0, -0.5, 0]} />;
}

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-[hsl(var(--background))]">
      {/* 3D Scene */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 6, 5]} intensity={1.2} />
          <Suspense fallback={null}>
            <Stage environment="sunset" intensity={0.7}>
              <Float speed={2} rotationIntensity={1.2} floatIntensity={1.4}>
                <TeacupModel />
              </Float>
            </Stage>
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      {/* Text Overlay */}
      <div className="relative z-10 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-yellow-500 to-green-700 bg-clip-text text-transparent drop-shadow-lg tracking-tight"
        >
          Babuji Chaay
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-lg md:text-xl text-[hsl(var(--foreground))] mt-4 opacity-85 font-medium"
        >
          India’s Smart POS for Cafés & Tea Houses
        </motion.p>

        {/* Scroll Indicator */}
        <motion.div
          className="mt-16"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-2xl text-[hsl(var(--foreground))] opacity-80">↓</span>
        </motion.div>
      </div>
    </section>
  );
}

// 🫖 Preload model
useGLTF.preload("/models/teacup.glb");
