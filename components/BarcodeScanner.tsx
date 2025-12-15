import React, { useState, useEffect, useRef } from 'react';
import { useZxing } from "react-zxing";
import { AlertCircle, Zap, ZapOff, ZoomIn, ZoomOut, Sun, Moon, Focus, ScanLine, Eye, Settings2 } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
}

type ScanMode = 'AUTO' | 'MACRO' | 'MANUAL';

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

    // Exposure (Brightness)
    const [exposure, setExposure] = useState(0);
    const [minExposure, setMinExposure] = useState(0);
    const [maxExposure, setMaxExposure] = useState(0);
    const [stepExposure, setStepExposure] = useState(1);
    const [hasExposure, setHasExposure] = useState(false);

    // Focus System
    const [scanMode, setScanMode] = useState<ScanMode>('AUTO');
    const [focusDistance, setFocusDistance] = useState(0.0);
    const [minFocusDistance, setMinFocusDistance] = useState(0.0);
    const [maxFocusDistance, setMaxFocusDistance] = useState(1.0);
    const [stepFocusDistance, setStepFocusDistance] = useState(0.05);
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
            } catch (e) { }

            setLastScanTime(now);
            setLastScanned(code);
            onScan(code);
        },
        onError(err) {
            // Suppress errors, normal in a scan loop
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
                // @ts-ignore
                whiteBalanceMode: "continuous"
            }
        },
        hints: new Map<any, any>([
            [2, true], // TRY_HARDER
            [3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]] // ALL_FORMATS
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

                    // Zoom
                    // @ts-ignore
                    if (capabilities.zoom) {
                        // @ts-ignore
                        setMaxZoom(capabilities.zoom.max || 1);
                        // @ts-ignore
                        if (settings.zoom) setZoom(settings.zoom);
                    }

                    // Exposure
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

                    // Focus
                    // @ts-ignore
                    if (capabilities.focusDistance || (capabilities.focusMode && capabilities.focusMode.length > 0)) {
                        setHasFocusControl(true);
                        // @ts-ignore
                        if (capabilities.focusDistance) {
                            // @ts-ignore
                            setMinFocusDistance(capabilities.focusDistance.min || 0.0);
                            // @ts-ignore
                            setMaxFocusDistance(capabilities.focusDistance.max || 1.0);
                            // @ts-ignore
                            setStepFocusDistance(capabilities.focusDistance.step || 0.05);
                        }
                    }

                    // Torch
                    // @ts-ignore
                    if (capabilities.torch) setHasTorch(true);
                }
            }
        };

        videoElement.addEventListener('loadedmetadata', checkCapabilities);
        return () => {
            videoElement.removeEventListener('loadedmetadata', checkCapabilities);
        };
    }, [ref]);

    const applyConstraints = (constraints: any) => {
        if (videoTrack) {
            // @ts-ignore
            videoTrack.applyConstraints({ advanced: [constraints] }).catch(err => console.log("Constraint error:", err));
        }
    };

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setZoom(val);
        applyConstraints({ zoom: val });
    };

    const handleExposureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setExposure(val);
        applyConstraints({ exposureCompensation: val });
    };

    const handleFocusDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setFocusDistance(val);
        // Force manual mode when using slider
        if (scanMode !== 'MANUAL') {
            setScanMode('MANUAL');
            // @ts-ignore
            videoTrack?.applyConstraints({ focusMode: "manual" });
        }
        applyConstraints({ focusMode: "manual", focusDistance: val });
    };

    const cycleScanMode = async () => {
        if (!videoTrack) return;

        let newMode: ScanMode = 'AUTO';
        if (scanMode === 'AUTO') newMode = 'MACRO';
        else if (scanMode === 'MACRO') newMode = 'MANUAL';
        else newMode = 'AUTO';

        setScanMode(newMode);

        try {
            if (newMode === 'AUTO') {
                // @ts-ignore
                await videoTrack.applyConstraints({ focusMode: "continuous" });
            } else if (newMode === 'MACRO') {
                // Try to force close focus. On some devices "macro" is a mode, on others we set distance 0
                // @ts-ignore
                await videoTrack.applyConstraints({ focusMode: "macro" }).catch(() => {
                    // @ts-ignore
                    return videoTrack.applyConstraints({ advanced: [{ focusMode: "manual", focusDistance: 0.0 }] });
                });
            } else if (newMode === 'MANUAL') {
                // @ts-ignore
                await videoTrack.applyConstraints({ focusMode: "manual" });
            }
        } catch (e) {
            console.error("Mode switch error", e);
        }
    };

    const toggleTorch = () => {
        const newState = !isTorchOn;
        setIsTorchOn(newState);
        applyConstraints({ torch: newState });
    };

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800 ring-2 ring-red-500/20 group">
            {/* High-Tech Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]"></div>
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'linear-gradient(#0f0 1px, transparent 1px), linear-gradient(90deg, #0f0 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                </div>
            </div>

            {/* Video Feed */}
            <video
                ref={ref}
                className={`w-full h-full object-cover transform transition-all duration-500 ${scanMode === 'MACRO' ? 'scale-125' : 'scale-105'}`}
                playsInline
                muted
            />

            {/* Focus HUD */}
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <div className={`w-[70%] h-[40%] transition-all duration-300 relative ${scanMode === 'MANUAL' ? 'border-2 border-yellow-500/50' : ''}`}>
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg animate-pulse"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-red-600 shadow-[0_0_15px_rgba(255,0,0,1)] animate-[scan_2s_ease-in-out_infinite]"></div>

                    {/* HUD Status Text */}
                    <div className="absolute -top-12 left-0 right-0 text-center">
                        <p className="text-red-500 font-mono text-xs tracking-[0.2em] font-bold animate-pulse">
                            {scanMode === 'AUTO' && 'AUTOFOCUS SEARCHING'}
                            {scanMode === 'MACRO' && 'MACRO OPTICS ENGAGED'}
                            {scanMode === 'MANUAL' && 'MANUAL OVERRIDE'}
                        </p>
                        {lastScanned && (Date.now() - lastScanTime < 2000) && (
                            <p className="text-green-400 font-mono text-xs tracking-widest mt-1">ACQUIRED: {lastScanned}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-6 right-6 flex flex-col gap-3 z-30">
                {hasTorch && (
                    <button onClick={toggleTorch} className={`p-3 rounded-full backdrop-blur-md border border-white/10 ${isTorchOn ? 'text-yellow-400 bg-yellow-500/20' : 'text-white/70 bg-black/40'}`}>
                        {isTorchOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
                    </button>
                )}
                {hasFocusControl && (
                    <button onClick={cycleScanMode} className={`p-3 rounded-full backdrop-blur-md border border-white/10 flex flex-col items-center justify-center gap-1 ${scanMode === 'AUTO' ? 'text-green-400 bg-green-500/20' :
                            scanMode === 'MACRO' ? 'text-purple-400 bg-purple-500/20' :
                                'text-yellow-400 bg-yellow-500/20'
                        }`}>
                        {scanMode === 'AUTO' && <ScanLine size={20} />}
                        {scanMode === 'MACRO' && <Eye size={20} />}
                        {scanMode === 'MANUAL' && <Settings2 size={20} />}
                        <span className="text-[8px] font-bold">{scanMode}</span>
                    </button>
                )}
            </div>

            {/* Bottom Controls Panel */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 z-30 flex flex-col gap-3">

                {/* Manual Focus Slider (Sharpness) */}
                {scanMode === 'MANUAL' && (
                    <div className="flex items-center gap-3">
                        <Focus size={16} className="text-yellow-400" />
                        <div className="flex-1 flex flex-col">
                            <label className="text-[10px] text-yellow-400 uppercase tracking-wider mb-1">Netleştirme (Odak)</label>
                            <input
                                type="range"
                                min={minFocusDistance} max={maxFocusDistance} step={stepFocusDistance}
                                value={focusDistance} onChange={handleFocusDistanceChange}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                            />
                        </div>
                    </div>
                )}

                {/* Brightness Slider */}
                {hasExposure && (
                    <div className="flex items-center gap-3">
                        <Moon size={16} className="text-white/60" />
                        <input
                            type="range"
                            min={minExposure} max={maxExposure} step={stepExposure}
                            value={exposure} onChange={handleExposureChange}
                            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <Sun size={16} className="text-white/60" />
                    </div>
                )}

                {/* Zoom Slider */}
                {maxZoom > 1 && (
                    <div className="flex items-center gap-3">
                        <ZoomOut size={16} className="text-white/60" />
                        <input
                            type="range"
                            min="1" max={maxZoom} step="0.1"
                            value={zoom} onChange={handleZoomChange}
                            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                        <ZoomIn size={16} className="text-white/60" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default BarcodeScanner;

