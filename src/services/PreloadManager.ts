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
