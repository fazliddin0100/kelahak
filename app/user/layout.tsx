import React from "react";

interface DocumentLayoutProps {
    children: React.ReactNode
}

const UserLayout = async ({children}: DocumentLayoutProps) => {
    return (
        <>
            <div className='flex flex-col items-center justify-center font-bold text-[25px] gap-y-4'>
                <nav className='w-full bg-red-500 text-white'>user</nav>
                {children}
            </div>
        </>
    )
}

export default UserLayout