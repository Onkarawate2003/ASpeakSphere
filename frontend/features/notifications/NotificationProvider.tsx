"use client";

import { useEffect } from "react";

import { initialize } from "./notificationService";

/**
 * Initializes the local notification subsystem once on mount. Renders
 * children unchanged on every platform — no conditional JSX based on
 * platform or native/web state, so there is nothing here for a server
 * prerender pass and a client hydration pass to disagree on.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        void initialize();
    }, []);

    return <>{children}</>;
}
