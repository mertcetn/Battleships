import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useUserStore } from "../../stores/useUserStore";
import { getRankFromElo, truncateRank } from "../../util/rankFunctions";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

type ModalType = "username" | "email" | "password" | "logoutAll" | null;

export default function ProfileContainer() {
    const { user, setUser, clearUser } = useUserStore();
    const navigate = useNavigate();

    // Modal State
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    // Global Notification Toast
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Nickname State
    const [nicknameInput, setNicknameInput] = useState(user.nickname || "");
    const [nicknameLoading, setNicknameLoading] = useState(false);
    const [nicknameError, setNicknameError] = useState("");

    // Email State
    const [emailInput, setEmailInput] = useState("");
    const [emailPasswordInput, setEmailPasswordInput] = useState("");
    const [showEmailPassword, setShowEmailPassword] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState("");

    // Password State
    const [currentPasswordInput, setCurrentPasswordInput] = useState("");
    const [newPasswordInput, setNewPasswordInput] = useState("");
    const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    // Session & Logout State
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [logoutAllLoading, setLogoutAllLoading] = useState(false);
    const [sessionError, setSessionError] = useState("");

    const rankAbbr = truncateRank(user.elo, user.role);
    const fullRank = getRankFromElo(user.elo);

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeModal();
            }
        };
        if (activeModal) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeModal]);

    // Auto-dismiss toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const openModal = (type: ModalType) => {
        setNicknameError("");
        setEmailError("");
        setPasswordError("");
        setSessionError("");

        if (type === "username") {
            setNicknameInput(user.nickname || "");
        } else if (type === "email") {
            setEmailInput("");
            setEmailPasswordInput("");
            setShowEmailPassword(false);
        } else if (type === "password") {
            setCurrentPasswordInput("");
            setNewPasswordInput("");
            setConfirmPasswordInput("");
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        }
        setActiveModal(type);
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    // --- Nickname Update ---
    const handleUpdateNickname = async (e: React.FormEvent) => {
        e.preventDefault();
        setNicknameError("");

        const trimmed = nicknameInput.trim();
        if (!trimmed) {
            setNicknameError("Username cannot be empty");
            return;
        }
        if (trimmed.length < 3 || trimmed.length > 14) {
            setNicknameError("Username must be between 3 and 14 characters");
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            setNicknameError("Only letters, numbers, and underscores are allowed");
            return;
        }

        setNicknameLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/users/me/nickname`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: trimmed }),
                credentials: "include",
            });
            const data = await res.json();

            if (!res.ok) {
                const msg = Array.isArray(data.message) ? data.message[0] : data.message;
                setNicknameError(msg || "Failed to update username");
                return;
            }

            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
                setUser(data.user);
            }
            closeModal();
            setToastMessage("Username updated successfully!");
        } catch (err) {
            console.error("Nickname update failed:", err);
            setNicknameError("Network error while updating username");
        } finally {
            setNicknameLoading(false);
        }
    };

    // --- Email Update ---
    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError("");

        const trimmed = emailInput.trim();
        if (!trimmed) {
            setEmailError("Email address cannot be empty");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmailError("Please enter a valid email address");
            return;
        }
        if (!emailPasswordInput) {
            setEmailError("Current password is required to verify identity");
            return;
        }

        setEmailLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/users/me/email`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: trimmed,
                    password: emailPasswordInput,
                }),
                credentials: "include",
            });
            const data = await res.json();

            if (!res.ok) {
                const msg = Array.isArray(data.message) ? data.message[0] : data.message;
                setEmailError(msg || "Failed to update email");
                return;
            }

            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
                setUser(data.user);
            }
            closeModal();
            setToastMessage("Email address updated successfully!");
        } catch (err) {
            console.error("Email update failed:", err);
            setEmailError("Network error while updating email");
        } finally {
            setEmailLoading(false);
        }
    };

    // --- Password Update ---
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");

        if (!currentPasswordInput) {
            setPasswordError("Current password is required");
            return;
        }
        if (newPasswordInput.length < 8) {
            setPasswordError("New password must be at least 8 characters");
            return;
        }
        if (!/[A-Z]/.test(newPasswordInput) || !/[a-z]/.test(newPasswordInput) || !/\d/.test(newPasswordInput)) {
            setPasswordError("Password must include uppercase, lowercase, and a number");
            return;
        }
        if (newPasswordInput !== confirmPasswordInput) {
            setPasswordError("New passwords do not match");
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/users/me/password`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: currentPasswordInput,
                    newPassword: newPasswordInput,
                }),
                credentials: "include",
            });
            const data = await res.json();

            if (!res.ok) {
                const msg = Array.isArray(data.message) ? data.message[0] : data.message;
                setPasswordError(msg || "Failed to update password");
                return;
            }

            closeModal();
            setToastMessage("Password updated successfully!");
        } catch (err) {
            console.error("Password update failed:", err);
            setPasswordError("Network error while updating password");
        } finally {
            setPasswordLoading(false);
        }
    };

    // --- Single Device Logout ---
    const handleLogout = async () => {
        setLogoutLoading(true);
        setSessionError("");

        try {
            await fetch(`${BACKEND_URL}/auth/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
        } catch (err) {
            console.error("Logout request failed:", err);
        } finally {
            localStorage.removeItem("user");
            clearUser();
            setLogoutLoading(false);
            navigate("/login", { replace: true });
        }
    };

    // --- Logout All Devices ---
    const handleLogoutAll = async () => {
        setLogoutAllLoading(true);
        setSessionError("");

        try {
            await fetch(`${BACKEND_URL}/auth/logout-all`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
        } catch (err) {
            console.error("Logout all request failed:", err);
            setSessionError("Failed to log out of all devices");
            setLogoutAllLoading(false);
            return;
        }

        localStorage.removeItem("user");
        clearUser();
        setLogoutAllLoading(false);
        navigate("/login", { replace: true });
    };

    return (
        <>
            {/* Main Profile Card */}
            <div className="card-in bg-primary border border-color-border rounded-2xl p-5 sm:p-7 shadow-[0_0_0_1px_rgba(37,99,235,0.08),0_32px_80px_rgba(0,0,0,0.6),0_0_60px_rgba(37,99,235,0.06)] relative">
                {/* Global Toast Notification */}
                {toastMessage && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-lg animate-fadeIn">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span>{toastMessage}</span>
                    </div>
                )}

                {/* Header / Avatar Profile Badge */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative mb-3">
                        {/* Naval Emblem Ring */}
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-900/80 via-slate-800 to-blue-600/30 border-2 border-blue-500/50 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                            <svg
                                className="w-10 h-10 text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                />
                            </svg>
                        </div>
                        {/* Rank Badge */}
                        <div className="absolute -bottom-1 -right-1 bg-blue-900 text-blue-200 text-xs font-black px-2 py-0.5 rounded-full border border-blue-400 shadow-md uppercase">
                            {rankAbbr}
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        {user.nickname}
                    </h1>
                    <span className="text-sm font-semibold text-blue-400 mt-0.5">
                        {fullRank}
                    </span>

                    {/* Combat Rating Badge */}
                    <div className="mt-3.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.12)]">
                        <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-wider text-yellow-500/90">
                            Combat Rating:
                        </span>
                        <span className="text-sm font-black text-yellow-300">
                            {user.elo} <span className="text-[11px] font-semibold text-yellow-500/80">ELO</span>
                        </span>
                    </div>
                </div>

                {/* Account Details Boxes (All visible at once) */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Account Information
                        </span>
                    </div>

                    {/* Box 1: Username */}
                    <div className="bg-root/80 border border-color-border/80 hover:border-blue-500/40 rounded-xl p-3.5 flex items-center justify-between transition-all group">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Username
                                </span>
                                <span className="text-sm font-semibold text-white truncate block">
                                    {user.nickname}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => openModal("username")}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                            title="Edit Username"
                            id="edit-username-btn"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </div>

                    {/* Box 2: Registered Email */}
                    <div className="bg-root/80 border border-color-border/80 hover:border-blue-500/40 rounded-xl p-3.5 flex items-center justify-between transition-all group">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Registered Email
                                </span>
                                <span className="text-sm font-medium text-gray-200 truncate block">
                                    {user.email || "No email on file"}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => openModal("email")}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                            title="Edit Email"
                            id="edit-email-btn"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </div>

                    {/* Box 3: Password */}
                    <div className="bg-root/80 border border-color-border/80 hover:border-blue-500/40 rounded-xl p-3.5 flex items-center justify-between transition-all group">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Password
                                </span>
                                <span className="text-sm font-mono tracking-widest text-gray-300 block">
                                    ••••••••••••
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => openModal("password")}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                            title="Change Password"
                            id="edit-password-btn"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Session & Security Controls */}
                <div className="pt-5 border-t border-color-border/60">

                    {sessionError && (
                        <div className="mb-3 p-2.5 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{sessionError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Current Device Logout */}
                        <button
                            type="button"
                            id="logout-button"
                            disabled={logoutLoading}
                            onClick={handleLogout}
                            className="w-full py-2.5 px-3 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 hover:border-red-500/60 text-red-300 hover:text-red-100 font-semibold rounded-[10px] text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>{logoutLoading ? "Signing Out..." : "Log Out"}</span>
                        </button>

                        {/* All Devices Logout Trigger */}
                        <button
                            type="button"
                            id="logout-all-btn"
                            disabled={logoutAllLoading}
                            onClick={() => openModal("logoutAll")}
                            className="w-full py-2.5 px-3 bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 hover:text-amber-100 font-semibold rounded-[10px] text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Log Out All Devices</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* POPUP MODAL OVERLAY */}
            {activeModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="bg-primary border border-color-border rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(37,99,235,0.15)] w-full max-w-md relative animate-fadeIn">
                        {/* Modal Close Button */}
                        <button
                            type="button"
                            onClick={closeModal}
                            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* 1. USERNAME UPDATE MODAL */}
                        {activeModal === "username" && (
                            <form onSubmit={handleUpdateNickname} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">Update Callsign</h2>
                                        <p className="text-xs text-gray-400">Change your public player name</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                        New Username
                                    </label>
                                    <input
                                        type="text"
                                        value={nicknameInput}
                                        onChange={(e) => setNicknameInput(e.target.value)}
                                        placeholder="Enter new username"
                                        maxLength={14}
                                        autoFocus
                                        className="w-full bg-root border border-color-border rounded-[10px] py-2.5 px-3.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-blue-500 focus:outline-none transition-colors"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        3 to 14 characters. Letters, numbers, and underscores only.
                                    </p>
                                </div>

                                {nicknameError && (
                                    <div className="p-2.5 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{nicknameError}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-gray-300 font-semibold rounded-[10px] text-xs transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={nicknameLoading || nicknameInput.trim() === user.nickname}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[10px] text-xs transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {nicknameLoading ? "Saving..." : "Save Callsign"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 2. EMAIL UPDATE MODAL */}
                        {activeModal === "email" && (
                            <form onSubmit={handleUpdateEmail} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">Update Email Address</h2>
                                        <p className="text-xs text-gray-400">Requires confirming your current password</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                        New Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="name@domain.com"
                                        autoFocus
                                        className="w-full bg-root border border-color-border rounded-[10px] py-2.5 px-3.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-blue-500 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                        Current Password <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showEmailPassword ? "text" : "password"}
                                            value={emailPasswordInput}
                                            onChange={(e) => setEmailPasswordInput(e.target.value)}
                                            placeholder="Enter your current password"
                                            className="w-full bg-root border border-color-border rounded-[10px] py-2.5 pl-3.5 pr-10 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-blue-500 focus:outline-none transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                                        >
                                            {showEmailPassword ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {emailError && (
                                    <div className="p-2.5 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{emailError}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-gray-300 font-semibold rounded-[10px] text-xs transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={emailLoading || !emailInput.trim() || !emailPasswordInput}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[10px] text-xs transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {emailLoading ? "Updating..." : "Update Email"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 3. PASSWORD UPDATE MODAL */}
                        {activeModal === "password" && (
                            <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">Change Password</h2>
                                        <p className="text-xs text-gray-400">Enter your old and new credentials</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                        Current Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPassword ? "text" : "password"}
                                            value={currentPasswordInput}
                                            onChange={(e) => setCurrentPasswordInput(e.target.value)}
                                            placeholder="Enter current password"
                                            autoFocus
                                            className="w-full bg-root border border-color-border rounded-[10px] py-2.5 pl-3.5 pr-10 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-blue-500 focus:outline-none transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                                        >
                                            {showCurrentPassword ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPasswordInput}
                                            onChange={(e) => setNewPasswordInput(e.target.value)}
                                            placeholder="Enter new password"
                                            className="w-full bg-root border border-color-border rounded-[10px] py-2.5 pl-3.5 pr-10 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-blue-500 focus:outline-none transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                                        >
                                            {showNewPassword ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        Min. 8 characters with uppercase, lowercase, and a number.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPasswordInput}
                                            onChange={(e) => setConfirmPasswordInput(e.target.value)}
                                            placeholder="Re-enter new password"
                                            className="w-full bg-root border border-color-border rounded-[10px] py-2.5 pl-3.5 pr-10 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-blue-500 focus:outline-none transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                                        >
                                            {showConfirmPassword ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {passwordError && (
                                    <div className="p-2.5 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{passwordError}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-gray-300 font-semibold rounded-[10px] text-xs transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={passwordLoading || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[10px] text-xs transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {passwordLoading ? "Updating..." : "Update Password"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* 4. LOGOUT ALL DEVICES CONFIRMATION MODAL */}
                        {activeModal === "logoutAll" && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white">Log Out All Devices</h2>
                                        <p className="text-xs text-gray-400">Global Session Invalidation</p>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-300 leading-relaxed bg-root/80 p-3.5 rounded-xl border border-color-border/60">
                                    Are you sure you want to revoke all active sessions? This will immediately log you out of all browsers, devices, and open games. You will need to sign in again everywhere.
                                </p>

                                <div className="flex items-center justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-gray-300 font-semibold rounded-[10px] text-xs transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={logoutAllLoading}
                                        onClick={handleLogoutAll}
                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-[10px] text-xs transition duration-200 shadow-[0_0_15px_rgba(217,119,6,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {logoutAllLoading ? "Revoking Sessions..." : "Yes, Log Out Everywhere"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
