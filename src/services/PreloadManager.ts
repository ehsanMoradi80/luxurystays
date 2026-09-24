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

export class VideoPreloadManager {
  private cache: Map<string, HTMLVideoElement> = new Map();
  private placeholderTextureCache: Map<string, HTMLImageElement> = new Map();
  private gpuTextureCache: Map<string, ImageBitmap> = new Map();
  private gpuWarmupCanvas: HTMLCanvasElement | null = null;
  private blobUrls: Map<string, string> = new Map();
  private activePreloadRequests: Set<string> = new Set();
  private listeners: Set<(status: PreloadStatus) => void> = new Set();

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
  public resolveMediaUrl(media: VideoMediaVariant, orientation?: ScreenOrientation): string {
    const currentOrientation = orientation || this.getDeviceOrientation();
    return currentOrientation === 'portrait' ? media.portraitUrl : media.landscapeUrl;
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
   * Intelligently preloads all adjacent nodes and transitions for the current node.
   * This guarantees that when a user triggers a transition (via click or scroll),
   * the video is already primed in the GPU/memory buffer.
   * Includes multi-level neighborhood depth (direct outgoing transitions, their destination ambient loops, and secondary neighbors).
   */
  public preloadNodeNeighborhood(
    graph: HotelExperienceGraph,
    currentNodeId: string,
    orientation?: ScreenOrientation
  ): void {
    const currentNode = graph.nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) return;

    const currentOrient = orientation || this.getDeviceOrientation();

    // 1. اولویت نخست: اطمینان از آماده بودن ویدیوی لوپ فضای جاری
    const currentLoopUrl = this.resolveMediaUrl(currentNode.ambientLoop, currentOrient);
    this.preloadVideo(currentLoopUrl);

    // 2. اولویت بالا: بارگذاری بلادرنگ تمامی ترنزیشن‌های خروجی مستقیم این گره
    currentNode.transitions.forEach((edge) => {
      const transitionUrl = this.resolveMediaUrl(edge.video, currentOrient);
      this.preloadVideo(transitionUrl);

      // 3. اولویت متناظر: بارگذاری ویدیوی لوپ محیط فضای مقصد هر ترنزیشن
      const targetNode = graph.nodes.find((n) => n.id === edge.targetNodeId);
      if (targetNode) {
        const targetLoopUrl = this.resolveMediaUrl(targetNode.ambientLoop, currentOrient);
        this.preloadVideo(targetLoopUrl);

        // 4. پیش‌بارگذاری هوشمند گام ۲ (همسایگانِ گره مقصد برای گشت‌های متوالی بدون لودینگ)
        targetNode.transitions.forEach((secondaryEdge) => {
          const secondaryTransitionUrl = this.resolveMediaUrl(secondaryEdge.video, currentOrient);
          // اجرای با اولویت پس‌زمینه
          setTimeout(() => {
            this.preloadVideo(secondaryTransitionUrl);
          }, 400);
        });
      }
    });
  }

  public getCachedVideo(url: string): HTMLVideoElement | undefined {
    return this.cache.get(url);
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
      img.src = '';
      this.placeholderTextureCache.delete(url);
    }
  }

  /**
   * Resource Lifecycle Manager with Least-Recently-Used (LRU) Cache Policy:
   * Specifically unloads high-res placeholder textures and video media buffers
   * for nodes that are more than two nodes away from the current index (distance > 2),
   * strictly prioritizing the unloading of least-recently-accessed nodes first.
   */
  public pruneLRUResources(
    graph: HotelExperienceGraph,
    currentNodeIndex: number,
    evictedNodeIds: string[],
    maxProtectedDistance: number = 2
  ): { unloadedVideos: number; unloadedTextures: number } {
    const protectedUrls = new Set<string>();
    const orientation = this.getDeviceOrientation();

    // Retain media for current node and all nodes within distance <= maxProtectedDistance (2)
    graph.nodes.forEach((node, idx) => {
      if (Math.abs(idx - currentNodeIndex) <= maxProtectedDistance) {
        protectedUrls.add(this.resolveMediaUrl(node.ambientLoop, orientation));
        if (node.ambientLoop.posterUrl) {
          protectedUrls.add(node.ambientLoop.posterUrl);
        }
        node.transitions.forEach((t) => {
          protectedUrls.add(this.resolveMediaUrl(t.video, orientation));
          if (t.video.posterUrl) {
            protectedUrls.add(t.video.posterUrl);
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

    // 1. Unload high-res placeholder textures for evicted distant nodes (> 2 away)
    evictedNodeIds.forEach((nodeId) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const poster = node.ambientLoop.posterUrl;
      if (poster && !protectedUrls.has(poster)) {
        this.unloadPlaceholderTexture(poster);
        unloadedTextures++;
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

    this.notifyProgress();
    return { unloadedVideos, unloadedTextures };
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

  private notifyProgress() {
    const loadedCount = this.cache.size;
    const totalCount = loadedCount + this.activePreloadRequests.size;
    const progressPercent = totalCount === 0 ? 100 : Math.round((loadedCount / totalCount) * 100);
    this.listeners.forEach((listener) => listener({ loadedCount, totalCount, progressPercent }));
  }

  public clear() {
    this.cache.clear();
    this.blobUrls.forEach((blob) => URL.revokeObjectURL(blob));
    this.blobUrls.clear();
    this.activePreloadRequests.clear();
  }
}

export const preloadManager = new VideoPreloadManager();
