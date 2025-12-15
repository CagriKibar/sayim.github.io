import React, { useState, useEffect, useRef } from 'react';
import { useZxing } from "react-zxing";
import { AlertCircle, Zap, ZapOff, ZoomIn, ZoomOut, Sun, Moon, Focus, ScanLine } from 'lucide-react';

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

    // Zoom
    const [zoom, setZoom] = useState(1);
    const [maxZoom, setMaxZoom] = useState(1);

    // Exposure (Brightness/Diyafram)
    const [exposure, setExposure] = useState(0);
    const [minExposure, setMinExposure] = useState(0);
    const [maxExposure, setMaxExposure] = useState(0);
    const [stepExposure, setStepExposure] = useState(1);
    const [hasExposure, setHasExposure] = useState(false);

    // Focus
    const [focusMode, setFocusMode] = useState<string>("continuous");
    const [hasFocusControl, setHasFocusControl] = useState(false);

    const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);

    const { ref } = useZxing({
        onDecodeResult(result) {
            const code = result.getText();
            const now = Date.now();

            if (code === lastScanned && now - lastScanTime < 1500) {
                return;
            }

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
                focusMode: "continuous",
                // @ts-ignore
                exposureMode: "continuous",
            }
        },
        hints: new Map<any, any>([
            [2, true],
            [3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]]
        ]),
        timeBetweenDecodingAttempts: 50
    });

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
                    // @ts-ignore
                    const settings = track.getSettings ? track.getSettings() : {};

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
                        // @ts-ignore
                        if (settings.zoom) setZoom(settings.zoom);
                    }

                    // Check Exposure
                    // @ts-ignore
                    if (capabilities.exposureCompensation) {
                        setHasExposure(true);
                        // @ts-ignore
                        setMinExposure(capabilities.exposureCompensation.min);
                        // @ts-ignore
                        setMaxExposure(capabilities.exposureCompensation.max);
                        // @ts-ignore
                        setStepExposure(capabilities.exposureCompensation.step);
                        // @ts-ignore
                        if (settings.exposureCompensation) setExposure(settings.exposureCompensation);
                    }

                    // Check Focus
                    // @ts-ignore
                    if (capabilities.focusMode && capabilities.focusMode.length > 0) {
                        setHasFocusControl(true);
                    }
                }
            }
        };

        videoElement.addEventListener('loadedmetadata', checkCapabilities);
        return () => {
            videoElement.removeEventListener('loadedmetadata', checkCapabilities);
        };
    }, [ref]);

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        setZoom(newZoom);
        if (videoTrack) {
            // @ts-ignore
            videoTrack.applyConstraints({ advanced: [{ zoom: newZoom }] }).catch(e => console.log("Zoom error:", e));
        }
    };

    const handleExposureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newExp = parseFloat(e.target.value);
        setExposure(newExp);
        if (videoTrack) {
            // @ts-ignore
            videoTrack.applyConstraints({ advanced: [{ exposureCompensation: newExp }] }).catch(e => console.log("Exposure error:", e));
        }
    }

    const toggleFocusMode = () => {
        if (!videoTrack) return;
        // Simple toggle between continuous (Macro-ish) and manual/single-shot if supported
        // Or just re-trigger continuous to 'refocus'
        const newMode = focusMode === "continuous" ? "manual" : "continuous";
        setFocusMode(newMode);

        // Note: 'manual' isn't always supported, this is a best-effort toggle
        // Ideally we'd set focusDistance if in manual mode

        const constraint = newMode === "continuous"
            ? { focusMode: "continuous" }
            : { focusMode: "manual", focusDistance: 0.0 }; // Try to force close focus for Macro when toggled?

        // @ts-ignore
        videoTrack.applyConstraints({ advanced: [constraint] }).catch(async (e) => {
            console.log("Focus toggle error, trying basic apply", e);
            // Fallback
            // @ts-ignore
            await videoTrack.applyConstraints({ focusMode: newMode });
        });
    };

    const toggleTorch = () => {
        if (videoTrack) {
            const newTorchState = !isTorchOn;
            setIsTorchOn(newTorchState);
            // @ts-ignore
            videoTrack.applyConstraints({ advanced: [{ torch: newTorchState }] }).catch(e => {
                console.log("Torch error:", e);
                setIsTorchOn(!newTorchState);
            });
        }
    };

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800 ring-2 ring-red-500/20 group">
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                    <AlertCircle size={48} className="text-red-500 mb-2" />
                    <p>{error}</p>
                </div>
            ) : (
                <>
                    <video
                        ref={ref}
                        className="w-full h-full object-cover transform scale-105"
                        playsInline
                        muted
                    />

                    {/* High-Tech Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]"></div>
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'linear-gradient(#0f0 1px, transparent 1px), linear-gradient(90deg, #0f0 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                        </div>

                        {/* Focus Reticle */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[40%] transition-all duration-500 ${focusMode === 'manual' ? 'border-2 border-yellow-500/50' : ''}`}>
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg animate-pulse"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg animate-pulse"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg animate-pulse"></div>
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-red-600 shadow-[0_0_15px_rgba(255,0,0,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                        </div>

                        {/* HUD */}
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
                                    {focusMode === 'continuous' ? 'AUTO-FOCUS SEARCHING...' : 'MANUAL FOCUS LOCKED'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Top Controls (Torch & Focus) */}
                    <div className="absolute top-6 right-6 flex flex-col gap-4 z-30">
                        {hasTorch && (
                            <button
                                onClick={toggleTorch}
                                className={`p-3 rounded-full backdrop-blur-md border transition-all duration-300 ${isTorchOn
                                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(255,200,0,0.5)]'
                                    : 'bg-black/40 border-white/10 text-white/70 hover:bg-black/60'
                                    }`}
                            >
                                {isTorchOn ? <Zap size={24} fill="currentColor" /> : <ZapOff size={24} />}
                            </button>
                        )}
                        {hasFocusControl && (
                            <button
                                onClick={toggleFocusMode}
                                className={`p-3 rounded-full backdrop-blur-md border transition-all duration-300 ${focusMode === 'continuous'
                                    ? 'bg-green-500/20 border-green-500 text-green-400'
                                    : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                    }`}
                            >
                                {focusMode === 'continuous' ? <ScanLine size={24} /> : <Focus size={24} />}
                            </button>
                        )}
                    </div>

                    {/* Bottom Controls (Zoom & Exposure) */}
                    <div className="absolute bottom-6 left-0 right-0 px-6 flex flex-col gap-3 items-center z-20">

                        {/* Exposure Control */}
                        {hasExposure && (
                            <div className="w-full max-w-[240px] flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                <Moon size={14} className="text-white/60" />
                                <input
                                    type="range"
                                    min={minExposure}
                                    max={maxExposure}
                                    step={stepExposure}
                                    value={exposure}
                                    onChange={handleExposureChange}
                                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                                <Sun size={14} className="text-yellow-200" />
                            </div>
                        )}

                        {/* Zoom Control */}
                        {maxZoom > 1 && (
                            <div className="w-full max-w-[240px] flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                <ZoomOut size={14} className="text-white/60" />
                                <input
                                    type="range"
                                    min="1"
                                    max={maxZoom}
                                    step="0.1"
                                    value={zoom}
                                    onChange={handleZoomChange}
                                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                                <ZoomIn size={14} className="text-white/60" />
                            </div>
                        )}

                        <p className="text-white/[0.6] text-[10px] bg-black/40 px-3 py-1 rounded-full uppercase tracking-widest border border-white/5">
                            Optical System V2.1
                        </p>
                    </div>
                </>
            )}
            <style>{`
                @keyframes scan {
                    0%, 100% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default BarcodeScanner;
