

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Hls from 'hls.js';
import { Movie, ChatMessage, Profile } from '../types';
import { fetchFromTMDB, fetchStreamUrl } from '../services/apiService';
import { useTranslation } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { IMAGE_BASE_URL, POSTER_SIZE } from '../contexts/constants';

const DUMMY_USERS = [
    { name: 'Yasmine', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    { name: 'Omar', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e' },
    { name: 'Amina', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f' },
    { name: 'Karim', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704a' },
    { name: 'Lina', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704b' },
];

const DUMMY_COMMENTS = [ "Wow!", "This scene is amazing!", "I didn't see that coming.", "Who's your favorite character?", "Incredible acting.", "LOL", "🔥🔥🔥", "This is epic!", "I love this movie.", "Can't believe it." ];

const LiveVideo: React.FC<{ streamUrl: string | null; isMuted: boolean; isFullscreen: boolean; setVideoNode: (node: HTMLVideoElement | null) => void; }> = ({ streamUrl, isMuted, isFullscreen, setVideoNode }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls.default | null>(null);

    const combinedRef = useCallback((node: HTMLVideoElement | null) => {
        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
        if (setVideoNode) {
            setVideoNode(node);
        }
    }, [setVideoNode]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !streamUrl) return;

        if (streamUrl.includes('.m3u8')) {
            if (Hls.default.isSupported()) {
                if(hlsRef.current) hlsRef.current.destroy();
                const hls = new Hls.default({ enableWorker: true });
                hlsRef.current = hls;
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.default.Events.MANIFEST_PARSED, () => {
                    video.play().catch(e => console.log("Autoplay blocked", e));
                });
            }
        } else {
            video.src = streamUrl;
            video.play().catch(e => console.log("Autoplay blocked", e));
        }

        return () => hlsRef.current?.destroy();
    }, [streamUrl]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = isMuted;
    }, [isMuted]);

    return (
        <video
            ref={combinedRef}
            className={`w-full h-full ${isFullscreen ? 'object-cover' : 'object-contain'}`}
            playsInline
            loop
        />
    );
};

const ChatComment: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
    const { t } = useTranslation();
    if (msg.isJoin) {
        return (
             <div className="p-2 text-center text-xs text-yellow-300 font-semibold animate-chat-in">
                <strong>{msg.user.name}</strong> {t('join')}ed the room.
            </div>
        )
    }
    return (
        <div className="flex items-start gap-3 p-2 animate-chat-in">
            <img src={msg.user.avatar} alt={msg.user.name} className="w-8 h-8 rounded-full border border-zinc-700" />
            <div className="flex-1">
                <p className="text-xs text-zinc-400 font-semibold">{msg.user.name}</p>
                <p className="text-sm text-white break-words">{msg.text}</p>
            </div>
        </div>
    );
};

const LiveRoomPage: React.FC = () => {
    const { type, id } = useParams<{ type: 'movie' | 'tv', id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { activeProfile } = useProfile();
    const [item, setItem] = useState<Movie | null>(null);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hearts, setHearts] = useState<{ id: number }[]>([]);
    const [isMuted, setIsMuted] = useState(true);
    const [viewers, setViewers] = useState(Math.floor(Math.random() * 3000) + 500);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const video = videoNode;
        const canvas = canvasRef.current;

        if (!video || !canvas || isFullscreen) {
            const ctx = canvas?.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const drawFrame = () => {
             if (canvas.width > 0 && canvas.height > 0) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
        };

        const animate = () => {
            if (video.paused || video.ended || isFullscreen) {
                cancelAnimationFrame(animationFrameId);
                return;
            }
            drawFrame();
            animationFrameId = requestAnimationFrame(animate);
        };

        const handlePlay = () => requestAnimationFrame(animate);
        const handlePause = () => {
            cancelAnimationFrame(animationFrameId);
            drawFrame();
        };
        const handleSeeked = () => {
            if (video.paused) {
                drawFrame();
            }
        };
        const handleLoadedData = () => {
            drawFrame();
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('loadeddata', handleLoadedData);

        if (video.readyState >= 2) {
            drawFrame();
            if (!video.paused) {
                handlePlay();
            }
        }
        
        return () => {
            cancelAnimationFrame(animationFrameId);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('loadeddata', handleLoadedData);
        };
    }, [videoNode, isFullscreen]);

    useEffect(() => {
        if (!type || !id) {
            navigate('/cinema');
            return;
        }
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const itemData = await fetchFromTMDB(`/${type}/${id}`);
                setItem(itemData);
                const streamData = await fetchStreamUrl(itemData, type as 'movie' | 'tv');
                setStreamUrl(streamData.links[0]?.url);
            } catch (error) {
                console.error("Failed to load live room", error);
                navigate('/cinema');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [type, id, navigate]);

    useEffect(() => {
        const chatInterval = setInterval(() => {
            const randomUser = DUMMY_USERS[Math.floor(Math.random() * DUMMY_USERS.length)];
            const isJoinMessage = Math.random() > 0.95;
            const newMsg: ChatMessage = {
                id: Date.now() + Math.random(),
                user: randomUser,
                text: isJoinMessage ? '' : DUMMY_COMMENTS[Math.floor(Math.random() * DUMMY_COMMENTS.length)],
                isJoin: isJoinMessage,
            };
            setMessages(prev => [...prev.slice(-100), newMsg]);
        }, 3500);

        const viewerInterval = setInterval(() => {
            setViewers(v => Math.max(100, v + Math.floor(Math.random() * 11) - 5));
        }, 5000);

        return () => {
            clearInterval(chatInterval);
            clearInterval(viewerInterval);
        };
    }, []);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages]);

    const addHeart = useCallback(() => {
        setHearts(h => [...h, { id: Date.now() + Math.random() }]);
        setTimeout(() => setHearts(h => h.slice(1)), 2000);
    }, []);

    const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem('chat-input') as HTMLInputElement;
        if (input.value.trim() && activeProfile) {
            const newMsg: ChatMessage = {
                id: Date.now(),
                user: { name: activeProfile.name, avatar: activeProfile.avatar },
                text: input.value.trim(),
            };
            setMessages(prev => [...prev, newMsg]);
            input.value = '';
        }
    };

    const handlePlayerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFullscreen) return;

        if (!tapTimeout.current) {
            // First tap
            tapTimeout.current = setTimeout(() => {
                // If timeout runs, it's a single tap
                setIsMuted(prev => !prev);
                tapTimeout.current = null;
            }, 250);
        } else {
            // Second tap (double tap)
            clearTimeout(tapTimeout.current);
            tapTimeout.current = null;
            setIsFullscreen(true);
        }
    };
    
    const formatCount = (num: number) => {
        if (num >= 1000) return (num/1000).toFixed(1) + 'K';
        return num.toString();
    }

    if (isLoading || !item) {
        return (
            <div className="h-dvh w-screen bg-black flex items-center justify-center">
                <div className="w-16 h-16 border-t-2 border-[var(--primary)] rounded-full animate-spin"></div>
            </div>
        );
    }
    
    return (
        <div 
            className="h-dvh w-screen bg-black flex flex-col text-white"
            onClick={isFullscreen ? () => setIsFullscreen(false) : undefined}
        >
            {/* Video Player Section */}
            <div 
                className={`w-full bg-black relative flex-shrink-0 shadow-lg transition-all duration-300 group ${isFullscreen ? 'fixed inset-0 z-10' : 'aspect-video'}`}
            >
                <LiveVideo streamUrl={streamUrl} isMuted={isMuted} isFullscreen={isFullscreen} setVideoNode={setVideoNode} />
                <div className="absolute inset-0" onClick={handlePlayerClick}></div>
                
                {!isFullscreen && (
                     <canvas
                        ref={canvasRef}
                        className="absolute inset-x-0 top-full w-full h-32 opacity-30 blur-2xl pointer-events-none"
                        style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}
                        width="320"
                        height="180"
                    />
                )}
                 
                {/* Muted State Overlay */}
                {isMuted && !isFullscreen && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 pointer-events-none transition-opacity duration-300 group-hover:bg-black/50">
                        <i className="fa-solid fa-volume-xmark text-4xl text-white drop-shadow-lg"></i>
                        <p className="text-white font-semibold mt-3 drop-shadow-lg">Tap to unmute</p>
                    </div>
                )}

                {/* Normal Mode UI */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${!isFullscreen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent"></div>
                    <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm btn-press z-10">
                        <i className="fa-solid fa-times"></i>
                    </button>
                    <div className="absolute top-4 left-4 px-2.5 py-1 text-xs font-bold text-white bg-red-600 rounded-md shadow-lg flex items-center gap-1.5 animate-pulse-live">
                        {t('live')}
                    </div>
                     <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <button className="w-16 h-16 flex items-center justify-center rounded-full bg-black/50 text-white text-3xl backdrop-blur-sm">
                            <i className="fa-solid fa-expand"></i>
                        </button>
                    </div>
                </div>

                {/* Fullscreen Mode UI */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${isFullscreen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent"></div>
                    <button onClick={() => setIsFullscreen(false)} className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm btn-press z-30">
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                </div>
            </div>

            {/* Content & Chat Section */}
            <div 
                className={`flex flex-col overflow-hidden transition-all duration-300 ${isFullscreen 
                    ? 'fixed top-0 right-0 bottom-0 w-full max-w-sm bg-gradient-to-l from-black/80 via-black/70 to-transparent z-20 p-4 pt-16 animate-fade-in' 
                    : 'flex-1 p-3 md:p-4 gap-3'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Host Info & Viewers (Normal Mode Only) */}
                {!isFullscreen && (
                    <>
                        <div className="flex items-center gap-3 flex-shrink-0 animate-fade-in-up">
                            <img src={`${IMAGE_BASE_URL}${POSTER_SIZE}${item.poster_path}`} alt={item.title || item.name} className="w-14 h-14 rounded-full border-2 border-zinc-700" />
                            <div className="flex-1">
                                <h2 className="font-bold text-base line-clamp-1">{item.title || item.name}</h2>
                                <p className="text-xs text-gray-400">{formatCount(viewers * 17)} {t('followers')}</p>
                            </div>
                            <button className="px-5 py-2.5 text-sm font-bold bg-[var(--primary)] rounded-full ml-2 btn-press">{t('follow')}</button>
                        </div>
                        <div className="overflow-x-auto no-scrollbar flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '100ms'}}>
                            <div className="flex items-center gap-2 pb-2">
                                <div className="flex items-center gap-1.5 p-2 px-3 text-xs font-bold rounded-full bg-white/10">
                                    <i className="fa-solid fa-eye text-green-400"></i>
                                    <span>{formatCount(viewers)}</span>
                                </div>
                                {DUMMY_USERS.map((user, i) => <img key={i} src={user.avatar} alt={user.name} title={user.name} className="w-9 h-9 rounded-full border-2 border-zinc-800"/>)}
                                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white font-bold text-xs flex-shrink-0">...</div>
                            </div>
                        </div>
                    </>
                )}

                {/* Chat Area */}
                <div className={`flex-1 overflow-hidden relative ${isFullscreen ? 'border-t border-white/10 pt-3' : 'animate-fade-in-up'}`} style={{ animationDelay: isFullscreen ? '0' : '200ms'}}>
                    <div ref={chatScrollRef} className="absolute inset-0 overflow-y-scroll no-scrollbar [mask-image:linear-gradient(to_top,black_80%,transparent_100%)]">
                        <div className="flex flex-col justify-end min-h-full p-1">
                           <div className="p-2 text-center text-xs text-purple-300 font-semibold animate-chat-in">
                                {t('welcomeToCinema', {name: item.title || item.name})}
                           </div>
                           {messages.map(msg => <ChatComment key={msg.id} msg={msg} />)}
                        </div>
                    </div>
                </div>

                {/* Floating Hearts Area */}
                {!isFullscreen && (
                    <div className="absolute bottom-16 right-16 md:bottom-20 md:right-20 h-64 w-20 pointer-events-none z-20">
                        {hearts.map(heart => <div key={heart.id} className="absolute bottom-0 text-red-500 text-3xl animate-float-up" style={{left: `${Math.random()*60}%`}}><i className="fas fa-heart"></i></div>)}
                    </div>
                )}

                {/* Footer Actions */}
                <footer className={`flex items-center gap-2 md:gap-3 flex-shrink-0 ${isFullscreen ? 'mt-3' : 'animate-fade-in-up'}`} style={{ animationDelay: isFullscreen ? '0' : '300ms'}}>
                    <form onSubmit={handleSendMessage} className="flex-1">
                        <input
                            name="chat-input"
                            type="text"
                            placeholder={t('typeSomething')}
                            className="w-full h-12 px-4 bg-zinc-800 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-zinc-400"
                        />
                    </form>
                    {!isFullscreen && (
                        <>
                            <button onClick={addHeart} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-zinc-800 rounded-full btn-press"><i className="fa-solid fa-heart text-xl text-red-500"></i></button>
                            <button className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-zinc-800 rounded-full btn-press"><i className="fa-solid fa-gift text-xl text-yellow-400"></i></button>
                            <button className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-zinc-800 rounded-full btn-press"><i className="fa-solid fa-share text-xl text-white"></i></button>
                        </>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default LiveRoomPage;
