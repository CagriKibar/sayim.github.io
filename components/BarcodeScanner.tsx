
import React, { useState, useEffect, useRef } from 'react';
import { useZxing } from "react-zxing";
import { AlertCircle, Zap, ZapOff, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
    const [error, setError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string>("");
    const [lastScanTime, setLastScanTime] = useState<number>(0);

    // Camera capabilities state
    const [hasTorch, setHasTorch] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [maxZoom, setMaxZoom] = useState(1);
    const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);

    const { ref } = useZxing({
        onDecodeResult(result) {
            const code = result.getText();
            const now = Date.now();

            // Prevent duplicate scans within 1.5 seconds
            if (code === lastScanned && now - lastScanTime < 1500) {
                return;
            }

            // Feedback logic
            try {
                if (navigator.vibrate) navigator.vibrate([10, 50, 10]);

                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContext) {
                    const ctx = new AudioContext();
                    const osc1 = ctx.createOscillator();
                    const gain1 = ctx.createGain();
                    osc1.connect(gain1);
                    gain1.connect(ctx.destination);
                    osc1.frequency.setValueAtTime(800, ctx.currentTime);
                    gain1.gain.setValueAtTime(0.1, ctx.currentTime);
                    osc1.start();
                    osc1.stop(ctx.currentTime + 0.1);

                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
                    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.1);
                    osc2.start(ctx.currentTime + 0.1);
                    osc2.stop(ctx.currentTime + 0.25);
                }
            } catch (e) {
                // Ignore audio errors
            }

            setLastScanTime(now);
            setLastScanned(code);
            onScan(code);
        },
        onError(err) {
            const error = err as any;
            if (error.name !== "NotFoundException" && error.name !== "ChecksumException" && error.name !== "FormatException") {
                console.error(error);
                if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
                    setError("Kamera erişimi sağlanamadı. Lütfen izinleri kontrol edin.");
                }
            }
        },
        constraints: {
            video: {
                facingMode: "environment",
                height: { min: 720, ideal: 1080 },
                width: { min: 1280, ideal: 1920 },
                // @ts-ignore
                focusMode: "continuous", // Attempt to force continuous focus
            }
        },
        hints: new Map<any, any>([
            [2, true], // TRY_HARDER
            [3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]] // ALL_FORMATS
        ]),
        timeBetweenDecodingAttempts: 50
    });

    // Hook to extract video track and capabilities once stream is active
    useEffect(() => {
        const videoElement = ref.current;
        if (!videoElement) return;

        const checkCapabilities = () => {
            const stream = videoElement.srcObject as MediaStream;
            if (stream) {
                const track = stream.getVideoTracks()[0];
                if (track) {
                    setVideoTrack(track);
                    const capabilities = track.getCapabilities ? track.getCapabilities() : {};

                    // Check Torch
                    // @ts-ignore
                    if (capabilities.torch) {
                        setHasTorch(true);
                    }

                    // Check Zoom
                    // @ts-ignore
                    if (capabilities.zoom) {
                        // @ts-ignore
                        setMaxZoom(capabilities.zoom.max || 1);
                    }
                }
            }
        };

        videoElement.addEventListener('loadedmetadata', checkCapabilities);
        return () => {
            videoElement.removeEventListener('loadedmetadata', checkCapabilities);
        };
    }, [ref]);

    // Handle Zoom
    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        setZoom(newZoom);
        if (videoTrack) {
            // @ts-ignore
            videoTrack.applyConstraints({ advanced: [{ zoom: newZoom }] }).catch(e => console.log("Zoom error:", e));
        }
    };

    // Handle Torch
    const toggleTorch = () => {
        if (videoTrack) {
            const newTorchState = !isTorchOn;
            setIsTorchOn(newTorchState);
            // @ts-ignore
            videoTrack.applyConstraints({ advanced: [{ torch: newTorchState }] }).catch(e => {
                console.log("Torch error:", e);
                setIsTorchOn(!newTorchState); // Revert on failure
            });
        }
    };

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800 ring-2 ring-red-500/20">
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                    <AlertCircle size={48} className="text-red-500 mb-2" />
                    <p>{error}</p>
                </div>
            ) : (
                <>
                    <video
                        ref={ref}
                        className="w-full h-full object-cover transform scale-105" // Slight scale to avoid edges
                        playsInline
                        muted
                    />

                    {/* High-Tech Overlay Layer */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Dark Vignette */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]"></div>

                        {/* Grid Pattern */}
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'linear-gradient(#0f0 1px, transparent 1px), linear-gradient(90deg, #0f0 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                        </div>

                        {/* Central Focus Rect */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[40%]">
                            {/* Animated Corners */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg animate-pulse"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg animate-pulse"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg animate-pulse"></div>

                            {/* Scanning Laser Line */}
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-red-600 shadow-[0_0_15px_rgba(255,0,0,1)] animate-[scan_2s_ease-in-out_infinite]"></div>

                            {/* Center Crosshair */}
                            <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2">
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50"></div>
                                <div className="absolute left-1/2 top-0 h-full w-0.5 bg-red-500/50"></div>
                            </div>
                        </div>

                        {/* Status Text & Dynamic HUD */}
                        <div className="absolute top-8 left-0 right-0 text-center space-y-2 pointer-events-none">
                            <p className="text-red-500 font-mono text-xs tracking-[0.2em] font-bold animate-pulse">
                                © SYSTEM ACTIVE
                            </p>
                            {lastScanned && (Date.now() - lastScanTime < 2000) ? (
                                <div className="animate-bounce">
                                    <p className="text-green-400 font-mono text-sm font-bold tracking-widest bg-black/80 inline-block px-4 py-1 rounded border border-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]">
                                        TARGET ACQUIRED: {lastScanned}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-white/70 text-[10px] font-mono tracking-widest uppercase">
                                    Scanning Sector...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Torch Button (Top Right) */}
                    {hasTorch && (
                        <div className="absolute top-6 right-6 z-30">
                            <button
                                onClick={toggleTorch}
                                className={`p-3 rounded-full backdrop-blur-md border transition-all duration-300 ${isTorchOn
                                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(255,200,0,0.5)]'
                                    : 'bg-black/40 border-white/10 text-white/70 hover:bg-black/60'
                                    }`}
                            >
                                {isTorchOn ? <Zap size={24} fill="currentColor" /> : <ZapOff size={24} />}
                            </button>
                        </div>
                    )}

                    {/* Controls Layer */}
                    <div className="absolute bottom-6 left-0 right-0 px-6 flex flex-col gap-4 items-center z-20">
                        {/* Zoom Control Slider */}
                        {maxZoom > 1 && (
                            <div className="w-full max-w-[200px] flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/10">
                                <ZoomOut size={16} className="text-white/80" />
                                <input
                                    type="range"
                                    min="1"
                                    max={maxZoom}
                                    step="0.1"
                                    value={zoom}
                                    onChange={handleZoomChange}
                                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                                <ZoomIn size={16} className="text-white/80" />
                            </div>
                        )}

                        {/* Instructions */}
                        <p className="text-white text-xs bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10 shadow-lg">
                            Hizalama: <span className="text-red-400 font-bold">OTOMATİK</span>
                        </p>
                    </div>

                    <style>{`
                        @keyframes scan {
                            0%, 100% { top: 0%; opacity: 0; }
                            10% { opacity: 1; }
                            90% { opacity: 1; }
                            100% { top: 100%; opacity: 0; }
                        }
                    `}</style>
                </>
            )}
        </div>
    );
};

export default BarcodeScanner;
