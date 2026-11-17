"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ReactNode, useEffect, useState} from "react";
import {clearLegacyAuthStorage} from "@/lib/clientAuthStorage";

export default function Providers({children}: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    useEffect(() => {
        clearLegacyAuthStorage();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
