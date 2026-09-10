import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useUserStore } from "../../stores/useUserStore";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function CompleteProfileModal() {
    const user = useUserStore((state) => state.user);
    const setUser = useUserStore((state) => state.setUser);
    const clearUser = useUserStore((state) => state.clearUser);
    const navigate = useNavigate();

    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Only display when user is logged in and their profile is not complete
    if (user.id === "-1" || user.isProfileComplete) {
        return null;
    }

    const validateNickname = (name: string): string | null => {
        if (!name.trim()) return "Username cannot be empty.";
        if (name.length < 3 || name.length > 14) {
            return "Username must be between 3 and 14 characters.";
        }
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            return "Username can only contain letters, numbers, and underscores.";
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nickname.trim();
        const validationError = validateNickname(trimmed);
        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`${BACKEND_URL}/users/me/complete-profile`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ nickname: trimmed }),
            });

            const data = await res.json();

            if (!res.ok) {
                const msg = Array.isArray(data.message)
                    ? data.message[0]
                    : data.message;
                setError(msg || "Failed to update username");
                return;
            }

            const updatedUser = data.user || data;
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (err) {
            console.error("Profile completion error:", err);
            setError("Network error while updating username");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await fetch(`${BACKEND_URL}/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // Ignore logout network errors
        } finally {
            localStorage.removeItem("user");
            clearUser();
            setLogoutLoading(false);
            navigate("/login");
        }
    };

    return (
        <div
            id="complete-profile-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
            <div
                id="complete-profile-modal"
                className="bg-primary border border-color-border rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(37,99,235,0.15)] w-full max-w-md relative animate-fadeIn"
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">Choose Username</h2>
                        <p className="text-xs text-gray-400">Please choose a username to continue</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="username-input"
                            className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5"
                        >
                            Username
                        </label>
                        <input
                            id="username-input"
                            type="text"
                            value={nickname}
                            onChange={(e) => {
                                setNickname(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="Enter username"
                            maxLength={14}
                            autoFocus
                            disabled={loading}
                            className="w-full bg-root border border-color-border rounded-[10px] py-2.5 px-3.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-blue-500 focus:outline-none transition-colors"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                            3 to 14 characters. Letters, numbers, and underscores only.
                        </p>
                    </div>

                    {error && (
                        <div
                            id="complete-profile-error"
                            className="p-2.5 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2"
                        >
                            <svg
                                className="w-4 h-4 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        id="submit-username-btn"
                        type="submit"
                        disabled={loading || !nickname.trim()}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[10px] text-xs transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Saving..." : "Save Username"}
                    </button>
                </form>

                {/* Logout */}
                <div className="mt-4 pt-3 border-t border-color-border text-center">
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={logoutLoading}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {logoutLoading ? "Logging out..." : "Log out"}
                    </button>
                </div>
            </div>
        </div>
    );
}
