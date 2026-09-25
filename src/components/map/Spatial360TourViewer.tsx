/**
 * Spatial360TourViewer.tsx
 * 
 * نمایشگر حرفه‌ای و فوق‌العاده روان تور ۳۶۰ درجه پانوراما (Photosphere 360 Viewer)
 * - توسعه یافته بر پایه Three.js و WebGL با فیزیک اینرسی نرم برای ماوس و لمس موبایل
 * - پشتیبانی از ژیروسکوپ گوشی (Device Orientation)
 * - هات‌اسپات‌های پرتابل سه‌بعدی متصل‌کننده اتاق‌ها و بخش‌های داخلی
 * - زوم پینچ دو انگشتی در موبایل و ویل ماوس در لپ‌تاپ
 * - سوییچر سریع بخش‌های داخلی اتاق در پایین صفحه
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Compass, 
  Sparkles, 
  RotateCcw, 
  Video, 
  Layers
} from 'lucide-react';
import { Tour360Node, Tour360Hotspot } from '../../store/useThemeAndSiteStore';
import { audioAmbiance } from '../../services/AudioAmbienceEngine';

interface Spatial360TourViewerProps {
  spaceTitle: string;
  floorCode: string;
  floorName: string;
  nodes: Tour360Node[];
  initialNodeId?: string;
  onExitToFloorPlan: () => void;
  onJumpToVideoTour?: (nodeId: string) => void;
}

interface ProjectedHotspot {
  hotspot: Tour360Hotspot;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export const Spatial360TourViewer: React.FC<Spatial360TourViewerProps> = ({
  spaceTitle,
  floorCode,
  nodes,
  initialNodeId,
  onExitToFloorPlan,
  onJumpToVideoTour,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string>(
    initialNodeId || nodes[0]?.id || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [projectedHotspots, setProjectedHotspots] = useState<ProjectedHotspot[]>([]);
  const [gyroActive, setGyroActive] = useState<boolean>(false);
  const [hasGyroSupport, setHasGyroSupport] = useState<boolean>(false);

  const currentNode = nodes.find((n) => n.id === currentNodeId) || nodes[0];

  // مراجع Three.js
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const sphereRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null>(null);
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);

  // متغیرهای فیزیک چرخش دوربین (Yaw, Pitch, Inertia)
  const isUserInteracting = useRef<boolean>(false);
  const pointerStartX = useRef<number>(0);
  const pointerStartY = useRef<number>(0);
  const lon = useRef<number>(90); // yaw
  const lat = useRef<number>(0);  // pitch
  const targetLon = useRef<number>(90);
  const targetLat = useRef<number>(0);
  const velLon = useRef<number>(0);
  const velLat = useRef<number>(0);
  const lastPointerX = useRef<number>(0);
  const lastPointerY = useRef<number>(0);
  const pinchStartDist = useRef<number>(0);
  const initialFov = useRef<number>(75);
  const autoRotateSpeed = useRef<number>(0.03);
  const lastInteractionTime = useRef<number>(Date.now());

  // بررسی پشتیبانی ژیروسکوپ در موبایل
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setHasGyroSupport(true);
    }
  }, []);

  // راه‌اندازی صحنه Three.js
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // ۱. ایجاد صحنه و دوربین
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1100);
    cameraRef.current = camera;

    // ۲. ایجاد هندسه کره معکوس ۳۶۰ درجه
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // برعکس کردن محور X تا داخل کره قابل مشاهده باشد

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // ۳. رندرر WebGL با بهترین کیفیت
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance',
      alpha: false 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    // پاکسازی محتویات قبلی و افزودن کانواس
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    textureLoaderRef.current = new THREE.TextureLoader();

    // ۴. حلقه متحرک‌سازی رندرینگ
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!cameraRef.current || !sphereRef.current || !rendererRef.current || !sceneRef.current) return;

      const now = Date.now();
      // چرخش خودکار ملایم اگر کاربر دست نزند
      if (!isUserInteracting.current && now - lastInteractionTime.current > 2500) {
        targetLon.current += autoRotateSpeed.current;
      }

      // فیزیک اینرسی نرم
      if (!isUserInteracting.current) {
        targetLon.current += velLon.current;
        targetLat.current += velLat.current;
        velLon.current *= 0.92;
        velLat.current *= 0.92;
      }

      // درون‌یابی نرم (LERP) برای استیل سینمایی
      lon.current += (targetLon.current - lon.current) * 0.15;
      lat.current += (targetLat.current - lat.current) * 0.15;

      // محدودسازی زاویه عمودی برای جلوگیری از واژگونی زاویه دید
      lat.current = Math.max(-85, Math.min(85, lat.current));
      targetLat.current = Math.max(-85, Math.min(85, targetLat.current));

      const phi = THREE.MathUtils.degToRad(90 - lat.current);
      const theta = THREE.MathUtils.degToRad(lon.current);

      cameraTargetRef.current.x = 500 * Math.sin(phi) * Math.cos(theta);
      cameraTargetRef.current.y = 500 * Math.cos(phi);
      cameraTargetRef.current.z = 500 * Math.sin(phi) * Math.sin(theta);

      cameraRef.current.lookAt(cameraTargetRef.current);
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      // به‌روزرسانی موقعیت ۲ بعدی هات‌اسپات‌های سه‌بعدی
      updateHotspotsProjection();
    };

    animate();

    // ری‌سایز ریسپانسیو پنجره
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // محاسبه موقعیت پروجکشن سه‌بعدی هات‌اسپات‌ها روی نمایشگر
  const updateHotspotsProjection = useCallback(() => {
    if (!cameraRef.current || !containerRef.current || !currentNode?.hotspots) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = cameraRef.current;

    const projected: ProjectedHotspot[] = currentNode.hotspots.map((hs) => {
      // تبدیل زاویه yaw و pitch به مختصات کارتزین کروی
      const yawRad = THREE.MathUtils.degToRad(hs.yaw);
      const pitchRad = THREE.MathUtils.degToRad(hs.pitch);

      const radius = 450;
      const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
      const y = radius * Math.sin(pitchRad);
      const z = radius * Math.cos(pitchRad) * Math.cos(yawRad);

      const vector = new THREE.Vector3(x, y, z);
      vector.project(camera);

      // بررسی اینکه آیا هات‌اسپات در دیدرس روبروی دوربین است
      const isVisible = vector.z < 1;
      const screenX = (vector.x * 0.5 + 0.5) * width;
      const screenY = (-(vector.y * 0.5) + 0.5) * height;

      return {
        hotspot: hs,
        screenX,
        screenY,
        visible: isVisible && screenX >= -40 && screenX <= width + 40 && screenY >= -40 && screenY <= height + 40,
      };
    });

    setProjectedHotspots(projected);
  }, [currentNode]);

  // بارگذاری تصویر ۳۶۰ درجه پانوراما هنگام تعویض نود
  useEffect(() => {
    if (!sphereRef.current || !textureLoaderRef.current || !currentNode?.panoramaUrl) return;

    setIsLoading(true);

    textureLoaderRef.current.load(
      currentNode.panoramaUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        if (sphereRef.current) {
          sphereRef.current.material.map = texture;
          sphereRef.current.material.needsUpdate = true;
        }
        setIsLoading(false);
      },
      undefined,
      () => {
        setIsLoading(false);
      }
    );
  }, [currentNode]);

  // رویدادهای لمسی و ماوس (Pointer Events) برای اینرسی و کشیدن روان
  const handlePointerDown = (e: React.PointerEvent) => {
    // جلوگیری از تداخل با کلیک روی هات‌اسپات‌ها و دکمه‌ها
    if ((e.target as HTMLElement).closest('button')) return;

    isUserInteracting.current = true;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    lastPointerX.current = e.clientX;
    lastPointerY.current = e.clientY;
    lastInteractionTime.current = Date.now();
    velLon.current = 0;
    velLat.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isUserInteracting.current) return;

    const deltaX = e.clientX - lastPointerX.current;
    const deltaY = e.clientY - lastPointerY.current;

    // ثبت سرعت برای فیزیک اینرسی
    velLon.current = -deltaX * 0.12;
    velLat.current = deltaY * 0.12;

    targetLon.current -= deltaX * 0.18;
    targetLat.current += deltaY * 0.18;

    lastPointerX.current = e.clientX;
    lastPointerY.current = e.clientY;
    lastInteractionTime.current = Date.now();
  };

  const handlePointerUp = () => {
    isUserInteracting.current = false;
    lastInteractionTime.current = Date.now();
  };

  // اسکرول ماوس برای زوم نرم به داخل و خارج
  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    const fov = cameraRef.current.fov + e.deltaY * 0.05;
    cameraRef.current.fov = Math.max(35, Math.min(90, fov));
    cameraRef.current.updateProjectionMatrix();
    lastInteractionTime.current = Date.now();
  };

  // زوم پینچ دو انگشتی در موبایل
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && cameraRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      if (pinchStartDist.current === 0) {
        pinchStartDist.current = dist;
        initialFov.current = cameraRef.current.fov;
      } else {
        const factor = pinchStartDist.current / dist;
        const targetFov = initialFov.current * factor;
        cameraRef.current.fov = Math.max(35, Math.min(95, targetFov));
        cameraRef.current.updateProjectionMatrix();
      }
    }
  };

  const handleTouchEnd = () => {
    pinchStartDist.current = 0;
  };

  // ریست زاویه دید
  const handleResetView = () => {
    targetLon.current = 90;
    targetLat.current = 0;
    if (cameraRef.current) {
      cameraRef.current.fov = 75;
      cameraRef.current.updateProjectionMatrix();
    }
    audioAmbiance.playTick();
  };

  // انتقال به یک نود ۳۶۰ داخلی دیگر
  const handleSwitch360Node = (nodeId: string) => {
    audioAmbiance.playTransitionChime();
    setCurrentNodeId(nodeId);
  };

  // فعال‌سازی / غیرفعال‌سازی ژیروسکوپ
  const toggleGyroscope = async () => {
    if (!gyroActive) {
      // درخواست دسترسی ژیروسکوپ در iOS 13+
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
          if (permission === 'granted') {
            setGyroActive(true);
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          }
        } catch {
          setGyroActive(false);
        }
      } else {
        setGyroActive(true);
        window.addEventListener('deviceorientation', handleDeviceOrientation);
      }
    } else {
      setGyroActive(false);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    }
  };

  const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
    if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
      targetLon.current = e.alpha;
      targetLat.current = Math.max(-85, Math.min(85, e.beta - 45));
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, []);

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* کانواس اصلی WebGL Three.js */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing w-full h-full"
      />

      {/* وضعیت لودینگ پانوراما با جلوه ظریف */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-amber-300 font-medium tracking-wide">
                در حال بارگذاری نمای ۳۶۰ درجه...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          هدر شناور: دکمه بازگشت به پلان طبقه + عنوان ظریف فضا
          ========================================================================= */}
      <header className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-6 z-40 flex items-center justify-between pointer-events-none">
        {/* دکمه خروج به پلان طبقه */}
        <button
          type="button"
          onClick={onExitToFloorPlan}
          className="pointer-events-auto group px-3.5 py-2 rounded-2xl bg-black/70 hover:bg-black/90 border border-white/20 hover:border-amber-400/80 text-white flex items-center gap-2 backdrop-blur-xl shadow-2xl transition-all cursor-pointer active:scale-95 text-xs font-semibold"
          title="بازگشت به پلان طبقه"
        >
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          <span>پلان طبقه {floorCode}</span>
        </button>

        {/* عنوان مینیمال اتاق و بخش جاری */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-xs text-neutral-300">
          <span className="font-bold text-white">{spaceTitle}</span>
          <span className="text-white/30">&bull;</span>
          <span className="text-amber-300 font-medium">{currentNode?.title}</span>
        </div>

        {/* اکشن‌های سمت راست: ژیروسکوپ، ریست ویو و پرش به ویدیو */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {hasGyroSupport && (
            <button
              type="button"
              onClick={toggleGyroscope}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border backdrop-blur-xl transition-all cursor-pointer active:scale-95 ${
                gyroActive 
                  ? 'bg-amber-400 text-neutral-950 border-white shadow-[0_0_15px_rgba(251,191,36,0.6)]' 
                  : 'bg-black/60 hover:bg-black/85 text-neutral-300 hover:text-white border-white/20'
              }`}
              title={gyroActive ? 'غیرفعال‌سازی چرخش با ژیروسکوپ گوشی' : 'فعال‌سازی چرخش ۳۶۰ درجه با حرکت گوشی'}
            >
              <Compass className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleResetView}
            className="w-10 h-10 rounded-2xl bg-black/60 hover:bg-black/85 border border-white/20 hover:border-amber-400 text-neutral-300 hover:text-white flex items-center justify-center backdrop-blur-xl transition-all cursor-pointer active:scale-95"
            title="بازنشانی زاویه دید"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {onJumpToVideoTour && (
            <button
              type="button"
              onClick={() => onJumpToVideoTour(currentNodeId)}
              className="px-3 py-2 rounded-2xl bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-neutral-950 border border-amber-400/50 flex items-center gap-1.5 backdrop-blur-xl transition-all cursor-pointer active:scale-95 text-xs font-bold"
              title="ورود به گشت سینمایی ویدیویی این بخش"
            >
              <Video className="w-4 h-4" />
              <span className="hidden md:inline">گشت ویدیویی</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          هات‌اسپات‌های پرتابل سه‌بعدی روی محیط پانوراما (3D Projected Hotspots)
          ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {projectedHotspots.map(({ hotspot, screenX, screenY, visible }) => {
          if (!visible) return null;

          return (
            <div
              key={hotspot.id}
              style={{
                transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform duration-75 group"
            >
              {/* حلقه رادار درخشان پرتال */}
              <span className="absolute -inset-3 rounded-full bg-amber-400/30 animate-ping pointer-events-none" />

              {/* دکمه ناوبری بین فضاهای داخلی اتاق */}
              <button
                type="button"
                onClick={() => handleSwitch360Node(hotspot.targetNodeId)}
                className="relative px-3 py-1.5 rounded-full bg-black/80 hover:bg-amber-400 text-amber-300 hover:text-neutral-950 border border-amber-400/80 hover:border-white flex items-center gap-2 backdrop-blur-xl shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all cursor-pointer active:scale-90"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-bold whitespace-nowrap">
                  {hotspot.title}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          سلکتور سریع بخش‌های داخلی اتاق (Sub-Rooms Switcher) در پایین صفحه
          ========================================================================= */}
      {nodes.length > 1 && (
        <div className="absolute bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/70 border border-white/15 backdrop-blur-2xl shadow-2xl max-w-full overflow-x-auto">
            <span className="hidden sm:flex items-center gap-1 px-2.5 text-[11px] text-neutral-400 border-l border-white/10 shrink-0">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>بخش‌ها:</span>
            </span>

            {nodes.map((node) => {
              const isActive = node.id === currentNodeId;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleSwitch360Node(node.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-400 text-neutral-950 font-bold shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-neutral-950' : 'bg-amber-400/70'}`} />
                  <span>{node.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
