"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createContext, ReactNode, useEffect, useState} from "react";
import {jwtDecode} from "jwt-decode";

interface UserPayload {
    department: string;
    id: string;
}

const AuthContext = createContext<{ user: UserPayload | null }>({user: null});

export default function Providers({children}: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    const [user, setUser] = useState<UserPayload | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode<UserPayload>(token);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUser(decoded);
            } catch (err) {
                console.error("Token decode error:", err);
                setUser(null);
            }
        }
    }, []);

    return (
        <AuthContext.Provider value={{user}}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </AuthContext.Provider>
    );
}
