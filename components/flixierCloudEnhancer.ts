/**
 * FlixierCloudEnhancer — true AI cloud video enhancement (Flixier pipeline).
 *
 * How it works (100% non-intrusive — the main <video> element is NEVER touched):
 *   1. A hidden secondary decoder loads the same stream and plays ~35s AHEAD
 *      of the main playhead.
 *   2. Its frames are drawn to an offscreen canvas and recorded in EXACT
 *      5-second chunks (Flixier's enhance prediction only processes 5s).
 *   3. Every 5-second chunk is uploaded to our backend, which acquires a
 *      BRAND-NEW anonymous Flixier session (fresh cookies + XSRF token) for
 *      EVERY upload, registers the asset, pushes it to S3 and triggers the
 *      enhance prediction. The client then polls until the enhanced clip
 *      is ready.
 *   4. Enhanced 5s clips are played, perfectly time-synced, on muted overlay
 *      <video> elements above the player. Audio, controls, buffering and
 *      seeking all continue to come from the original untouched player.
 *   5. The enhanced picture only becomes visible 30 seconds after the user
 *      activates the feature, so the first segments have time to load well.
 *      If a segment is not ready in time, the overlay simply hides and the
 *      original picture shows — playback is never interrupted.
 */
import * as Hls from 'hls.js';

type FallbackReason = 'unsupported' | 'live-stream' | 'security' | 'capture-failed';

const SEGMENT_SECONDS = 5;          // Flixier gives exactly 5 seconds per prediction
const LEAD_SECONDS = 35;            // how far ahead of the main playhead we capture
const ACTIVATION_DELAY_MS = 30_000; // enhanced picture appears 30s after pressing
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 150_000;
const MAX_CACHED_SEGMENTS = 80;
const MAX_CAPTURE_WIDTH = 1280;     // keeps every 5s upload safely under limits

interface EnhancerOptions {
    mainVideo: HTMLVideoElement;
    overlayA: HTMLVideoElement;
    overlayB: HTMLVideoElement;
    streamUrl: string;
    needsProxy?: boolean;
    onFallback: (reason: FallbackReason) => void;
}

interface EnhancedSegment {
    start: number;
    url: string;
}

export class FlixierCloudEnhancer {
    private opts: EnhancerOptions;
    private disposed = false;
    private displayEnabled = false;

    private hiddenVideo: HTMLVideoElement | null = null;
    private hiddenHls: Hls.default | null = null;
    private captureCanvas: HTMLCanvasElement | null = null;
    private captureCtx: CanvasRenderingContext2D | null = null;
    private captureStream: MediaStream | null = null;
    private recorder: MediaRecorder | null = null;
    private recorderChunks: BlobPart[] = [];
    private chunkStart = -1;
    private taintChecked = false;
    private corsRetried = false;

    private segments: Map<number, EnhancedSegment> = new Map();
    private inFlight: Set<number> = new Set();

    private overlays: HTMLVideoElement[];
    private activeOverlay = 0;
    private currentSegmentKey: number | null = null;

    private vfcId = 0;
    private rafId = 0;
    private displayTimer: ReturnType<typeof setInterval> | null = null;
    private anchorTimer: ReturnType<typeof setInterval> | null = null;
    private activationTimer: ReturnType<typeof setTimeout> | null = null;
    private hiddenThrottled = false;

    static isSupported(): boolean {
        return typeof MediaRecorder !== 'undefined' &&
            typeof HTMLCanvasElement !== 'undefined' &&
            typeof (HTMLCanvasElement.prototype as any).captureStream === 'function';
    }

    constructor(opts: EnhancerOptions) {
        this.opts = opts;
        this.overlays = [opts.overlayA, opts.overlayB];
        if (!FlixierCloudEnhancer.isSupported()) {
            throw new Error('unsupported');
        }
    }

    start() {
        const { mainVideo, streamUrl } = this.opts;

        // Live streams cannot be captured ahead of the playhead
        if (streamUrl.includes('/api/live-proxy')) {
            this.fail('live-stream');
            return;
        }

        for (const ov of this.overlays) {
            ov.muted = true;
            ov.playsInline = true;
            ov.preload = 'auto';
            ov.style.opacity = '0';
        }

        this.setupHiddenCapture();

        // The enhanced picture switches on 30s after activation so the first
        // segments have plenty of time to upload + enhance + buffer.
        this.activationTimer = setTimeout(() => {
            this.displayEnabled = true;
        }, ACTIVATION_DELAY_MS);

        // Display sync loop
        this.displayTimer = setInterval(() => this.syncDisplay(), 200);
        mainVideo.addEventListener('timeupdate', this.onTimeUpdate);

        // Keep the hidden capture anchored ~LEAD seconds ahead of the playhead
        this.anchorTimer = setInterval(() => this.manageAnchor(), 1000);
    }

    dispose() {
        this.disposed = true;
        if (this.activationTimer) clearTimeout(this.activationTimer);
        if (this.displayTimer) clearInterval(this.displayTimer);
        if (this.anchorTimer) clearInterval(this.anchorTimer);
        this.opts.mainVideo.removeEventListener('timeupdate', this.onTimeUpdate);
        this.cancelFrameLoop();
        try { this.recorder?.state !== 'inactive' && this.recorder?.stop(); } catch {}
        this.recorder = null;
        try { this.captureStream?.getTracks().forEach(t => t.stop()); } catch {}
        this.captureStream = null;
        if (this.hiddenHls) { try { this.hiddenHls.destroy(); } catch {} this.hiddenHls = null; }
        if (this.hiddenVideo) {
            try {
                this.hiddenVideo.pause();
                this.hiddenVideo.removeAttribute('src');
                this.hiddenVideo.load();
                this.hiddenVideo.remove();
            } catch {}
            this.hiddenVideo = null;
        }
        for (const ov of this.overlays) {
            try {
                ov.style.opacity = '0';
                ov.pause();
                ov.removeAttribute('src');
                ov.load();
            } catch {}
        }
        this.segments.clear();
        this.inFlight.clear();
    }

    // ------------------------------------------------------------ capture side

    private setupHiddenCapture(withCors = false) {
        const { mainVideo, streamUrl, needsProxy } = this.opts;

        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        if (withCors) video.crossOrigin = 'anonymous';
        video.style.cssText = 'position:fixed;left:-9999px;top:0;width:4px;height:4px;opacity:0;pointer-events:none;';
        document.body.appendChild(video);
        this.hiddenVideo = video;

        const anchor = this.alignedAnchor(mainVideo.currentTime);

        const onReady = () => {
            if (this.disposed) return;
            try { video.currentTime = anchor; } catch {}
            video.play().catch(() => {});
            this.beginFrameLoop();
        };

        // Mirror the exact source-loading behaviour of the main player
        const isM3u8 = streamUrl.includes('.m3u8');
        if (needsProxy && isM3u8) {
            this.loadProxiedHls(streamUrl, video, onReady);
        } else if (isM3u8 && Hls.default.isSupported()) {
            const hls = new Hls.default({ capLevelToPlayerSize: false });
            this.hiddenHls = hls;
            hls.on(Hls.default.Events.MANIFEST_PARSED, () => {
                // Cap the capture rendition to <=720p: keeps 5s uploads small
                try {
                    const levels = hls.levels || [];
                    let cap = -1;
                    levels.forEach((l, i) => { if (l.height && l.height <= 720) cap = i; });
                    if (cap >= 0) hls.autoLevelCapping = cap;
                } catch {}
                onReady();
            });
            hls.on(Hls.default.Events.ERROR, (_e, data) => {
                if (data.fatal) {
                    if (data.type === Hls.default.ErrorTypes.MEDIA_ERROR) {
                        try { hls.recoverMediaError(); } catch {}
                    }
                }
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
        } else {
            video.src = streamUrl;
            video.addEventListener('loadeddata', onReady, { once: true });
        }
    }

    private async loadProxiedHls(sourceUrl: string, video: HTMLVideoElement, onReady: () => void) {
        const proxy = 'https://api.codetabs.com/v1/proxy?quest=';
        try {
            const res = await fetch(proxy + encodeURIComponent(sourceUrl));
            let manifest = await res.text();
            const baseUrl = sourceUrl.substring(0, sourceUrl.lastIndexOf('/') + 1);
            const resolveUrl = (base: string, relative: string) => {
                try { return new URL(relative, base).href; } catch { return relative; }
            };
            manifest = manifest.replace(/^(?!#)(.*)$/gm, line => {
                const trimmedLine = line.trim();
                if (trimmedLine.length > 0) {
                    return proxy + encodeURIComponent(resolveUrl(baseUrl, trimmedLine));
                }
                return line;
            });
            const blob = new Blob([manifest], { type: 'application/vnd.apple.mpegurl' });
            const blobUrl = URL.createObjectURL(blob);
            const hls = new Hls.default();
            this.hiddenHls = hls;
            hls.on(Hls.default.Events.MANIFEST_PARSED, onReady);
            hls.loadSource(blobUrl);
            hls.attachMedia(video);
        } catch {
            this.fail('capture-failed');
        }
    }

    private alignedAnchor(mainTime: number): number {
        return Math.ceil((mainTime + LEAD_SECONDS) / SEGMENT_SECONDS) * SEGMENT_SECONDS;
    }

    private beginFrameLoop() {
        const video = this.hiddenVideo;
        if (!video || this.disposed) return;

        const canvas = document.createElement('canvas');
        this.captureCanvas = canvas;

        const step = () => {
            if (this.disposed) return;
            this.drawFrame();
            this.scheduleFrame(step);
        };
        this.scheduleFrame(step);
    }

    private scheduleFrame(cb: () => void) {
        const v = this.hiddenVideo as any;
        if (v && typeof v.requestVideoFrameCallback === 'function') {
            this.vfcId = v.requestVideoFrameCallback(() => cb());
        } else {
            this.rafId = requestAnimationFrame(() => cb());
        }
    }

    private cancelFrameLoop() {
        const v = this.hiddenVideo as any;
        if (this.vfcId && v && typeof v.cancelVideoFrameCallback === 'function') {
            try { v.cancelVideoFrameCallback(this.vfcId); } catch {}
            this.vfcId = 0;
        }
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
        }
    }

    private drawFrame() {
        const video = this.hiddenVideo;
        const canvas = this.captureCanvas;
        if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

        // Size the canvas once (capped so each 5s upload stays small)
        if (!this.captureCtx) {
            const scale = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            this.captureCtx = canvas.getContext('2d');
        }
        const ctx = this.captureCtx;
        if (!ctx) return;

        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch {
            return;
        }

        // One-time canvas taint check (cross-origin frames without CORS)
        if (!this.taintChecked) {
            try {
                ctx.getImageData(0, 0, 1, 1);
                this.taintChecked = true;
                this.startRecorderPipeline();
            } catch {
                // Tainted — retry the hidden pipeline once with CORS enabled
                this.handleTaint();
                return;
            }
        }

        // Rotate the recorder on exact 5-second media-time boundaries
        if (this.recorder && this.recorder.state === 'recording' && this.chunkStart >= 0) {
            if (video.currentTime >= this.chunkStart + SEGMENT_SECONDS) {
                this.rotateRecorder();
            }
        }
    }

    private handleTaint() {
        this.cancelFrameLoop();
        if (this.hiddenHls) { try { this.hiddenHls.destroy(); } catch {} this.hiddenHls = null; }
        this.hiddenVideo?.remove();
        this.hiddenVideo = null;
        this.captureCanvas = null;
        this.captureCtx = null;
        if (!this.corsRetried) {
            this.corsRetried = true;
            this.setupHiddenCapture(true);
        } else {
            this.fail('security');
        }
    }

    private pickMimeType(): string {
        const candidates = [
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4',
            'video/webm;codecs=h264',
            'video/webm;codecs=vp9',
            'video/webm',
        ];
        for (const c of candidates) {
            try { if (MediaRecorder.isTypeSupported(c)) return c; } catch {}
        }
        return '';
    }

    private startRecorderPipeline() {
        const canvas = this.captureCanvas;
        const video = this.hiddenVideo;
        if (!canvas || !video || this.disposed) return;
        try {
            this.captureStream = (canvas as any).captureStream(30);
        } catch {
            this.fail('capture-failed');
            return;
        }
        this.startNewChunk();
    }

    private startNewChunk() {
        const video = this.hiddenVideo;
        if (!video || !this.captureStream || this.disposed) return;

        // Align every chunk to a 5-second boundary of the media timeline
        this.chunkStart = Math.floor(video.currentTime / SEGMENT_SECONDS) * SEGMENT_SECONDS;

        const mimeType = this.pickMimeType();
        try {
            this.recorder = new MediaRecorder(this.captureStream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: 2_500_000,
            });
        } catch {
            this.fail('capture-failed');
            return;
        }
        this.recorderChunks = [];
        this.recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) this.recorderChunks.push(e.data);
        };
        this.recorder.onerror = () => { /* segment dropped; pipeline continues */ };
        try {
            this.recorder.start();
        } catch {
            this.fail('capture-failed');
        }
    }

    private rotateRecorder() {
        const recorder = this.recorder;
        if (!recorder) return;
        const key = this.chunkStart;
        const mime = recorder.mimeType || 'video/webm';

        recorder.onstop = () => {
            const blob = new Blob(this.recorderChunks, { type: mime });
            // Skip duplicates (already enhanced or currently being enhanced)
            if (blob.size > 20_000 && !this.segments.has(key) && !this.inFlight.has(key)) {
                this.uploadChunk(key, blob);
            }
        };
        try { recorder.stop(); } catch {}
        this.recorder = null;
        // Immediately begin capturing the next 5-second window
        this.startNewChunk();
    }

    // ------------------------------------------------------------- cloud side

    private async uploadChunk(key: number, blob: Blob) {
        if (this.disposed) return;
        this.inFlight.add(key);
        try {
            // The backend acquires a FRESH anonymous Flixier session
            // (new cookies + new XSRF token) for every single upload.
            const res = await fetch(`/api/flixier/enhance-chunk?start=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: blob,
            });
            if (!res.ok) throw new Error(`upload failed (${res.status})`);
            const data = await res.json();
            if (!data.predictionId) throw new Error('no prediction id');
            await this.pollPrediction(key, data.predictionId, data.sessionCookies, data.sessionXsrfToken);
        } catch (e) {
            // Segment silently dropped — original picture shows for that window
        } finally {
            this.inFlight.delete(key);
        }
    }

    private async pollPrediction(key: number, id: string, cookies: string, xsrfToken: string) {
        const deadline = Date.now() + POLL_TIMEOUT_MS;
        while (!this.disposed && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
            if (this.disposed) return;
            // Abandon segments whose playback window already passed long ago
            if (key + SEGMENT_SECONDS < this.opts.mainVideo.currentTime - 10) return;
            try {
                const res = await fetch('/api/flixier/prediction-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, cookies, xsrfToken }),
                });
                if (!res.ok) continue;
                const data = await res.json();
                if (data.status === 'COMPLETED' && data.output_url) {
                    this.storeSegment(key, data.output_url);
                    return;
                }
                if (data.status === 'FAILED') return;
            } catch { /* transient poll error */ }
        }
    }

    private storeSegment(key: number, url: string) {
        this.segments.set(key, { start: key, url });
        if (this.segments.size > MAX_CACHED_SEGMENTS) {
            const t = this.opts.mainVideo.currentTime;
            // Prune the segments furthest behind the playhead
            const keys = [...this.segments.keys()].sort((a, b) => Math.abs(t - b) - Math.abs(t - a));
            while (this.segments.size > MAX_CACHED_SEGMENTS && keys.length) {
                this.segments.delete(keys.shift()!);
            }
        }
    }

    // ------------------------------------------------------------ anchor mgmt

    private manageAnchor() {
        const main = this.opts.mainVideo;
        const hidden = this.hiddenVideo;
        if (!hidden || this.disposed || !this.taintChecked) return;

        if (hidden.ended) return; // reached end of content — everything captured

        const gap = hidden.currentTime - main.currentTime;

        // Playhead jumped (seek) or capture fell behind → re-anchor ahead of it
        if (gap < SEGMENT_SECONDS + 2 || gap > LEAD_SECONDS + 90) {
            const target = this.alignedAnchor(main.currentTime);
            if (Math.abs(hidden.currentTime - target) > SEGMENT_SECONDS) {
                try { hidden.currentTime = target; } catch {}
                // Discard the partial chunk interrupted by the seek
                if (this.recorder && this.recorder.state === 'recording') {
                    const rec = this.recorder;
                    rec.onstop = null;
                    try { rec.stop(); } catch {}
                    this.recorder = null;
                    this.startNewChunk();
                }
            }
        }

        // Don't run away while the main player is paused/buffering
        if (gap > LEAD_SECONDS + 20 && !hidden.paused) {
            this.hiddenThrottled = true;
            hidden.pause();
        } else if (this.hiddenThrottled && gap < LEAD_SECONDS + 10) {
            this.hiddenThrottled = false;
            hidden.play().catch(() => {});
        }
    }

    // ------------------------------------------------------------ display side

    private onTimeUpdate = () => this.syncDisplay();

    private syncDisplay() {
        if (this.disposed) return;
        const main = this.opts.mainVideo;

        if (!this.displayEnabled || main.seeking) {
            this.hideOverlays();
            return;
        }

        const t = main.currentTime;
        const key = Math.floor(t / SEGMENT_SECONDS) * SEGMENT_SECONDS;
        const seg = this.segments.get(key);

        if (!seg) {
            this.hideOverlays();
            this.currentSegmentKey = null;
            return;
        }

        const offset = t - seg.start;

        // Switch the active overlay to this segment if needed
        if (this.currentSegmentKey !== key) {
            const standby = this.overlays[1 - this.activeOverlay];
            const active = this.overlays[this.activeOverlay];
            // Prefer the standby overlay if it already preloaded this segment
            if (standby.dataset.segKey === String(key)) {
                this.activeOverlay = 1 - this.activeOverlay;
                this.bindOverlay(standby, seg, offset, true);
                active.style.opacity = '0';
                try { active.pause(); } catch {}
            } else {
                this.bindOverlay(active, seg, offset, true);
                standby.style.opacity = '0';
            }
            this.currentSegmentKey = key;
        }

        const ov = this.overlays[this.activeOverlay];

        // Keep the enhanced clip frame-synced with the untouched main player
        if (ov.readyState >= 2) {
            if (Math.abs(ov.currentTime - offset) > 0.35) {
                try { ov.currentTime = Math.max(0, offset); } catch {}
            }
            ov.playbackRate = main.playbackRate;
            if (main.paused && !ov.paused) ov.pause();
            if (!main.paused && ov.paused && !ov.ended) ov.play().catch(() => {});
            ov.style.opacity = '1';
        }

        // Preload the next segment on the standby overlay for a seamless switch
        if (offset > 1.5) {
            const nextKey = key + SEGMENT_SECONDS;
            const nextSeg = this.segments.get(nextKey);
            const standby = this.overlays[1 - this.activeOverlay];
            if (nextSeg && standby.dataset.segKey !== String(nextKey)) {
                standby.dataset.segKey = String(nextKey);
                standby.src = nextSeg.url;
                standby.load();
            }
        }
    }

    private bindOverlay(ov: HTMLVideoElement, seg: EnhancedSegment, offset: number, show: boolean) {
        const main = this.opts.mainVideo;
        if (ov.dataset.segKey !== String(seg.start) || !ov.src) {
            ov.dataset.segKey = String(seg.start);
            ov.src = seg.url;
            ov.load();
        }
        const onReady = () => {
            if (this.disposed) return;
            try { ov.currentTime = Math.max(0, main.currentTime - seg.start); } catch {}
            if (!main.paused) ov.play().catch(() => {});
            if (show) ov.style.opacity = '1';
        };
        if (ov.readyState >= 2) onReady();
        else ov.addEventListener('loadeddata', onReady, { once: true });
    }

    private hideOverlays() {
        for (const ov of this.overlays) {
            if (ov.style.opacity !== '0') {
                ov.style.opacity = '0';
                try { ov.pause(); } catch {}
            }
        }
    }

    private fail(reason: FallbackReason) {
        if (this.disposed) return;
        try { this.opts.onFallback(reason); } catch {}
    }
}

export default FlixierCloudEnhancer;
