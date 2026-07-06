

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Hls from 'hls.js';
import { usePlayer } from '../contexts/PlayerContext';
import * as Icons from './Icons';

const PipPlayer: React.FC = () => {
    const { pipData, setPipData, pipAnchor, setPipAnchor } = usePlayer();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls.default | null>(null);
    const [isPlaying, setIsPlaying] = useState(pipData?.isPlaying ?? false);
    const dragClickSafety = useRef(false);
    const [animationState, setAnimationState] = useState<'idle' | 'entering' | 'entered'>('idle');

    const finalWidth = 210;
    const finalHeight = 118; // 16:9 aspect ratio for 210 width

    const [position, setPosition] = useState({
        x: window.innerWidth - finalWidth - 16,
        y: window.innerHeight - finalHeight - 80
    });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (pipData && videoRef.current) {
            const video = videoRef.current;
            if (Hls.default.isSupported()) {
                if (hlsRef.current) hlsRef.current.destroy();
                const hlsConfig = {
                    // Make PiP lightweight
                    enableWorker: true,
                    maxBufferLength: 20,
                    maxMaxBufferLength: 30,
                    
                    // Use a conservative ABR strategy for stability
                    abrEwmaDefaultEstimate: 2_000_000,
                    abrBandWidthFactor: 0.7,
                
                    // Resilient error recovery
                    fragLoadingMaxRetry: 4,
                    manifestLoadingMaxRetry: 5,
                    manifestLoadingRetryDelay: 1000,
                };

                const hls = new Hls.default(hlsConfig);
                hlsRef.current = hls;
                hls.loadSource(pipData.streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.default.Events.MANIFEST_PARSED, () => {
                    video.currentTime = pipData.currentTime;
                    if (pipData.isPlaying) {
                        video.play().catch(() => setIsPlaying(false));
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = pipData.streamUrl;
                video.addEventListener('loadedmetadata', () => {
                    video.currentTime = pipData.currentTime;
                    if (pipData.isPlaying) {
                        video.play().catch(() => setIsPlaying(false));
                    }
                });
            }
            setIsPlaying(pipData.isPlaying);
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [pipData?.streamUrl]);

    useEffect(() => {
        if (pipData && pipAnchor && animationState === 'idle') {
            setAnimationState('entering');
            const el = containerRef.current;
            if (!el) return;

            el.style.setProperty('--pip-start-left', `${pipAnchor.left}px`);
            el.style.setProperty('--pip-start-top', `${pipAnchor.top}px`);
            el.style.setProperty('--pip-start-scale-x', `${pipAnchor.width / finalWidth}`);
            el.style.setProperty('--pip-start-scale-y', `${pipAnchor.height / finalHeight}`);
            el.style.setProperty('--pip-end-x', `${position.x}px`);
            el.style.setProperty('--pip-end-y', `${position.y}px`);

            const onAnimationEnd = () => {
                // This handler ensures a smooth transition from the CSS animation
                // to the React state-driven inline styles, preventing any flicker.
                el.removeEventListener('animationend', onAnimationEnd);

                // Manually apply the final transform. This holds the element in place
                // when the animation class is removed by the upcoming state change.
                el.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;

                // Use requestAnimationFrame to ensure the browser has painted the above
                // style change before React performs its state update and re-render.
                requestAnimationFrame(() => {
                    setAnimationState('entered');
                    setPipAnchor(null);
                });
            };
            el.addEventListener('animationend', onAnimationEnd);
        }
    }, [pipData, pipAnchor, position, animationState, setPipAnchor, finalWidth, finalHeight]);

    const handleContainerClick = () => {
        if (dragClickSafety.current || animationState === 'entering') return;
        if (pipData) {
            navigate('/player', { state: { ...pipData, currentTime: videoRef.current?.currentTime } });
            setPipData(null);
        }
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPipData(null);
    };

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    };
    
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (animationState === 'entering') return;
        isDragging.current = true;
        dragClickSafety.current = false;
        const event = 'touches' in e ? e.touches[0] : e;
        dragStart.current = {
            x: event.clientX - position.x,
            y: event.clientY - position.y,
        };
        const el = containerRef.current;
        
        const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
            if (!isDragging.current || !el) return;
            dragClickSafety.current = true;
            const move = 'touches' in moveEvent ? moveEvent.touches[0] : moveEvent;
            let newX = move.clientX - dragStart.current.x;
            let newY = move.clientY - dragStart.current.y;

            newX = Math.max(16, Math.min(newX, window.innerWidth - el.offsetWidth - 16));
            newY = Math.max(16, Math.min(newY, window.innerHeight - el.offsetHeight - 16 - 64)); // Keep above bottom nav
            setPosition({ x: newX, y: newY });
        };

        const endHandler = () => {
            isDragging.current = false;
            window.removeEventListener('mousemove', moveHandler as any);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchmove', moveHandler as any);
            window.removeEventListener('touchend', endHandler);
            setTimeout(() => { dragClickSafety.current = false }, 50);
        };
        
        window.addEventListener('mousemove', moveHandler as any);
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchmove', moveHandler as any);
        window.addEventListener('touchend', endHandler);
    };
    
    if (!pipData) {
        if (animationState !== 'idle') setAnimationState('idle');
        return null;
    }
    
    const getContainerClass = () => {
        let classes = 'fixed z-[9999] bg-black rounded-xl shadow-2xl cursor-pointer overflow-hidden group';
        if (animationState === 'entering') {
            classes += ' animate-pip-enter';
        } else if (animationState === 'idle' && !pipAnchor) {
            // Fade in if it appears without an animation (e.g., on page reload)
            classes += ' animate-fade-in';
        }
        return classes;
    };
    
    const getContainerStyle = (): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
            top: 0,
            left: 0,
        };

        if (animationState === 'entering') {
            // During animation, the CSS class handles the transform.
            // We only need to set the origin for the scaling effect.
            return {
                ...baseStyle,
                transformOrigin: 'top left',
            };
        }
        
        // After animation or when dragging, we control the position with transform.
        return {
            ...baseStyle,
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            transition: isDragging.current ? 'none' : 'transform 0.3s ease-out',
        };
    };

    return (
        <div
            ref={containerRef}
            onClick={handleContainerClick}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={getContainerClass()}
            style={getContainerStyle()}
        >
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)}/>
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={togglePlay} className="text-white text-3xl drop-shadow-lg">
                    {isPlaying ? <Icons.PauseIcon className="w-8 h-8"/> : <Icons.PlayIcon className="w-8 h-8"/>}
                </button>
            </div>
            <button onClick={handleClose} className="text-white text-xl absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                <i className="fas fa-times-circle bg-black/50 rounded-full"></i>
            </button>
        </div>
    );
};

export default PipPlayer;