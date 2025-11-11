"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import axios from "axios";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {LogOut} from "lucide-react";

export default function UserAvatar() {
    const [data, setData] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get("/api/user/avatar");
                setData(res.data.user);
            } catch {
                router.push("/login");
            }
        };
        fetchUser();
    }, [router]);

    const logout = () => {
        localStorage.removeItem("token");
        document.cookie = "token=; Max-Age=0; path=/;";
        router.push("/login");
    };

    if (!data) return <div>Loading...</div>;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="
                        w-10 h-10 rounded-full bg-gray-200
                        flex items-center justify-center
                        font-semibold text-gray-700
                        relative hover:bg-gray-300 transition
                    "
                >
                    {data.fName[0]}
                    {data.name[0]}

                    {data.isUserTrue && (
                        <span className="
                            absolute bottom-0 right-0
                            w-3 h-3 bg-green-500 rounded-full
                            ring-2 ring-white
                        "></span>
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56 mr-2">
                <DropdownMenuLabel>
                    <p className="font-bold text-gray-900">
                        {data.fName} {data.name}
                    </p>
                    <p className="text-sm text-gray-500">{data.sName}</p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator/>

                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut size={16} className="mr-2"/>
                    Chiqish
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
