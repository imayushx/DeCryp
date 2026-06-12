"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const AnimatedShaderBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    const isLowEnd =
      isMobile &&
      (navigator.hardwareConcurrency ?? 4) <= 4 &&
      deviceMemory <= 4;

    // Skip shader entirely on low-end mobile — CSS gradient fallback in parent
    if (isLowEnd) return;

    const NUM_ITER = isMobile ? 15 : 35;
    const pixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // WebGL context creation throws on unsupported devices/drivers — without
    // this guard the whole page crashes instead of falling back to the CSS bg.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    } catch {
      return;
    }
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setPixelRatio(pixelRatio);
    container.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new THREE.Vector2(container.offsetWidth, container.offsetHeight),
        },
        iIter: { value: NUM_ITER },
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform vec2 iResolution;
        uniform float iIter;

        #define NUM_OCTAVES 3

        float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 u = fract(p);
          u = u*u*(3.0-2.0*u);
          float res = mix(
            mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
            mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
          return res * res;
        }

        float fbm(vec2 x) {
          float v = 0.0;
          float a = 0.3;
          vec2 shift = vec2(100);
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < NUM_OCTAVES; ++i) {
            v += a * noise(x);
            x = rot * x * 2.0 + shift;
            a *= 0.4;
          }
          return v;
        }

        void main() {
          vec2 shake = vec2(sin(iTime * 1.2) * 0.005, cos(iTime * 2.1) * 0.005);
          vec2 p = ((gl_FragCoord.xy + shake * iResolution.xy) - iResolution.xy * 0.5) / iResolution.y * mat2(6.0, -4.0, 4.0, 6.0);
          vec2 v;
          vec4 o = vec4(0.0);

          float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5;

          for (float i = 0.0; i < 35.0; i++) {
            if (i >= iIter) break;
            v = p + cos(i * i + (iTime + p.x * 0.08) * 0.025 + i * vec2(13.0, 11.0)) * 3.5
              + vec2(sin(iTime * 3.0 + i) * 0.003, cos(iTime * 3.5 - i) * 0.003);
            float tailNoise = fbm(v + vec2(iTime * 0.5, i)) * 0.3 * (1.0 - (i / iIter));
            vec4 auroraColors = vec4(
              0.05 + 0.15 * sin(i * 0.2 + iTime * 0.4),
              0.55 + 0.4 * cos(i * 0.3 + iTime * 0.5),
              0.45 + 0.35 * sin(i * 0.4 + iTime * 0.3),
              1.0
            );
            vec4 contrib = auroraColors * exp(sin(i * i + iTime * 0.8)) / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));
            float thinness = smoothstep(0.0, 1.0, i / iIter) * 0.6;
            o += contrib * (1.0 + tailNoise * 0.8) * thinness;
          }

          o = tanh(pow(o / 100.0, vec4(1.6)));
          gl_FragColor = o * 1.5;
        }
      `,
      transparent: true,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // On mobile, throttle to ~30fps to halve GPU load
    const targetMs = isMobile ? 33 : 16;
    let lastTime = 0;
    let frameId: number;

    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate);
      if (now - lastTime < targetMs) return;
      lastTime = now;
      material.uniforms.iTime.value += isMobile ? 0.033 : 0.016;
      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      material.uniforms.iResolution.value.set(
        container.offsetWidth,
        container.offsetHeight
      );
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      {/* Static aurora fallback — visible when WebGL is skipped or unavailable;
          the canvas renders on top of it otherwise */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 15%, rgba(0,255,136,0.07), transparent 65%), radial-gradient(ellipse 55% 45% at 75% 5%, rgba(0,212,255,0.06), transparent 60%), radial-gradient(ellipse 50% 40% at 25% 10%, rgba(168,85,247,0.04), transparent 60%)",
        }}
      />
    </div>
  );
};

export default AnimatedShaderBackground;
