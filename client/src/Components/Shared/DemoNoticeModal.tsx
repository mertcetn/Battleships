import { useEffect, useState } from "react";

const STORAGE_KEY = "battleships_demo_notice_seen";

function isTargetHost(): boolean {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname.toLowerCase();
    return (
        hostname === "battleships-flax.vercel.app" ||
        hostname.includes("battleships-flax")
    );
}

export default function DemoNoticeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isTargetHost()) return;

        const seen = localStorage.getItem(STORAGE_KEY);
        if (!seen) {
            setIsOpen(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div
            id="demo-notice-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleDismiss();
            }}
        >
            <div
                id="demo-notice-modal"
                className="bg-primary border border-color-border rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(37,99,235,0.15)] w-full max-w-md relative animate-fadeIn"
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">
                            Live Demo Notice
                        </h2>
                        <p className="text-xs text-amber-400/90 font-medium">
                            Important details about this deployment
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-3 text-xs text-gray-300 leading-relaxed mb-5">
                    <div className="p-3 rounded-lg bg-slate-800/60 border border-color-border">
                        <p className="font-semibold text-gray-200 mb-1">
                            🎮 Active Demo Environment
                        </p>
                        <p className="text-gray-400">
                            This project is currently hosted as a live demonstration.
                            Some features and mechanics are under active development and
                            may encounter occasional issues.
                        </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-800/60 border border-color-border">
                        <p className="font-semibold text-gray-200 mb-1">
                            ⏳ Server Spin-up (Render Free Tier)
                        </p>
                        <p className="text-gray-400">
                            The backend is deployed on Render's free tier. If the service
                            was dormant, the server takes{" "}
                            <strong className="text-amber-300 font-semibold">
                                50–90 seconds to wake up
                            </strong>{" "}
                            on your first visit. Thank you for your patience while it
                            spins up!
                        </p>
                    </div>
                </div>

                {/* Dismiss Button */}
                <button
                    id="dismiss-demo-notice-btn"
                    type="button"
                    onClick={handleDismiss}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[10px] text-xs transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center cursor-pointer"
                >
                    Understood, Continue
                </button>
            </div>
        </div>
    );
}
