
import React, { useState } from 'react';
import { useZxing } from "react-zxing";
import { AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
    const [error, setError] = useState<string | null>(null);

    // Throttle scans to prevent double-reads
    const [lastScanned, setLastScanned] = useState<string>("");
    const [lastScanTime, setLastScanTime] = useState<number>(0);

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
                if (navigator.vibrate) navigator.vibrate(50);

                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContext) {
                    const ctx = new AudioContext();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.setValueAtTime(1200, ctx.currentTime);
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.1);
                }
            } catch (e) {
                // Ignore audio errors (e.g. user didn't interact yet)
            }

            setLastScanTime(now);
            setLastScanned(code);
            onScan(code);
        },
        onError(err) {
            // Ignore "NotFound" errors as they happen every frame where no code is found
            if (err.name !== "NotFoundException" && err.name !== "ChecksumException" && err.name !== "FormatException") {
                console.error(err);
                // Only show perm errors
                if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
                    setError("Kamera erişimi sağlanamadı. Lütfen izinleri kontrol edin.");
                }
            }
        },
        constraints: {
            video: {
                facingMode: "environment",
                height: { min: 720, ideal: 1080 }, // Request higher resolution for better detail
                width: { min: 1280, ideal: 1920 }
            }
        },
        hints: new Map([
            // Multi-format support is good, but TRY_HARDER is key for difficult codes
            [2, true] // DecodeHintType.TRY_HARDER
        ]),
        timeBetweenDecodingAttempts: 100 // Slightly faster polling
    });

    return (
        <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-gray-800">
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                    <AlertCircle size={48} className="text-red-500 mb-2" />
                    <p>{error}</p>
                </div>
            ) : (
                <>
                    <video
                        ref={ref}
                        className="w-full h-full object-cover"
                        playsInline // Vital for iOS
                        muted      // Often needed for autoplay
                    />

                    {/* Scanning Overlay (Viewfinder) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {/* Dimmed Background */}
                        <div className="absolute inset-0 border-[40px] border-black/50"></div>

                        {/* Laser Line */}
                        <div className="w-[80%] h-0.5 bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.8)] animate-pulse z-10"></div>

                        {/* Corners */}
                        <div className="absolute w-[70%] h-[50%] border-2 border-white/50 rounded-lg"></div>
                    </div>

                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <p className="text-white text-xs bg-black/60 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                            Barkodu kutucuğa hizalayın
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default BarcodeScanner;
