import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";

import Main from "./Pages/Main/Main.tsx";
import "./index.css";
import { Layout } from "./Components/Layout.tsx";
import Leaderboard from "./Pages/Leaderboard/Leaderboard.tsx";
import Shop from "./Pages/Shop/Shop.tsx";
import Login from "./Pages/Login/Login.tsx";
import Register from "./Pages/Register/Register.tsx";
import ResetPassword from "./Pages/ResetPassword/ResetPassword.tsx";
import Profile from "./Pages/Profile/Profile.tsx";
import useSocket from "./hooks/useSocket.ts";
import { lobbySocket } from "./lib/socket.ts";
import { useUserStore } from "./stores/useUserStore.ts";
import ErrorBanner from "./Components/Shared/ErrorBanner.tsx";
import KeepAlive from "./Components/Shared/KeepAlive.tsx";
import { bindGameSocketListeners } from "./lib/gameSocketBinder.ts";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <AuthenticatedLayout>
                <Layout />
            </AuthenticatedLayout>
        ),
        children: [
            {
                index: true,
                element: <Main />,
            },
            {
                path: "profile",
                element: (
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                ),
            },
            {
                path: "leaderboard",
                element: (
                    <ProtectedRoute>
                        <Leaderboard />
                    </ProtectedRoute>
                ),
            },
            {
                path: "shop",
                element: (
                    <ProtectedRoute>
                        <Shop />
                    </ProtectedRoute>
                ),
            },
            {
                path: "play",
                element: (
                    <ProtectedRoute>
                        <Main />
                    </ProtectedRoute>
                ),
            },
            {
                path: "*",
                element: (
                    <ProtectedRoute>
                        <Main />
                    </ProtectedRoute>
                ),
            },
        ],
    },
    {
        path: "/",
        element: <Layout sonar={true} />,
        children: [
            {
                path: "login",
                element: (
                    <ReverseProtectedRoute>
                        <Login />
                    </ReverseProtectedRoute>
                ),
            },
            {
                path: "register",
                element: (
                    <ReverseProtectedRoute>
                        <Register />
                    </ReverseProtectedRoute>
                ),
            },
            {
                path: "reset-password",
                element: (
                    <ReverseProtectedRoute>
                        <ResetPassword />
                    </ReverseProtectedRoute>
                ),
            },
        ],
    },
]);

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    useSocket(lobbySocket);
    return children;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const user = useUserStore((state) => state.user);

    if (user.id === "-1") {
        localStorage.removeItem("user");
        return <Navigate to="/login" replace />;
    }

    return children;
}

function ReverseProtectedRoute({ children }: { children: React.ReactNode }) {
    const user = useUserStore((state) => state.user);

    if (user.id !== "-1") {
        return <Navigate to="/" replace />;
    }

    return children;
}

bindGameSocketListeners();

lobbySocket.on("ready", () => {
    const setIsSocketReady = useUserStore.getState().setIsSocketReady;
    setIsSocketReady(true);
    console.log("Lobby socket is ready");
});

lobbySocket.on("disconnect", () => {
    const setIsSocketReady = useUserStore.getState().setIsSocketReady;
    setIsSocketReady(false);
    console.log("Lobby socket disconnected");
});

function App() {
    const setUser = useUserStore((state) => state.setUser);
    const clearUser = useUserStore((state) => state.clearUser);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined,
    );

    useEffect(() => {
        let retryTimer: ReturnType<typeof setTimeout>;

        async function fetchUserData(isRetry = false) {
            try {
                const res = await fetch(`${BACKEND_URL}/users/me`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem("user", JSON.stringify(data));
                    setUser(data);

                    console.log(
                        "User data fetched and stored in Zustand:",
                        data,
                    );

                    if (isRetry) {
                        setErrorMessage(undefined);
                        window.location.reload();
                    }
                } else if (res.status === 401) {
                    localStorage.removeItem("user");
                    clearUser();
                } else {
                    setErrorMessage(
                        "Failed to connect to server, service might just be waking up. Trying again in a few seconds...",
                    );

                    retryTimer = setTimeout(() => fetchUserData(true), 3000);
                }
            } catch (err) {
                setErrorMessage(
                    "Failed to connect to server, service might just be waking up. Trying again in a few seconds...",
                );

                retryTimer = setTimeout(() => fetchUserData(true), 3000);
            }
        }

        void fetchUserData();

        return () => clearTimeout(retryTimer);
    }, [setUser]);

    return (
        <>
            {errorMessage && <ErrorBanner message={errorMessage} />}
            <KeepAlive />
            <RouterProvider router={router} />
        </>
    );
}

createRoot(document.getElementById("root")!).render(<App />);
