import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ColorTheme } from '../utils/themes';
import { soundFx } from '../utils/audio';
import { HandsInstance, Results } from '../types/mediapipe';

interface HandCanvasProps {
  facingMode: 'user' | 'environment';
  isMirrored: boolean;
  showCameraFeed: boolean;
  currentTheme: ColorTheme;
  onTrackingStatusChange: (isTracking: boolean, handCount: number) => void;
  onError: (type: 'permission_denied' | 'not_found' | 'in_use' | 'https_required' | 'unknown', message?: string) => void;
  clearTrigger: number;
  snapshotTrigger: number;
}

interface Point {
  x: number;
  y: number;
}

interface StrokePoint extends Point {
  t: number;
}

interface Stroke {
  pts: StrokePoint[];
  hueBase: number;
  colorOverride?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  hue: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
}

interface ProcessedHand {
  pts: Point[];
  size: number;
  palm: Point;
  open: boolean;
  pinchRatio: number;
  pinchPt: Point;
}

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];

const TIPS = [4, 8, 12, 16, 20];

export const HandCanvas: React.FC<HandCanvasProps> = ({
  facingMode,
  isMirrored,
  showCameraFeed,
  currentTheme,
  onTrackingStatusChange,
  onError,
  clearTrigger,
  snapshotTrigger,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  // References for animation state
  const handsModelRef = useRef<HandsInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handsDataRef = useRef<ProcessedHand[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<[Stroke | null, Stroke | null]>([null, null]);
  const pinchStateRef = useRef<[boolean, boolean]>([false, false]);
  const chargeRef = useRef<[number, number]>([0, 0]);
  const particlesRef = useRef<Particle[]>([]);
  const ringsRef = useRef<Ring[]>([]);

  const isDetectingRef = useRef<boolean>(false);
  const lastDetectTimeRef = useRef<number>(0);
  const qualityRef = useRef<number>(0); // 0 = Full, 1 = Balanced, 2 = Eco
  const fpsCountRef = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: performance.now() });

  // Touch fallback points
  const touchPointsRef = useRef<Point[]>([]);

  // Helpers
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

  // Clear drawings when clearTrigger updates
  useEffect(() => {
    if (clearTrigger > 0) {
      strokesRef.current = [];
      particlesRef.current = [];
      ringsRef.current = [];
    }
  }, [clearTrigger]);

  // Take snapshot when snapshotTrigger updates
  useEffect(() => {
    if (snapshotTrigger > 0) {
      takeSnapshot();
    }
  }, [snapshotTrigger]);

  const takeSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    soundFx.playSnapshotSound();
    soundFx.triggerHaptic(50);

    // Create export composite canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Background: draw video or black gradient
    if (showCameraFeed && video && video.readyState >= 2) {
      exportCtx.save();
      if (isMirrored) {
        exportCtx.translate(exportCanvas.width, 0);
        exportCtx.scale(-1, 1);
      }
      exportCtx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);
      exportCtx.restore();
    } else {
      exportCtx.fillStyle = '#020617';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // Overlay stage canvas
    exportCtx.drawImage(canvas, 0, 0);

    // Watermark watermark "ABDURAZOKHOV"
    exportCtx.save();
    exportCtx.font = 'bold 22px "Outfit", sans-serif';
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    exportCtx.textAlign = 'right';
    exportCtx.fillText('ABDURAZOKHOV', exportCanvas.width - 30, exportCanvas.height - 30);
    exportCtx.font = '12px "DM Mono", monospace';
    exportCtx.fillStyle = 'rgba(0, 240, 255, 0.7)';
    exportCtx.fillText('AI GESTURE ART', exportCanvas.width - 30, exportCanvas.height - 14);
    exportCtx.restore();

    // Trigger download
    const link = document.createElement('a');
    link.download = `abdurazokhov-art-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    // Confetti celebration
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.85 },
        colors: [currentTheme.primary, currentTheme.secondary, currentTheme.accent, '#ffffff'],
      });
    } catch {
      // Ignore
    }
  }, [showCameraFeed, isMirrored, currentTheme]);

  // Particle spawner
  const spawnParticles = (x: number, y: number, count: number, opt: { hue?: number; minSp?: number; maxSp?: number; size?: number } = {}) => {
    const max = qualityRef.current === 2 ? 50 : qualityRef.current === 1 ? 120 : 250;
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= max) {
        particlesRef.current.shift();
      }
      const angle = rand(0, Math.PI * 2);
      const speed = rand(opt.minSp ?? 0.5, opt.maxSp ?? 3.5);
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: rand(0.018, 0.038),
        size: rand(1, opt.size ?? 2.8),
        hue: opt.hue ?? rand(160, 210),
      });
    }
  };

  // Convert MediaPipe coords to screen coords with mirror check
  const toScreen = (l: { x: number; y: number }, cv: { vw: number; vh: number; s: number; ox: number; oy: number }, mirrored: boolean): Point => {
    const normalizedX = mirrored ? 1 - l.x : l.x;
    return {
      x: normalizedX * cv.vw * cv.s + cv.ox,
      y: l.y * cv.vh * cv.s + cv.oy,
    };
  };

  // MediaPipe Results callback
  const onResults = useCallback((res: Results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const s = Math.max(W / vw, H / vh);
    const cv = { vw, vh, s, ox: (W - vw * s) / 2, oy: (H - vh * s) / 2 };

    const list: ProcessedHand[] = [];
    const lms = res.multiHandLandmarks || [];

    for (const lm of lms) {
      const pts = lm.map((l) => toScreen(l, cv, isMirrored));
      const size = dist(pts[0], pts[9]) || 1;
      const pd = dist(pts[4], pts[8]); // thumb tip to index tip
      const palm: Point = {
        x: (pts[0].x + pts[5].x + pts[9].x + pts[13].x + pts[17].x) / 5,
        y: (pts[0].y + pts[5].y + pts[9].y + pts[13].y + pts[17].y) / 5,
      };

      // Open palm test: all finger tips significantly further from wrist than lower joints
      let open = [
        [8, 6],
        [12, 10],
        [16, 14],
        [20, 18],
      ].every(([t, p]) => dist(pts[t], pts[0]) > dist(pts[p], pts[0]) * 1.12);
      open = open && dist(pts[4], pts[17]) > dist(pts[3], pts[17]);

      list.push({
        pts,
        size,
        palm,
        open,
        pinchRatio: pd / size,
        pinchPt: { x: (pts[4].x + pts[8].x) / 2, y: (pts[4].y + pts[8].y) / 2 },
      });
    }

    list.sort((a, b) => a.palm.x - b.palm.x);
    handsDataRef.current = list;

    onTrackingStatusChange(true, list.length);
  }, [isMirrored, onTrackingStatusChange]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError('https_required', 'Kamera uchun HTTPS talab qilinadi.');
      return false;
    }

    // Stop existing stream if switching camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraActive(true);
      }
      return true;
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      console.warn('Camera stream error:', error);
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        onError('permission_denied');
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        onError('not_found');
      } else if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
        onError('in_use');
      } else if (!window.isSecureContext) {
        onError('https_required');
      } else {
        onError('unknown', error?.message);
      }
      return false;
    }
  }, [facingMode, onError]);

  // Initialize MediaPipe Hands
  useEffect(() => {
    let isCancelled = false;

    const initHands = async () => {
      // Check if window.Hands is loaded from CDN
      let retries = 0;
      while (!window.Hands && retries < 25) {
        await new Promise((r) => setTimeout(r, 200));
        retries++;
      }

      if (!window.Hands) {
        console.error('MediaPipe Hands script failed to load from CDN.');
        setIsLoadingModel(false);
        onError('unknown', 'MediaPipe AI modeli yuklanmadi.');
        return;
      }

      try {
        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0, // Lite model for smooth mobile rendering
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        await hands.initialize();

        if (!isCancelled) {
          handsModelRef.current = hands;
          setIsLoadingModel(false);
          await startCamera();
        }
      } catch (err) {
        console.error('Hands initialization error:', err);
        if (!isCancelled) {
          setIsLoadingModel(false);
          onError('unknown', 'Modelni ishga tushirishda xatolik.');
        }
      }
    };

    initHands();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (handsModelRef.current) {
        handsModelRef.current.close().catch(() => {});
        handsModelRef.current = null;
      }
    };
  }, [onResults, onError, startCamera]);

  // Restart camera when facingMode changes
  useEffect(() => {
    if (handsModelRef.current) {
      startCamera();
    }
  }, [facingMode, startCamera]);

  // Resize canvas handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      const W = window.innerWidth;
      const H = window.innerHeight;

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => setTimeout(handleResize, 200));
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Lightning path calculation
  const boltPath = (a: Point, b: Point, disp: number, depth: number): Point[] => {
    let pts: Point[] = [a, b];
    let d = disp;
    for (let i = 0; i < depth; i++) {
      const next: Point[] = [];
      for (let j = 0; j < pts.length - 1; j++) {
        const p = pts[j];
        const q = pts[j + 1];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const off = (Math.random() - 0.5) * d;
        next.push(p, {
          x: (p.x + q.x) / 2 - (dy / len) * off,
          y: (p.y + q.y) / 2 + (dx / len) * off,
        });
      }
      next.push(pts[pts.length - 1]);
      pts = next;
      d *= 0.55;
    }
    return pts;
  };

  const drawLine = (ctx: CanvasRenderingContext2D, pts: Point[], color: string, width: number, alpha: number) => {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.stroke();
  };

  // Draw Lightning
  const drawLightning = (ctx: CanvasRenderingContext2D, a: Point, b: Point, W: number, H: number) => {
    const d = dist(a, b);
    const disp = clamp(d * 0.15, 14, 90);
    const k = clamp(1.2 - d / (Math.max(W, H) * 0.9), 0.35, 1);
    const depth = qualityRef.current === 2 ? 4 : qualityRef.current === 1 ? 5 : 6;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const layers: Array<[string, number, number]> = [
      [currentTheme.accent, 7, 0.35 * k],
      [currentTheme.primary, 3.5, 0.8 * k],
      [currentTheme.secondary, 2, 0.6 * k],
    ];

    for (const [c, w, al] of layers) {
      const main = boltPath(a, b, disp * rand(0.8, 1.2), depth);
      drawLine(ctx, main, c, w, al);

      const nb = qualityRef.current === 2 ? 0 : qualityRef.current === 1 ? 1 : 3;
      for (let i = 0; i < nb; i++) {
        const s = main[(Math.random() * (main.length - 4) | 0) + 2];
        if (!s) continue;
        const ang = rand(0, Math.PI * 2);
        const len = rand(30, 100) * k;
        drawLine(
          ctx,
          boltPath(s, { x: s.x + Math.cos(ang) * len, y: s.y + Math.sin(ang) * len }, len * 0.5, 3),
          c,
          w * 0.5,
          al * 0.8
        );
      }
    }

    // Core white center
    drawLine(ctx, boltPath(a, b, disp * 0.7, depth), '#ffffff', 1.5, 0.95);

    // Glowing endpoint energy nodes
    ctx.globalAlpha = 1;
    for (const p of [a, b]) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 36);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.3, currentTheme.glow);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 36, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Occasional sparks & sound
    if (Math.random() < 0.3) {
      soundFx.playLightningCrackle();
      soundFx.triggerHaptic(10);
    }
    if (Math.random() < 0.6) {
      const t = Math.random();
      spawnParticles(a.x + (b.x - a.x) * t + rand(-15, 15), a.y + (b.y - a.y) * t + rand(-15, 15), 1, {
        hue: rand(260, 320),
        maxSp: 2.2,
      });
    }
  };

  // Draw Hologram Hand Skeleton
  const drawHand = (ctx: CanvasRenderingContext2D, h: ProcessedHand) => {
    const p = h.pts;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Skeleton bones: outer laser glow + sharp inner bone
    ctx.beginPath();
    for (const [i, j] of CONNECTIONS) {
      ctx.moveTo(p[i].x, p[i].y);
      ctx.lineTo(p[j].x, p[j].y);
    }
    ctx.strokeStyle = currentTheme.boneColor;
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.strokeStyle = currentTheme.primary;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Joints: small tech dots
    ctx.beginPath();
    for (let i = 0; i < 21; i++) {
      if (TIPS.includes(i)) continue;
      ctx.moveTo(p[i].x + 3, p[i].y);
      ctx.arc(p[i].x, p[i].y, 3, 0, Math.PI * 2);
    }
    ctx.fillStyle = currentTheme.jointColor;
    ctx.fill();

    // Fingertips: larger glowing nodes
    ctx.beginPath();
    for (const i of TIPS) {
      ctx.moveTo(p[i].x + 5.5, p[i].y);
      ctx.arc(p[i].x, p[i].y, 5.5, 0, Math.PI * 2);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    for (const i of TIPS) {
      ctx.moveTo(p[i].x + 12, p[i].y);
      ctx.arc(p[i].x, p[i].y, 12, 0, Math.PI * 2);
    }
    ctx.fillStyle = currentTheme.boneColor;
    ctx.fill();

    // Clean cyber corner brackets around hand bounding box (NO noisy text labels!)
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const q of p) {
      if (q.x < minX) minX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.x > maxX) maxX = q.x;
      if (q.y > maxY) maxY = q.y;
    }
    minX -= 18;
    minY -= 18;
    maxX += 18;
    maxY += 18;
    const L = 14;

    ctx.beginPath();
    ctx.moveTo(minX, minY + L);
    ctx.lineTo(minX, minY);
    ctx.lineTo(minX + L, minY);
    ctx.moveTo(maxX - L, minY);
    ctx.lineTo(maxX, minY);
    ctx.lineTo(maxX, minY + L);
    ctx.moveTo(maxX, maxY - L);
    ctx.lineTo(maxX, maxY);
    ctx.lineTo(maxX - L, maxY);
    ctx.moveTo(minX + L, maxY);
    ctx.lineTo(minX, maxY);
    ctx.lineTo(minX, maxY - L);
    ctx.strokeStyle = `${currentTheme.primary}88`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.restore();
  };

  // Update Drawing Stroke State
  const updateDrawing = (now: number) => {
    const hands = handsDataRef.current;
    for (let i = 0; i < 2; i++) {
      const h = hands[i];
      if (!h) {
        pinchStateRef.current[i] = false;
        activeStrokeRef.current[i] = null;
        continue;
      }

      const wasPinching = pinchStateRef.current[i];
      const pinching = wasPinching ? h.pinchRatio < 0.44 : h.pinchRatio < 0.32;
      pinchStateRef.current[i] = pinching;

      if (pinching) {
        if (!wasPinching) {
          activeStrokeRef.current[i] = {
            pts: [],
            hueBase: (now / 18) % 360,
          };
          strokesRef.current.push(activeStrokeRef.current[i]!);
          ringsRef.current.push({ x: h.pinchPt.x, y: h.pinchPt.y, r: 4, life: 1 });
          spawnParticles(h.pinchPt.x, h.pinchPt.y, 14, { hue: activeStrokeRef.current[i]!.hueBase, maxSp: 4 });
          soundFx.playPinchChirp();
          soundFx.triggerHaptic(20);
        }

        const s = activeStrokeRef.current[i]!;
        const last = s.pts[s.pts.length - 1];
        const np: StrokePoint = { x: h.pinchPt.x, y: h.pinchPt.y, t: now };

        if (!last || Math.hypot(np.x - last.x, np.y - last.y) > 3) {
          if (last) {
            np.x = last.x * 0.35 + np.x * 0.65;
            np.y = last.y * 0.35 + np.y * 0.65;
          }
          s.pts.push(np);
          if (s.pts.length > 150) s.pts.shift();

          if (Math.random() < 0.5) {
            spawnParticles(np.x, np.y, 1, {
              hue: (s.hueBase + s.pts.length * 2) % 360,
              maxSp: 1.2,
              size: 2,
            });
          }
        }
      } else {
        activeStrokeRef.current[i] = null;
      }
    }
  };

  // Draw Stroke Trails
  const TRAIL_LIFE = 3000;
  const drawStrokes = (ctx: CanvasRenderingContext2D, now: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let si = strokesRef.current.length - 1; si >= 0; si--) {
      const s = strokesRef.current[si];
      while (s.pts.length && now - s.pts[0].t > TRAIL_LIFE) {
        s.pts.shift();
      }
      if (!s.pts.length && s !== activeStrokeRef.current[0] && s !== activeStrokeRef.current[1]) {
        strokesRef.current.splice(si, 1);
        continue;
      }

      for (let i = 1; i < s.pts.length; i++) {
        const a = s.pts[i - 1];
        const b = s.pts[i];
        const age = clamp(1 - (now - b.t) / TRAIL_LIFE, 0, 1);
        const hue = (s.hueBase + i * 2.2 + now / 40) % 360;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${age * 0.35})`;
        ctx.lineWidth = 14 * age + 2;
        ctx.stroke();

        ctx.strokeStyle = `hsla(${hue}, 100%, 78%, ${age})`;
        ctx.lineWidth = 3.5 * age + 0.8;
        ctx.stroke();
      }
    }

    // Cursor indicator rings
    const hands = handsDataRef.current;
    for (let i = 0; i < 2; i++) {
      const h = hands[i];
      if (!h) continue;
      const pinching = pinchStateRef.current[i];
      const pp = h.pinchPt;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, pinching ? 11 + Math.sin(now / 80) * 2 : 14, 0, Math.PI * 2);
      ctx.strokeStyle = pinching ? '#ffffff' : `${currentTheme.primary}66`;
      ctx.lineWidth = pinching ? 2 : 1;
      ctx.stroke();
    }

    ctx.restore();
  };

  // Draw Energy Core
  const drawEnergyCore = (ctx: CanvasRenderingContext2D, h: ProcessedHand, i: number, now: number, dt: number) => {
    const target = h.open ? 1 : 0;
    chargeRef.current[i] += (target - chargeRef.current[i]) * clamp(dt * (target ? 2.5 : 4.5), 0, 1);
    const c = chargeRef.current[i];
    if (c < 0.03) return;

    soundFx.updateChargeHum(c);
    if (c > 0.8 && Math.random() < 0.1) {
      soundFx.triggerHaptic(12);
    }

    const { x, y } = h.palm;
    const R = h.size * (0.35 + c * 0.75);
    const t = now / 1000;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Radial plasma glow
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
    g.addColorStop(0, `rgba(255, 255, 255, ${0.85 * c})`);
    g.addColorStop(0.2, `${currentTheme.secondary}${Math.round(c * 200).toString(16).padStart(2, '0')}`);
    g.addColorStop(0.5, `${currentTheme.primary}${Math.round(c * 100).toString(16).padStart(2, '0')}`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Concentric rotating tech rings
    const ringCount = qualityRef.current === 2 ? 1 : qualityRef.current === 1 ? 2 : 3;
    for (let k = 0; k < ringCount; k++) {
      const rr = R * (0.7 + k * 0.38);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * (k % 2 ? -1.4 : 1.1) + k);
      ctx.setLineDash([rr * 0.35, rr * 0.18, rr * 0.05, rr * 0.18]);
      ctx.strokeStyle = k === 1 ? `${currentTheme.accent}${Math.round(c * 220).toString(16).padStart(2, '0')}` : `${currentTheme.primary}${Math.round(c * 220).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);

    // Hexagon reticle
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-t * 0.7);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const rr = R * 0.55;
      ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.strokeStyle = `${currentTheme.secondary}${Math.round(c * 230).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // Orbiting plasma orbs
    const orbs = qualityRef.current === 2 ? 3 : 6;
    for (let k = 0; k < orbs; k++) {
      const a = t * (1.6 + k * 0.13) + k * 0.8;
      const rr = R * (0.9 + 0.35 * Math.sin(t * 2 + k));
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8, 3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${170 + k * 22}, 100%, 75%, ${c})`;
      ctx.fill();
    }

    // Lightning discharge from core to 5 fingertips
    if (c > 0.35 && qualityRef.current < 2) {
      ctx.lineJoin = 'round';
      for (const tpi of TIPS) {
        const path = boltPath({ x, y }, h.pts[tpi], 16 * c, 3);
        drawLine(ctx, path, currentTheme.primary, 1.8, 0.55 * c);
      }
    }

    // Central bright core pulse
    const pulse = 1 + Math.sin(t * 9) * 0.12;
    const n = ctx.createRadialGradient(x, y, 0, x, y, R * 0.32 * pulse);
    n.addColorStop(0, '#ffffff');
    n.addColorStop(1, 'transparent');
    ctx.globalAlpha = c;
    ctx.fillStyle = n;
    ctx.beginPath();
    ctx.arc(x, y, R * 0.32 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (c > 0.85 && Math.random() < 0.4) {
      spawnParticles(x, y, 2, { hue: rand(150, 200), maxSp: 5, minSp: 1.5 });
    }
  };

  // Draw Particles & Rings
  const drawParticlesAndRings = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.vy += 0.015;
      p.life -= p.decay;

      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life + 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life})`;
      ctx.fill();
    }

    for (let i = ringsRef.current.length - 1; i >= 0; i--) {
      const r = ringsRef.current[i];
      r.r += 3.4;
      r.life -= 0.035;
      if (r.life <= 0) {
        ringsRef.current.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${r.life})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  };

  // Main Render & Detection Loop
  useEffect(() => {
    let lastT = performance.now();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const detectInterval = isMobile ? 36 : 28; // ~28-35 FPS on mobile, smooth without freezing

    const renderLoop = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const handsModel = handsModelRef.current;

      // Detection schedule: never queue frames
      if (
        handsModel &&
        video &&
        video.readyState >= 2 &&
        !isDetectingRef.current &&
        !document.hidden &&
        now - lastDetectTimeRef.current >= detectInterval
      ) {
        isDetectingRef.current = true;
        lastDetectTimeRef.current = now;
        handsModel
          .send({ image: video })
          .catch((e) => console.warn('Detect frame dropped:', e))
          .finally(() => {
            isDetectingRef.current = false;
          });
      }

      // Drawing to canvas
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const W = canvas.clientWidth;
          const H = canvas.clientHeight;

          ctx.clearRect(0, 0, W, H);

          // Update drawing trail points
          updateDrawing(now);
          drawStrokes(ctx, now);

          // Draw tracked hands
          const hands = handsDataRef.current;
          for (let i = 0; i < hands.length; i++) {
            drawHand(ctx, hands[i]);
            if (i < 2) drawEnergyCore(ctx, hands[i], i, now, dt);
          }

          if (!hands[0]) chargeRef.current[0] *= 0.9;
          if (!hands[1]) chargeRef.current[1] *= 0.9;
          if (chargeRef.current[0] < 0.05 && chargeRef.current[1] < 0.05) {
            soundFx.updateChargeHum(0);
          }

          // Lightning arc between index fingertips if 2 hands present
          if (hands.length >= 2) {
            drawLightning(ctx, hands[0].pts[8], hands[1].pts[8], W, H);
          }

          // If touch points are active (touchscreen interaction)
          if (touchPointsRef.current.length >= 2) {
            drawLightning(ctx, touchPointsRef.current[0], touchPointsRef.current[1], W, H);
          }

          drawParticlesAndRings(ctx);
        }
      }

      // FPS tracking & automatic quality adjustment for smooth performance
      fpsCountRef.current.frames++;
      if (now - fpsCountRef.current.lastTime >= 1000) {
        const fps = Math.round((fpsCountRef.current.frames * 1000) / (now - fpsCountRef.current.lastTime));
        fpsCountRef.current.frames = 0;
        fpsCountRef.current.lastTime = now;

        if (fps < 22 && qualityRef.current < 2) {
          qualityRef.current++;
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawLightning, drawHand, updateDrawing, drawStrokes, drawEnergyCore, drawParticlesAndRings]);

  // Touch fallback event handlers so phones without camera or users who tap screen also see magic!
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const pts: Point[] = [];
      for (let i = 0; i < e.touches.length; i++) {
        pts.push({
          x: e.touches[i].clientX - rect.left,
          y: e.touches[i].clientY - rect.top,
        });
      }
      touchPointsRef.current = pts;
      if (pts.length > 0) {
        spawnParticles(pts[0].x, pts[0].y, 10, { hue: rand(170, 220), maxSp: 3 });
        soundFx.playPinchChirp();
      }
    } else {
      const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      touchPointsRef.current = [p];
      spawnParticles(p.x, p.y, 10, { hue: rand(170, 220), maxSp: 3 });
      soundFx.playPinchChirp();
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const pts: Point[] = [];
      for (let i = 0; i < e.touches.length; i++) {
        pts.push({
          x: e.touches[i].clientX - rect.left,
          y: e.touches[i].clientY - rect.top,
        });
      }
      touchPointsRef.current = pts;
      if (pts[0] && Math.random() < 0.6) {
        spawnParticles(pts[0].x, pts[0].y, 1, { hue: rand(170, 220), maxSp: 1.5 });
      }
    } else if (touchPointsRef.current.length > 0) {
      const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      touchPointsRef.current = [p];
      if (Math.random() < 0.6) {
        spawnParticles(p.x, p.y, 1, { hue: rand(170, 220), maxSp: 1.5 });
      }
    }
  };

  const handleTouchEnd = () => {
    touchPointsRef.current = [];
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* Hidden / Background Video Element */}
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        autoPlay
        muted
        className={`fixed inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${
          showCameraFeed && cameraActive ? 'opacity-40 filter contrast-125 brightness-90' : 'opacity-0'
        } ${isMirrored ? 'scale-x-[-1]' : ''}`}
      />

      {/* Cyber Grid Background (Active when camera feed is hidden or subtle) */}
      <div 
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${
          showCameraFeed ? 'opacity-30' : 'opacity-100 cyber-grid'
        }`}
      />

      {/* Vignette & Grain */}
      <div className="vignette-overlay fixed inset-0 pointer-events-none z-10" />
      <div className="grain-overlay fixed inset-0 pointer-events-none z-20" />

      {/* Main Interactive Stage Canvas */}
      <canvas
        ref={canvasRef}
        id="stage"
        className="fixed inset-0 w-full h-full block z-30 touch-none cursor-crosshair"
      />

      {/* Sleek Model Initializing Indicator */}
      {isLoadingModel && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm pointer-events-none">
          <div 
            className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin mb-4"
            style={{ borderColor: `${currentTheme.primary} transparent transparent transparent` }}
          />
          <div className="text-sm font-['Outfit'] tracking-[0.2em] uppercase text-white font-semibold">
            ABDURAZOKHOV AI
          </div>
          <div className="text-[11px] font-mono text-cyan-400/80 mt-1 animate-pulse">
            AI MODELI YUKLANMOQDA…
          </div>
        </div>
      )}
    </div>
  );
};
