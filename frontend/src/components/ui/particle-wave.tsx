import * as React from "react";

interface ParticleWaveProps {
  className?: string;
  dotColor?: string;
  amplitude?: number;
  frequency?: number;
}

export function ParticleWave({
  className = "",
  dotColor = "255, 255, 255",
  amplitude = 24,
  frequency = 0.04,
}: ParticleWaveProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let isVisible = true;

    // Responsive canvas resizing with DPR scaling
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Pause animation when offscreen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    // 3D Grid Parameters
    const cols = 42;
    const rows = 20;
    const spacingX = 14;
    const spacingZ = 12;

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      time += 0.02;

      const centerX = width / 2;
      const centerY = height / 2 + 10;
      const fov = 280;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // World 3D coordinates
          const x3d = (c - cols / 2) * spacingX;
          const z3d = (r - rows / 2) * spacingZ + 220; // depth

          // Multi-harmonic undulating wave math
          const wave1 = Math.sin(c * frequency + time) * amplitude;
          const wave2 = Math.cos(r * frequency * 1.5 + time * 0.8) * (amplitude * 0.6);
          const wave3 = Math.sin((c + r) * 0.05 + time * 1.2) * (amplitude * 0.4);
          const y3d = wave1 + wave2 + wave3;

          // 3D perspective projection
          const scale = fov / (fov + z3d);
          const screenX = centerX + x3d * scale;
          const screenY = centerY + (y3d - 20) * scale;

          // Depth-based size and alpha
          const alpha = Math.max(0.08, Math.min(0.9, (1 - z3d / 480) * 0.85));
          const radius = Math.max(0.6, scale * 1.6);

          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${dotColor}, ${alpha})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [dotColor, amplitude, frequency]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ background: "transparent" }}
    />
  );
}
