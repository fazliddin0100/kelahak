"use client";

import {useEffect, useState} from "react";
import axios from "axios";
import {useRouter} from "next/navigation";
import {CircleUser, Loader2, LogOut} from "lucide-react";

import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Separator} from "@/components/ui/separator";

interface UserData {
    name: string;
    fName: string;
    sName: string;
    province: string;
    isUserTrue?: boolean;
}

export default function UserProfile() {
    const [data, setData] = useState<UserData | null>(null);

    const router = useRouter();
    useEffect(() => {
        const fetchUser = async () => {
            try {
                // ✅ Endi token kerak emas — middleware bizga userni tekshiradi
                const res = await axios.get("/api/something", {withCredentials: true});

                // Backendda biz personal qaytarganmiz
                setData(res.data.person);
            } catch {
                router.push("/sign-in");
            }
        };

        fetchUser();
    }, [router]);

    const handleLogout = async () => {
        await axios.post("/api/auth/logout", {}, {withCredentials: true});
        router.push("/sign-in");
    };

    if (!data) {
        return <p className="text-sm text-gray-600 animate-spin">
            <Loader2/>
        </p>;
    }

    return (
        <Popover>
            <PopoverTrigger>
                <div className="relative">
                    <Avatar className="w-10 h-10 cursor-pointer shadow border">
                        <AvatarFallback className="bg-gray-200 text-black font-semibold">
                            <CircleUser/>
                        </AvatarFallback>
                    </Avatar>

                    {data.isUserTrue && (
                        <div className="absolute -bottom-1 -right-1">
                            <div className="logo-online">
                                <div className="logo-icon">
                                    <div className="live-effect"/>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverTrigger>

            <PopoverContent className="w-60 mt-4 mr-2 p-3 rounded-xl shadow-lg">
                <div className="flex flex-col">
                    <p className="font-semibold text-black text-sm leading-tight">
                        {data.fName} {data.name} {data.sName}
                        <br/>
                        <span className="text-gray-500 text-xs">{data.province}</span>
                    </p>

                    <Separator className="my-3"/>

                    <button
                        onClick={handleLogout}
                        className="group flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer transition"
                    >
                        <LogOut
                            size={16}
                            className="transform transition-transform duration-200 group-hover:translate-x-1"
                        />
                        Chiqish
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
