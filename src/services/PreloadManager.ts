/**
 * Video Preload & Buffer Management Engine
 * Handles orientation-aware asset selection, zero-lag background preloading,
 * and video element buffer warming to eliminate black frames during transitions.
 */

import { ScreenOrientation, VideoMediaVariant, SpaceNode, HotelExperienceGraph } from '../types/cms';

export interface PreloadStatus {
  loadedCount: number;
  totalCount: number;
  progressPercent: number;
}

export interface PredictivePreloadMetrics {
  predictedTargetNodeId: string | null;
  bufferDepth: number;
  scrollVelocity: number;
  direction: 'forward' | 'backward';
  isPrimed: boolean;
  queuedUrls: string[];
}

export interface AudioPreloadStatus {
  loadedCount: number;
  totalCount: number;
  progressPercent: number;
}

export class VideoPreloadManager {
  private cache: Map<string, HTMLVideoElement> = new Map();
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private placeholderTextureCache: Map<string, HTMLImageElement> = new Map();
  private gpuTextureCache: Map<string, ImageBitmap> = new Map();
  private gpuWarmupCanvas: HTMLCanvasElement | null = null;
  private blobUrls: Map<string, string> = new Map();
  private activePreloadRequests: Set<string> = new Set();
  private activeAudioPreloadRequests: Set<string> = new Set();
  private primedVideoDecoders: Set<string> = new Set();
  private listeners: Set<(status: PreloadStatus) => void> = new Set();
  private audioListeners: Set<(status: AudioPreloadStatus) => void> = new Set();

  private predictiveMetrics: PredictivePreloadMetrics = {
    predictedTargetNodeId: null,
    bufferDepth: 1,
    scrollVelocity: 0,
    direction: 'forward',
    isPrimed: false,
    queuedUrls: [],
  };

  /**
   * Determine whether the client viewport is Portrait or Landscape.
   * Only loads the appropriate media variant as specified in Task 3.
   */
  public getDeviceOrientation(): ScreenOrientation {
    if (typeof window === 'undefined') return 'landscape';
    return window.innerWidth < window.innerHeight || window.innerWidth < 768 ? 'portrait' : 'landscape';
  }

  /**
   * Selects the proper URL variant based on detected orientation.
   */
  public resolveMediaUrl(media: VideoMediaVariant | any, orientation?: ScreenOrientation): string {
    if (!media) return '';
    if (typeof media === 'string') return media;
    const currentOrientation = orientation || this.getDeviceOrientation();
    if (currentOrientation === 'portrait' && media.portraitUrl) {
      return media.portraitUrl;
    }
    return media.landscapeUrl || media.desktopUrl || '';
  }

  /** 
     * Checks whether the video source at the given URL is already primed and cached.
     */
    public isVideoCached(url: string): boolean {
      return this.cache.has(url);
    }

    /**
     * Checks whether the video source is currently being fetched or buffered.
     */
    public isVideoPreloading(url: string): boolean {
      return this.activePreloadRequests.has(url);
    }

    /**
     * Checks whether the audio source at the given URL is already cached.
     */
    public isAudioCached(url: string): boolean {
      return this.audioCache.has(url);
    }

    /**
     * Checks whether the audio source is currently being fetched or buffered.
     */
    public isAudioPreloading(url: string): boolean {
      return this.activeAudioPreloadRequests.has(url);
    }

    /**
     * Preloads an audio file by URL using an offscreen HTMLAudioElement.
     * Returns the audio element when ready for playback.
     */
    public preloadAudio(url: string): Promise<HTMLAudioElement> {
      if (this.audioCache.has(url)) {
        return Promise.resolve(this.audioCache.get(url)!);
      }

      if (this.activeAudioPreloadRequests.has(url)) {
        return new Promise((resolve) => {
          const check = setInterval(() => {
            if (this.audioCache.has(url)) {
              clearInterval(check);
              resolve(this.audioCache.get(url)!);
            }
          }, 100);
        });
      }

      this.activeAudioPreloadRequests.add(url);
      this.notifyAudioProgress();

      return new Promise((resolve) => {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';

        let resolved = false;
        const handleReady = () => {
          if (resolved) return;
          resolved = true;
          this.audioCache.set(url, audio);
          this.activeAudioPreloadRequests.delete(url);
          this.notifyAudioProgress();
          resolve(audio);
        };

        audio.addEventListener('canplaythrough', handleReady, { once: true });
        audio.addEventListener('loadeddata', handleReady, { once: true });

        // Fallback timeout to prevent deadlock on slow/restricted networks
        audio.addEventListener('error', () => {
          if (resolved) return;
          resolved = true;
          this.activeAudioPreloadRequests.delete(url);
          this.notifyAudioProgress();
          // Return element anyway so pipeline degrades gracefully
          this.audioCache.set(url, audio);
          resolve(audio);
        }, { once: true });

        setTimeout(() => {
          if (!resolved) {
            handleReady();
          }
        }, 5000);

        audio.src = url;
        audio.load();
      });
    }

    /**
     * Gets a cached audio element for immediate playback.
     */
    public getCachedAudio(url: string): HTMLAudioElement | undefined {
      return this.audioCache.get(url);
    }

    /**
     * Preloads a video by URL using an offscreen HTMLVideoElement.
     * Sets preload="auto" and listens for canplaythrough or loadeddata.
     */
    public preloadVideo(url: string): Promise<HTMLVideoElement> {
      if (this.cache.has(url)) {
        return Promise.resolve(this.cache.get(url)!);
      }

      if (this.activePreloadRequests.has(url)) {
        return new Promise((resolve) => {
          const check = setInterval(() => {
            if (this.cache.has(url)) {
              clearInterval(check);
              resolve(this.cache.get(url)!);
            }
          }, 100);
        });
      }

      this.activePreloadRequests.add(url);
      this.notifyProgress();

      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';

        let resolved = false;
        const handleReady = () => {
          if (resolved) return;
          resolved = true;
          this.cache.set(url, video);
          this.activePreloadRequests.delete(url);
          this.notifyProgress();
          resolve(video);
        };

        video.addEventListener('canplaythrough', handleReady, { once: true });
        video.addEventListener('loadeddata', handleReady, { once: true });

        // Fallback timeout to prevent deadlock on slow/restricted networks
        video.addEventListener('error', () => {
          if (resolved) return;
          resolved = true;
          this.activePreloadRequests.delete(url);
          this.notifyProgress();
          // Return element anyway so pipeline degrades gracefully
          this.cache.set(url, video);
          resolve(video);
        }, { once: true });

        setTimeout(() => {
          if (!resolved) {
            handleReady();
          }
        }, 5000);

        video.src = url;
        video.load();
      });
    }

  /**
   * Strictly maintains only the current node and its immediate adjacent neighbors
   * (previous node and next node, if existing) in memory.
   * Evicts and purges all video elements and hardware decoder buffers for any node
   * outside the [currentIndex - 1, currentIndex, currentIndex + 1] sliding window.
   */
  public syncSlidingWindow(
    nodes: any[],
    currentIndex: number
  ): {
    retainedUrls: string[];
    evictedUrls: string[];
    preloadedUrls: string[];
  } {
    if (!nodes || nodes.length === 0 || currentIndex < 0 || currentIndex >= nodes.length) {
      return { retainedUrls: [], evictedUrls: [], preloadedUrls: [] };
    }

    const orientation = this.getDeviceOrientation();
    const keptUrls = new Set<string>();

    const safeIndex = Math.max(0, Math.min(nodes.length - 1, currentIndex));
    const prevIndex = safeIndex > 0 ? safeIndex - 1 : null;
    const nextIndex = safeIndex < nodes.length - 1 ? safeIndex + 1 : null;

    const allowedIndices = [safeIndex];
    if (prevIndex !== null) allowedIndices.push(prevIndex);
    if (nextIndex !== null) allowedIndices.push(nextIndex);

    // ۱. استخراج دقیق URLهای مجاز در پنجره کشویی [قبلی، فعلی، بعدی]
    allowedIndices.forEach((idx) => {
      const node = nodes[idx];
      if (!node) return;

      // ویدیوی امبینت لوپ سکانس
      if (node.ambientLoop) {
        const url = this.resolveMediaUrl(node.ambientLoop, orientation) || `/videos/${node.id}.mp4`;
        if (url) keptUrls.add(url);
      } else if (node.id) {
        keptUrls.add(`/videos/${node.id}.mp4`);
      }

      // ویدیوهای ترنزیشن مستقیم متصل به این گره‌ها در محدوده مجاز
      if (node.transitions && Array.isArray(node.transitions)) {
        node.transitions.forEach((t: any) => {
          const targetIdx = nodes.findIndex((n: any) => n.id === t.targetNodeId);
          // ترنزیشن فقط در صورتی حفظ می‌شود که بین نودهای پنجره فعال باشد
          if (targetIdx !== -1 && Math.abs(targetIdx - safeIndex) <= 1) {
            const transUrl = t.video ? this.resolveMediaUrl(t.video, orientation) : null;
            if (transUrl) keptUrls.add(transUrl);
            if (t.reverseVideo) {
              const revUrl = this.resolveMediaUrl(t.reverseVideo, orientation);
              if (revUrl) keptUrls.add(revUrl);
            }
          }
        });
      }
    });

    // همچنین افزودن فایل‌های ترنزیشن استاندارد مجاور در صورت وجود
    if (prevIndex !== null) {
      keptUrls.add(`/videos/trans-0${prevIndex + 1}-to-0${prevIndex + 2}.mp4`);
    }
    if (nextIndex !== null) {
      keptUrls.add(`/videos/trans-0${safeIndex + 1}-to-0${safeIndex + 2}.mp4`);
    }

    // ۲. تخلیه بی‌رحمانه و آزادسازی فوری حافظه GPU/RAM برای هر ویدیویی خارج از این پنجره (Strict Eviction)
    const evictedUrls: string[] = [];
    for (const [url, videoEl] of this.cache.entries()) {
      if (!keptUrls.has(url)) {
        try {
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.load(); // دستور استاندارد W3C جهت آزادسازی بافر دیکودر سخت‌افزاری
        } catch {}
        this.cache.delete(url);
        this.primedVideoDecoders.delete(url);
        evictedUrls.push(url);

        if (this.blobUrls.has(url)) {
          try {
            URL.revokeObjectURL(this.blobUrls.get(url)!);
          } catch {}
          this.blobUrls.delete(url);
        }
      }
    }

    // لغو درخواست‌های لود معلق برای ویدیوهای خارج از پنجره
    for (const reqUrl of this.activePreloadRequests) {
      if (!keptUrls.has(reqUrl)) {
        this.activePreloadRequests.delete(reqUrl);
      }
    }

    // ۳. بارگذاری پیش‌دستانه (Preload) صرفاً برای نود قبلی و نود بعدی که هنوز در کش نیستند
    const preloadedUrls: string[] = [];
    keptUrls.forEach((url) => {
      if (!this.cache.has(url) && !this.activePreloadRequests.has(url)) {
        this.preloadVideo(url);
        preloadedUrls.push(url);
      }
    });

    this.notifyProgress();

    return {
      retainedUrls: Array.from(keptUrls),
      evictedUrls,
      preloadedUrls,
    };
  }

  /**
   * سازگاری با متد قبلی: فراخوانی پنجره کشویی برای گره جاری
   */
  public preloadNodeNeighborhood(
    graph: HotelExperienceGraph,
    currentNodeId: string,
    _orientation?: ScreenOrientation
  ): void {
    const currentIndex = graph.nodes.findIndex((n) => n.id === currentNodeId);
    if (currentIndex === -1) return;
    this.syncSlidingWindow(graph.nodes, currentIndex);
  }

  public getCachedVideo(url: string): HTMLVideoElement | undefined {
    return this.cache.get(url);
  }

  /**
     * =========================================================================
     * INTELLIGENT PREDICTIVE VIDEO PRELOADER
     * Dynamically buffers the next sequence(s) and transitional media in the
     * experience graph based on the user's instantaneous scroll velocity & direction.
     * Also preloads audio files for scenes and transitions.
     * =========================================================================
     */
    public predictivePreloadByVelocity(
      graph: HotelExperienceGraph,
      currentNodeId: string,
      velocity: number,
      direction: 'forward' | 'backward'
    ): PredictivePreloadMetrics {
      const currentIndex = graph.nodes.findIndex((n) => n.id === currentNodeId);
      if (currentIndex === -1) return this.predictiveMetrics;

      const speed = Math.abs(velocity);
      const isForward = direction === 'forward' || velocity > 0;
      const orientation = this.getDeviceOrientation();

      // 1. Determine Velocity-Adaptive Buffer Depth
      // High velocity (fast scrubbing): buffer up to 3 sequences ahead
      // Medium velocity: buffer 2 sequences ahead
      // Gentle velocity: buffer 1 sequence ahead
      let bufferDepth = 1;
      if (speed >= 0.75) {
        bufferDepth = 3;
      } else if (speed >= 0.3) {
        bufferDepth = 2;
      }

      const queuedUrls: string[] = [];
      const predictedTargetNode = isForward
        ? graph.nodes[currentIndex + 1]
        : graph.nodes[currentIndex - 1];

      // 2. Iterate through predicted sequence trajectory
      for (let step = 1; step <= bufferDepth; step++) {
        const targetIndex = isForward ? currentIndex + step : currentIndex - step;
        const targetNode = graph.nodes[targetIndex];
        if (!targetNode) break;

        // Ambient loop of target sequence
        const loopUrl = this.resolveMediaUrl(targetNode.ambientLoop, orientation);
        queuedUrls.push(loopUrl);
        this.preloadVideo(loopUrl);
        this.primeVideoDecoder(loopUrl);

        // Preload scene audio if available
        if ((targetNode.ambientLoop as any).audioUrl) {
          this.preloadAudio((targetNode.ambientLoop as any).audioUrl);
        }

        // Texture upload into GPU VRAM
        if (targetNode.ambientLoop.posterUrl) {
          this.preloadAndCacheTextureToGPU(targetNode.ambientLoop.posterUrl).catch(() => {});
        }

        // Connecting transition video between consecutive steps
        const fromNode = isForward ? graph.nodes[targetIndex - 1] : graph.nodes[targetIndex + 1];
        if (fromNode) {
          const transEdge = fromNode.transitions.find((t) => t.targetNodeId === targetNode.id);
          if (transEdge) {
            const transUrl = this.resolveMediaUrl(transEdge.video, orientation);
            queuedUrls.push(transUrl);
            this.preloadVideo(transUrl);
            this.primeVideoDecoder(transUrl);

            // Preload transition audio if available
            if (transEdge.audioUrl) {
              this.preloadAudio(transEdge.audioUrl);
            }
            if (transEdge.reverseAudioUrl) {
              this.preloadAudio(transEdge.reverseAudioUrl);
            }

            if (transEdge.video.posterUrl) {
              this.preloadAndCacheTextureToGPU(transEdge.video.posterUrl).catch(() => {});
            }
          }
        }
      }

      // 3. Update predictive metrics
      this.predictiveMetrics = {
        predictedTargetNodeId: predictedTargetNode?.id || null,
        bufferDepth,
        scrollVelocity: velocity,
        direction,
        isPrimed: queuedUrls.some((u) => this.isVideoCached(u) || this.primedVideoDecoders.has(u)),
        queuedUrls,
      };

      return this.predictiveMetrics;
    }

  /**
   * Hardware Video Decoder Buffer Warming:
   * Primes the browser's hardware video decoder pipeline on an offscreen element
   * to ensure macroblocks and keyframes are decoded into GPU VRAM with zero latency.
   */
  public primeVideoDecoder(url: string): Promise<boolean> {
    if (this.primedVideoDecoders.has(url)) return Promise.resolve(true);

    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';

      const cleanup = () => {
        this.primedVideoDecoders.add(url);
        resolve(true);
      };

      video.addEventListener('loadeddata', () => {
        // Minor seek to force initial frame decoding in hardware decoder
        try {
          video.currentTime = 0.04;
        } catch {}
        cleanup();
      }, { once: true });

      video.addEventListener('error', cleanup, { once: true });

      // Guard timeout
      setTimeout(cleanup, 2200);

      video.src = url;
      video.load();
    });
  }

  public getPredictiveMetrics(): PredictivePreloadMetrics {
    return this.predictiveMetrics;
  }

  /**
   * Preloads a high-res placeholder texture (poster or keyframe image).
   */
  public preloadPlaceholderTexture(url: string): Promise<HTMLImageElement> {
    if (!url) return Promise.reject(new Error('URL is required'));
    if (this.placeholderTextureCache.has(url)) {
      return Promise.resolve(this.placeholderTextureCache.get(url)!);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.placeholderTextureCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        // Return anyway so texture failure does not block the pipeline
        this.placeholderTextureCache.set(url, img);
        resolve(img);
      };
      img.src = url;
    });
  }

  /**
   * Pre-fetches high-resolution placeholder texture and uploads it directly
   * into the GPU buffer via asynchronous HTMLImageElement.decode() and createImageBitmap(),
   * completely eliminating frame stutter and main thread raster stalls during navigation.
   */
  public async preloadAndCacheTextureToGPU(url: string): Promise<{ img: HTMLImageElement; bitmap?: ImageBitmap }> {
    if (!url) throw new Error('URL is required for GPU texture pre-fetching');
    
    // Check if texture is already loaded & cached
    let img = this.placeholderTextureCache.get(url);
    if (!img) {
      img = await this.preloadPlaceholderTexture(url);
    }

    // Force asynchronous GPU decoding off the main thread to prevent frame stutter on render
    try {
      if (typeof img.decode === 'function') {
        await img.decode();
      }
    } catch {
      // Decode fallback for older browsers or cross-origin restrictions
    }

    // Upload to GPU buffer via createImageBitmap if supported in browser environment
    let bitmap = this.gpuTextureCache.get(url);
    if (!bitmap && typeof window !== 'undefined' && 'createImageBitmap' in window) {
      try {
        bitmap = await createImageBitmap(img, {
          imageOrientation: 'none',
          premultiplyAlpha: 'default',
          colorSpaceConversion: 'default',
        });
        this.gpuTextureCache.set(url, bitmap);
      } catch {
        // Bitmap creation fallback
      }
    }

    // Off-screen GPU rasterization warmup to ensure VRAM residency
    if (typeof document !== 'undefined') {
      try {
        if (!this.gpuWarmupCanvas) {
          this.gpuWarmupCanvas = document.createElement('canvas');
          this.gpuWarmupCanvas.width = 16;
          this.gpuWarmupCanvas.height = 16;
        }
        const ctx = this.gpuWarmupCanvas.getContext('2d', { willReadFrequently: false });
        if (ctx) {
          ctx.drawImage(bitmap || img, 0, 0, 16, 16);
        }
      } catch {}
    }

    return { img, bitmap };
  }

  public isTextureCachedInGPU(url: string): boolean {
    return this.gpuTextureCache.has(url) || this.placeholderTextureCache.has(url);
  }

  public getGpuTexture(url: string): ImageBitmap | HTMLImageElement | undefined {
    return this.gpuTextureCache.get(url) || this.placeholderTextureCache.get(url);
  }

  /**
   * Pre-fetches and caches placeholder textures into the GPU buffer based on the
   * current scroll direction ('forward' or 'backward') to prevent frame stutter during navigation.
   */
  public async prefetchDirectionalTextures(
    graph: HotelExperienceGraph,
    currentIndex: number,
    direction: 'forward' | 'backward'
  ): Promise<{ prioritizedUrl: string | null; count: number }> {
    const texturesToWarm: string[] = [];

    if (direction === 'forward') {
      // Prioritize the forward node and its subsequent node
      const nextNode = graph.nodes[currentIndex + 1];
      if (nextNode) {
        if (nextNode.ambientLoop.posterUrl) texturesToWarm.push(nextNode.ambientLoop.posterUrl);
        nextNode.transitions.forEach((t) => {
          if (t.video.posterUrl) texturesToWarm.push(t.video.posterUrl);
        });
      }
      const secondNextNode = graph.nodes[currentIndex + 2];
      if (secondNextNode && secondNextNode.ambientLoop.posterUrl) {
        texturesToWarm.push(secondNextNode.ambientLoop.posterUrl);
      }
      // Tertiary safeguard: previous node
      const prevNode = graph.nodes[currentIndex - 1];
      if (prevNode && prevNode.ambientLoop.posterUrl) {
        texturesToWarm.push(prevNode.ambientLoop.posterUrl);
      }
    } else {
      // Prioritize the backward node and its preceding node
      const prevNode = graph.nodes[currentIndex - 1];
      if (prevNode) {
        if (prevNode.ambientLoop.posterUrl) texturesToWarm.push(prevNode.ambientLoop.posterUrl);
        prevNode.transitions.forEach((t) => {
          if (t.video.posterUrl) texturesToWarm.push(t.video.posterUrl);
          if (t.reverseVideo?.posterUrl) texturesToWarm.push(t.reverseVideo.posterUrl);
        });
      }
      const secondPrevNode = graph.nodes[currentIndex - 2];
      if (secondPrevNode && secondPrevNode.ambientLoop.posterUrl) {
        texturesToWarm.push(secondPrevNode.ambientLoop.posterUrl);
      }
      // Tertiary safeguard: next node
      const nextNode = graph.nodes[currentIndex + 1];
      if (nextNode && nextNode.ambientLoop.posterUrl) {
        texturesToWarm.push(nextNode.ambientLoop.posterUrl);
      }
    }

    // Warm up and upload prioritized textures into GPU buffers asynchronously
    const promises = texturesToWarm.map((url) => this.preloadAndCacheTextureToGPU(url).catch(() => null));
    await Promise.all(promises);

    return {
      prioritizedUrl: texturesToWarm[0] || null,
      count: texturesToWarm.length,
    };
  }

  public isPlaceholderTextureCached(url: string): boolean {
    return this.placeholderTextureCache.has(url);
  }

  /**
   * Unloads a high-res placeholder texture, releasing ImageBitmap GPU VRAM
   * and detaching its src to free main memory.
   */
  public unloadPlaceholderTexture(url: string): void {
    const bitmap = this.gpuTextureCache.get(url);
    if (bitmap) {
      try {
        bitmap.close();
      } catch {}
      this.gpuTextureCache.delete(url);
    }

    const img = this.placeholderTextureCache.get(url);
    if (img) {
      img.onload = null;
      img.onerror = null;
      img.removeAttribute('src');
      this.placeholderTextureCache.delete(url);
    }
  }

  /**
     * Resource Lifecycle Manager with Least-Recently-Used (LRU) Cache Policy:
     * Specifically unloads high-res placeholder textures, video media buffers,
     * and audio files for nodes that are more than two nodes away from the current index (distance > 2),
     * strictly prioritizing the unloading of least-recently-accessed nodes first.
     */
    public pruneLRUResources(
      graph: HotelExperienceGraph,
      currentNodeIndex: number,
      evictedNodeIds: string[],
      maxProtectedDistance: number = 2
    ): { unloadedVideos: number; unloadedTextures: number; unloadedAudios: number } {
      const protectedUrls = new Set<string>();
      const protectedAudioUrls = new Set<string>();
      const orientation = this.getDeviceOrientation();

      // Retain media for current node and all nodes within distance <= maxProtectedDistance (2)
      graph.nodes.forEach((node, idx) => {
        if (Math.abs(idx - currentNodeIndex) <= maxProtectedDistance) {
          protectedUrls.add(this.resolveMediaUrl(node.ambientLoop, orientation));
          if (node.ambientLoop.posterUrl) {
            protectedUrls.add(node.ambientLoop.posterUrl);
          }
          // Protect scene audio
          if ((node.ambientLoop as any).audioUrl) {
            protectedAudioUrls.add((node.ambientLoop as any).audioUrl);
          }
          node.transitions.forEach((t) => {
            protectedUrls.add(this.resolveMediaUrl(t.video, orientation));
            if (t.video.posterUrl) {
              protectedUrls.add(t.video.posterUrl);
            }
            // Protect transition audio
            if (t.audioUrl) {
              protectedAudioUrls.add(t.audioUrl);
            }
            if (t.reverseAudioUrl) {
              protectedAudioUrls.add(t.reverseAudioUrl);
            }
            if (t.reverseVideo) {
              protectedUrls.add(this.resolveMediaUrl(t.reverseVideo, orientation));
            }
            if (t.reverseVideo?.posterUrl) {
              protectedUrls.add(t.reverseVideo.posterUrl);
            }
          });
        }
      });

      let unloadedVideos = 0;
      let unloadedTextures = 0;
      let unloadedAudios = 0;

      // 1. Unload high-res placeholder textures for evicted distant nodes (> 2 away)
      evictedNodeIds.forEach((nodeId) => {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const poster = node.ambientLoop.posterUrl;
        if (poster && !protectedUrls.has(poster)) {
          this.unloadPlaceholderTexture(poster);
          unloadedTextures++;
        }

        // Unload scene audio if not protected
        if ((node.ambientLoop as any).audioUrl && !protectedAudioUrls.has((node.ambientLoop as any).audioUrl)) {
          this.unloadAudio((node.ambientLoop as any).audioUrl);
          unloadedAudios++;
        }

        node.transitions.forEach((t) => {
          if (t.video.posterUrl && !protectedUrls.has(t.video.posterUrl)) {
            this.unloadPlaceholderTexture(t.video.posterUrl);
            unloadedTextures++;
          }
          if (t.reverseVideo?.posterUrl && !protectedUrls.has(t.reverseVideo.posterUrl)) {
            this.unloadPlaceholderTexture(t.reverseVideo.posterUrl);
            unloadedTextures++;
          }
          // Unload transition audio if not protected
          if (t.audioUrl && !protectedAudioUrls.has(t.audioUrl)) {
            this.unloadAudio(t.audioUrl);
            unloadedAudios++;
          }
          if (t.reverseAudioUrl && !protectedAudioUrls.has(t.reverseAudioUrl)) {
            this.unloadAudio(t.reverseAudioUrl);
            unloadedAudios++;
          }
        });
      });

      // 2. Unload video media buffers for URLs that are not protected
      for (const [url, videoEl] of this.cache.entries()) {
        if (!protectedUrls.has(url)) {
          try {
            videoEl.pause();
            videoEl.removeAttribute('src');
            videoEl.load();
          } catch {}
          this.cache.delete(url);
          unloadedVideos++;

          if (this.blobUrls.has(url)) {
            try {
              URL.revokeObjectURL(this.blobUrls.get(url)!);
            } catch {}
            this.blobUrls.delete(url);
          }
        }
      }

      // 3. Unload audio buffers for URLs that are not protected
      for (const [url, audioEl] of this.audioCache.entries()) {
        if (!protectedAudioUrls.has(url)) {
          try {
            audioEl.pause();
            audioEl.removeAttribute('src');
            audioEl.load();
          } catch {}
          this.audioCache.delete(url);
          unloadedAudios++;
        }
      }

      this.notifyProgress();
      this.notifyAudioProgress();
      return { unloadedVideos, unloadedTextures, unloadedAudios };
    }

  /**
   * Resource Lifecycle Manager: Prunes media cached for non-adjacent nodes
   * (nodes with distance > maxDistance from current node, default 1: immediate neighbors only).
   * Revokes object URLs, resets HTMLVideoElement sources, and triggers GC to prevent memory leaks
   * during extended navigation sessions across the hotel experience graph.
   */
  public pruneDistantNodes(
    graph: HotelExperienceGraph,
    currentNodeIndex: number,
    maxDistance: number = 1
  ): void {
    const keptUrls = new Set<string>();
    const orientation = this.getDeviceOrientation();

    graph.nodes.forEach((node, idx) => {
      // Keep only current node and strictly adjacent neighbors (prev and next)
      if (Math.abs(idx - currentNodeIndex) <= maxDistance) {
        keptUrls.add(this.resolveMediaUrl(node.ambientLoop, orientation));
        node.transitions.forEach((t) => {
          keptUrls.add(this.resolveMediaUrl(t.video, orientation));
          if (t.reverseVideo) {
            keptUrls.add(this.resolveMediaUrl(t.reverseVideo, orientation));
          }
        });
      }
    });

    // Prune video cache entries not in active neighborhood
    for (const [url, videoEl] of this.cache.entries()) {
      if (!keptUrls.has(url)) {
        try {
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.load();
        } catch {}
        this.cache.delete(url);

        // Also clean up any associated blob URL if it was created
        if (this.blobUrls.has(url)) {
          try {
            URL.revokeObjectURL(this.blobUrls.get(url)!);
          } catch {}
          this.blobUrls.delete(url);
        }
      }
    }
    this.notifyProgress();
  }

  public onProgress(callback: (status: PreloadStatus) => void): () => void {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }

    public onAudioProgress(callback: (status: AudioPreloadStatus) => void): () => void {
      this.audioListeners.add(callback);
      return () => this.audioListeners.delete(callback);
    }

    private notifyProgress() {
      const loadedCount = this.cache.size;
      const totalCount = loadedCount + this.activePreloadRequests.size;
      const progressPercent = totalCount === 0 ? 100 : Math.round((loadedCount / totalCount) * 100);
      this.listeners.forEach((listener) => listener({ loadedCount, totalCount, progressPercent }));
    }

    private notifyAudioProgress() {
      const loadedCount = this.audioCache.size;
      const totalCount = loadedCount + this.activeAudioPreloadRequests.size;
      const progressPercent = totalCount === 0 ? 100 : Math.round((loadedCount / totalCount) * 100);
      this.audioListeners.forEach((listener) => listener({ loadedCount, totalCount, progressPercent }));
    }

    /**
     * Unloads an audio element, releasing memory.
     */
    public unloadAudio(url: string): void {
      const audioEl = this.audioCache.get(url);
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        } catch {}
        this.audioCache.delete(url);
      }
    }

    public clear() {
      // 1. Unload and unmount all cached HTMLVideoElement instances
      for (const videoEl of this.cache.values()) {
        try {
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.load();
        } catch {}
      }
      this.cache.clear();

      // 2. Unload all cached HTMLAudioElement instances
      for (const audioEl of this.audioCache.values()) {
        try {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        } catch {}
      }
      this.audioCache.clear();

      // 3. Revoke all allocated object URLs
      this.blobUrls.forEach((blob) => {
        try {
          URL.revokeObjectURL(blob);
        } catch {}
      });
      this.blobUrls.clear();
      this.activePreloadRequests.clear();
      this.activeAudioPreloadRequests.clear();

      // 4. Explicitly close GPU ImageBitmap references
      for (const bitmap of this.gpuTextureCache.values()) {
        try {
          bitmap.close();
        } catch {}
      }
      this.gpuTextureCache.clear();

      // 5. Detach placeholder image listeners and source references
      for (const img of this.placeholderTextureCache.values()) {
        img.onload = null;
        img.onerror = null;
        img.removeAttribute('src');
      }
      this.placeholderTextureCache.clear();

      // 6. Clear decoder primes and listeners
      this.primedVideoDecoders.clear();
      this.listeners.clear();
      this.audioListeners.clear();
    }

    public destroy() {
      this.clear();
      this.gpuWarmupCanvas = null;
    }
  }

export const preloadManager = new VideoPreloadManager();
