import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Using framer-motion as the standard for motion/react
import { Sun, Moon } from "lucide-react";

export const Sunset: React.FC = () => {
  // --- State & Refs ---
  const [position, setPosition] = useState(0); // 0 (Day) to 1 (Night)
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const initialPosition = useRef(0);

  // --- Stars Generation (Memoized to prevent flickering) ---
  const stars = useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 60,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 2,
      })),
    [],
  );

  // --- Parabolic Arc Calculation ---
  const orbX = 5 + (95 - 5) * position; // Linear: 5% to 95%
  let orbY: number;
  if (position <= 0.5) {
    const t = position * 2;
    orbY = 70 + (15 - 70) * (1 - Math.pow(1 - t, 2)); // Rise
  } else {
    const t = (position - 0.5) * 2;
    orbY = 15 + (70 - 15) * Math.pow(t, 2); // Descend
  }

  // --- Opacity Logic ---
  const sunOpacity =
    position < 0.4 ? 1 : position > 0.6 ? 0 : 1 - (position - 0.4) / 0.2;
  const moonOpacity =
    position < 0.4 ? 0 : position > 0.6 ? 1 : (position - 0.4) / 0.2;
  const starsOpacity =
    position < 0.4 ? 0 : position > 0.6 ? 1 : (position - 0.4) / 0.2;

  // --- Sky Gradient Logic ---
  const getSkyGradient = () => {
    if (position < 0.3) {
      return "linear-gradient(to bottom, #87CEEB 0%, #B0E0E6 50%, #FFE4B5 100%)";
    } else if (position < 0.6) {
      const t = (position - 0.3) / 0.3;
      const topR = Math.round(135 + (255 - 135) * t);
      const topG = Math.round(206 + (140 - 206) * t);
      const topB = Math.round(235 + (90 - 235) * t);
      const midR = Math.round(176 + (255 - 176) * t);
      const midG = Math.round(224 + (165 - 224) * t);
      const midB = Math.round(230 + (120 - 230) * t);
      const botR = 255;
      const botG = Math.round(228 - 90 * t);
      const botB = Math.round(181 - 100 * t);
      return `linear-gradient(to bottom, rgb(${topR},${topG},${topB}) 0%, rgb(${midR},${midG},${midB}) 50%, rgb(${botR},${botG},${botB}) 100%)`;
    } else {
      const t = (position - 0.6) / 0.4;
      const topR = Math.round(255 - (255 - 25) * t);
      const topG = Math.round(140 - (140 - 25) * t);
      const topB = Math.round(90 + (120 - 90) * t);
      const midR = Math.round(255 - (255 - 65) * t);
      const midG = Math.round(165 - (165 - 45) * t);
      const midB = Math.round(120 + (95 - 120) * t);
      const botR = Math.round(255 - (255 - 45) * t);
      const botG = Math.round(138 - (138 - 30) * t);
      const botB = Math.round(81 + (70 - 81) * t);
      return `linear-gradient(to bottom, rgb(${topR},${topG},${topB}) 0%, rgb(${midR},${midG},${midB}) 50%, rgb(${botR},${botG},${botB}) 100%)`;
    }
  };

  // --- Slider Track Gradient ---
  const getSliderGradient = () => {
    if (position < 0.3) return "linear-gradient(to right, #FFD700, #FFA500)";
    if (position < 0.6) {
      const t = (position - 0.3) / 0.3;
      const startG = Math.round(215 - 100 * t);
      const startB = Math.round(0 + 120 * t);
      const endG = Math.round(165 - 70 * t);
      const endB = Math.round(0 + 150 * t);
      return `linear-gradient(to right, rgb(255,${startG},${startB}), rgb(255,${endG},${endB}))`;
    }
    const t = (position - 0.6) / 0.4;
    const startR = Math.round(255 - 155 * t);
    const startG = Math.round(115 - 55 * t);
    const startB = Math.round(120 + 80 * t);
    const endR = Math.round(255 - 205 * t);
    const endG = Math.round(95 - 35 * t);
    const endB = Math.round(150 + 50 * t);
    return `linear-gradient(to right, rgb(${startR},${startG},${startB}), rgb(${endR},${endG},${endB}))`;
  };

  // --- Drag Event Handlers ---
  const handleMove = (clientX: number) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const trackWidth = rect.width;
    const deltaX = clientX - dragStartX.current;
    const deltaPosition = deltaX / trackWidth;
    let newPosition = initialPosition.current + deltaPosition;
    setPosition(Math.max(0, Math.min(1, newPosition)));
  };

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    dragStartX.current = clientX;
    initialPosition.current = position;
  };

  const handleEnd = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
      const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", handleEnd);

      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", handleEnd);
      };
    }
  }, [isDragging]);

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      {/* 1. Sky Background */}
      <div
        className="absolute inset-0 transition-colors duration-1000 ease-in-out"
        style={{ background: getSkyGradient() }}
      />

      {/* 2. Stars Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: starsOpacity }}
      >
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
            }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* 3. Horizon Line Decor */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

      {/* 4. Dynamic Title */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center w-full">
        <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl transition-all duration-500 select-none uppercase tracking-tighter">
          {position < 0.5 ? "Good Morning" : "Good Night"}
        </h1>
      </div>

      {/* 5. The Sun/Moon Orb */}
      <motion.div
        className="absolute pointer-events-none flex items-center justify-center"
        style={{
          left: `${orbX}%`,
          top: `${orbY}%`,
          transform: "translate(-50%, -50%)",
        }}
        animate={{ scale: isDragging ? 1.1 : 1 }}
      >
        {/* Sun */}
        <motion.div className="absolute" style={{ opacity: sunOpacity }}>
          <div className="relative flex items-center justify-center">
            <div className="absolute w-32 h-32 rounded-full bg-yellow-400/40 blur-3xl" />
            <Sun
              className="w-24 h-24 text-yellow-300 drop-shadow-[0_0_40px_rgba(253,224,71,0.8)]"
              fill="currentColor"
            />
          </div>
        </motion.div>

        {/* Moon */}
        <motion.div className="absolute" style={{ opacity: moonOpacity }}>
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-blue-100/20 blur-2xl" />
            <Moon
              className="w-20 h-20 text-blue-50 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              fill="currentColor"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* 6. Slider Controls */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-8">
        <div className="relative pt-10">
          {/* Track */}
          <div
            ref={sliderRef}
            className="relative h-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.2)] border border-white/20 overflow-visible"
            style={{ background: getSliderGradient() }}
          >
            {/* Handle */}
            <motion.div
              className="absolute top-1/2 w-12 h-12 rounded-full bg-white shadow-2xl cursor-grab active:cursor-grabbing border-4 border-white flex items-center justify-center"
              style={{
                left: `${position * 100}%`,
                x: "-50%",
                y: "-50%",
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onMouseDown={(e) => handleStart(e.clientX)}
              onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-100 to-white shadow-inner flex items-center justify-center">
                <div className="w-1.5 h-6 bg-gray-200 rounded-full mx-0.5" />
                <div className="w-1.5 h-6 bg-gray-200 rounded-full mx-0.5" />
              </div>
            </motion.div>
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-6 text-white text-xs font-bold tracking-widest uppercase">
            <span className="drop-shadow-lg opacity-80">Daylight</span>
            <span className="drop-shadow-lg opacity-80">Midnight</span>
          </div>
        </div>
      </div>
    </div>
  );
};
