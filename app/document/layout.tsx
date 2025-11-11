import React from "react";

interface DocumentLayoutProps {
    children: React.ReactNode
}

const DocumentLayout = async ({children}: DocumentLayoutProps) => {
    return (
        <>
            <div className='flex flex-col items-center justify-center font-bold text-[25px] gap-y-4'>
                {children}
            </div>
        </>
    )
}

export default DocumentLayout