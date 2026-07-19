"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { clearToken, getToken } from "./auth";
import {
    EmailNotVerifiedError,
    fetchCurrentUser,
    googleAuth as googleAuthApi,
    login as loginApi,
    persistToken,
    register as registerApi,
    verifyEmail as verifyEmailApi,
} from "./api";
import type {
    AuthContextValue,
    AuthStatus,
    AuthUser,
    LoginPayload,
    RegisterPayload,
    VerifyEmailPayload,
} from "./types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>("loading");
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setTokenState] = useState<string | null>(null);

    // On mount, hydrate the session from localStorage. If a token exists we
    // validate it by fetching the current user; otherwise we are unauthenticated.
    useEffect(() => {
        let active = true;

        async function bootstrap() {
            const storedToken = getToken();
            if (!storedToken) {
                if (active) {
                    setStatus("unauthenticated");
                }
                return;
            }

            setTokenState(storedToken);
            try {
                const currentUser = await fetchCurrentUser(storedToken);
                if (active) {
                    setUser(currentUser);
                    setStatus("authenticated");
                }
            } catch {
                // Token invalid/expired — treat as logged out.
                clearToken();
                if (active) {
                    setTokenState(null);
                    setUser(null);
                    setStatus("unauthenticated");
                }
            }
        }

        bootstrap();

        return () => {
            active = false;
        };
    }, []);

    const refreshUser = useCallback(async () => {
        const storedToken = getToken();
        if (!storedToken) {
            setUser(null);
            setTokenState(null);
            setStatus("unauthenticated");
            return;
        }

        try {
            const currentUser = await fetchCurrentUser(storedToken);
            setUser(currentUser);
            setTokenState(storedToken);
            setStatus("authenticated");
        } catch {
            clearToken();
            setUser(null);
            setTokenState(null);
            setStatus("unauthenticated");
        }
    }, []);

    const register = useCallback(async (payload: RegisterPayload) => {
        const response = await registerApi(payload);
        // Signup never auto-authenticates: every new account starts
        // unverified, so the caller must catch this and route to
        // /verify-email, then finish authenticating via `verifyEmail` below.
        throw new EmailNotVerifiedError(response.email);
    }, []);

    const login = useCallback(async (payload: LoginPayload) => {
        const response = await loginApi(payload);
        if (!response.access_token) {
            // Valid credentials, but the account isn't verified yet — no
            // token was issued. The caller routes to /verify-email instead.
            throw new EmailNotVerifiedError(response.email ?? payload.email);
        }
        persistToken(response.access_token);
        setTokenState(response.access_token);
        const currentUser = await fetchCurrentUser(response.access_token);
        setUser(currentUser);
        setStatus("authenticated");
        return currentUser;
    }, []);

    const verifyEmail = useCallback(async (payload: VerifyEmailPayload) => {
        const { access_token } = await verifyEmailApi(payload);
        persistToken(access_token);
        setTokenState(access_token);
        const currentUser = await fetchCurrentUser(access_token);
        setUser(currentUser);
        setStatus("authenticated");
        return currentUser;
    }, []);

    // Handles both Google Signup and Google Login — the backend endpoint
    // itself decides whether to create a new account or reuse an existing
    // one, so the frontend just exchanges the ID token for our own JWT
    // exactly like `verifyEmail` does above.
    const loginWithGoogle = useCallback(async (idToken: string) => {
        const { access_token } = await googleAuthApi({ id_token: idToken });
        persistToken(access_token);
        setTokenState(access_token);
        const currentUser = await fetchCurrentUser(access_token);
        setUser(currentUser);
        setStatus("authenticated");
        return currentUser;
    }, []);

    const logout = useCallback(() => {
        clearToken();
        setTokenState(null);
        setUser(null);
        setStatus("unauthenticated");
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            status,
            user,
            token,
            register,
            login,
            verifyEmail,
            loginWithGoogle,
            logout,
            refreshUser,
        }),
        [status, user, token, register, login, verifyEmail, loginWithGoogle, logout, refreshUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider.");
    }
    return context;
}
