"use client";

import React, {useState} from "react";
import NavbarKotibiyat from './(navbar)/navbar';
import KotibiyatPage from "./page";

interface DocumentLayoutProps {
    setPage?: (value: (((prevState: string) => string) | string)) => void
    children: React.ReactNode;
}

const KotibiyatLayout = ({children}: DocumentLayoutProps) => {
    const [page, setPage] = useState<string>('');

    return (
        <div className='flex flex-col items-center justify-center font-bold text-[25px] gap-y-4'>
            <div className="w-full">
                <NavbarKotibiyat setPage={setPage} organ={""}/>
            </div>
                 <KotibiyatPage page={page}/>
            {children}
        </div>
    );
};

export default KotibiyatLayout;
