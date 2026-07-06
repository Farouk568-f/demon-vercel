

import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export const PlayIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M8 5v14l11-7z"></path>
    </svg>
);

export const PauseIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
    </svg>
);

export const RewindIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M11.02 2.048A10 10 0 1 1 2 12H0a12 12 0 1 0 5-9.747V1H3v4a1 1 0 0 0 1 1h4V4H6a10 10 0 0 1 5.02-1.952ZM2 4v3h3v2H1a1 1 0 0 1-1-1V4h2Zm12.125 12c-.578 0-1.086-.141-1.523-.424-.43-.29-.764-.694-.999-1.215-.235-.527-.353-1.148-.353-1.861 0-.707.118-1.324.353-1.851.236-.527.568-.932.999-1.215.437-.29.945-.434 1.523-.434s1.083.145 1.513.434c.437.283.774.688 1.009 1.215.235.527.353 1.144.353 1.851 0 .713-.118 1.334-.353 1.86-.235.522-.572.927-1.009 1.216-.43.283-.935.424-1.513.424Zm0-1.35c.39 0 .696-.186.918-.56.222-.378.333-.909.333-1.59s-.111-1.208-.333-1.581c-.222-.38-.528-.57-.918-.57s-.696.19-.918.57c-.222.373-.333.9-.333 1.581 0 .681.111 1.212.333 1.59.222.374.528.56.918.56Zm-5.521 1.205v-5.139L7 11.141V9.82l3.198-.8v6.835H8.604Z" fill="currentColor"></path>
    </svg>
);

export const ForwardIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M6.444 3.685A10 10 0 0 1 18 4h-2v2h4a1 1 0 0 0 1-1V1h-2v1.253A12 12 0 1 0 24 12h-2A10 10 0 1 1 6.444 3.685ZM22 4v3h-3v2h4a1 1 0 0 0 1-1V4h-2Zm-9.398 11.576c.437.283.945.424 1.523.424s1.083-.141 1.513-.424c.437-.29.774-.694 1.009-1.215.235-.527.353-1.148.353-1.861 0-.707-.118-1.324-.353-1.851-.235-.527-.572-.932-1.009-1.215-.43-.29-.935-.434-1.513-.434-.578 0-1.086.145-1.523.434-.43.283-.764.688-.999 1.215-.235.527-.353 1.144-.353 1.851 0 .713.118 1.334-.353 1.86.236.522.568.927.999 1.216Zm2.441-1.485c-.222.373-.528.56-.918.56s-.696-.187-.918-.56c-.222-.38-.333-.91-.333-1.591 0-.681.111-1.208.333-1.581.222-.38.528-.57.918-.57s.696.19.918.57c.222.373.333.9.333 1.581 0 .681-.111 1.212-.333 1.59Zm-6.439-3.375v5.14h1.594V9.018L7 9.82v1.321l1.604-.424Z" fill="currentColor"></path>
    </svg>
);

export const SettingsIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.5.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.5-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path>
    </svg>
);

export const CCIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2v-.5H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2v-.5H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"></path>
    </svg>
);

export const EnterFullscreenIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M0 5a2 2 0 0 1 2-2h7v2H2v4H0V5Zm22 0h-7V3h7a2 2 0 0 1 2 2v4h-2V5ZM2 15v4h7v2H2a2 2 0 0 1-2-2v-4h2Zm20 4v-4h2v4a2 2 0 0 1-2 2h-7v-2h7Z" fill="currentColor"></path>
    </svg>
);

export const ExitFullscreenIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M3 8V3h5v2H5v3H3Zm18 0h-5V3h5v5h-2V5h-3v3Zm-3 13v-3h3v-2h-5v5h2Zm-15 0h5v-2H5v-3H3v5h2Z" fill="currentColor"></path>
    </svg>
);

export const SaveIcon: React.FC<IconProps & {isSaved: boolean}> = ({ isSaved, ...props }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        {isSaved ? (
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"></path>
        ) : (
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"></path>
        )}
    </svg>
);

export const BackIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
    </svg>
);

export const PipIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/>
    </svg>
);

export const VolumeMuteIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path>
    </svg>
);

export const VolumeHighIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M24 12a14 14 0 0 0-4.1-9.9l-1.415 1.415a12 12 0 0 1 0 16.97L19.9 21.9A14 14 0 0 0 24 12ZM11 4a1 1 0 0 0-1.707-.707L4.586 8H1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3.586l4.707 4.707A1 1 0 0 0 11 20V4ZM5.707 9.707 9 6.414v11.172l-3.293-3.293L5.414 14H2v-4h3.414l.293-.293ZM16 12a6 6 0 0 0-1.757-4.243l-1.415 1.415a4 4 0 0 1 0 5.656l1.415 1.415A6 6 0 0 0 16 12Zm1.07-7.071a10 10 0 0 1 0 14.142l-1.413-1.414a8 8 0 0 0 0-11.314L17.07 4.93Z" fill="currentColor"></path>
    </svg>
);

export const CameraIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <circle cx="12" cy="12" r="3.2"/>
        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
    </svg>
);

export const QualityIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8 17H6v-2h2v2zm0-3H6v-2h2v2zm0-3H6V9h2v2zm0-3H6V6h2v2zm5 9h-3V6h3v11zm4 0h-2V6h2v11z"/>
    </svg>
);

export const LanguageIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
    </svg>
);

// Note: These icons are not simple paths and are kept for their specific functionality/style
export const LikeIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" fill="currentColor" {...props}>
       <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path>
    </svg>
);
export const DislikeIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" fill="currentColor" {...props}>
        <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path>
    </svg>
);
export const AddToPlaylistIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" fill="currentColor" {...props}>
        <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"></path>
    </svg>
);
export const ShareIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" {...props}>
        <path d="M15 5.63 20.66 12 15 18.37V14h-1c-3.96 0-7.14 1-9.75 3.09 1.84-4.07 5.11-6.4 9.89-7.1l.86-.13V5.63M14 3v6C6.22 10.13 3.11 15.33 2 21c2.78-3.97 6.44-6 12-6v6l8-9-8-9z"></path>
    </svg>
);
export const AutoplayToggle: React.FC<{checked: boolean, onChange: () => void}> = ({ checked, onChange }) => (
    <button onClick={onChange} className="flex items-center gap-2" aria-label={`Autoplay is ${checked ? 'on' : 'off'}`} aria-pressed={checked}>
        <svg width="36" height="20" viewBox="0 0 36 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="34" height="18" rx="9" fill={checked ? 'var(--primary)' : '#717171'} fillOpacity={checked ? '1' : '0.5'} stroke={checked ? 'var(--primary)' : '#717171'} strokeWidth="2"/>
            <path d="M23.5 6.5L23.5 13.5L28.5 10L23.5 6.5Z" fill={'white'}/>
            <path d="M11 7H13V13H11V7Z" fill={'white'}/>
            <path d="M15 7H17V13H15V7Z" fill={'white'}/>
        </svg>
    </button>
);
