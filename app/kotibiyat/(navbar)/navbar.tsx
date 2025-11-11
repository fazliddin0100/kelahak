"use client";

import Image from "next/image";
import logo from "../../../public/gerb.png";
import {BookMarked, CalendarClock, FileDown, FileText, Library, MessageCircleMore, NotebookPen,} from "lucide-react";
import {useState} from "react";
import UserProfile from "@/components/UserProfile";

// pages
import File from "./file";
import KelDocument from "./kel-document";
import Jurnal from "./jurnal";
import Nomeklatura from "./nomeklatura";
import Controlni from "./controlni";
import Buyruq from "./buyruq"
import Chat from "./chat"
import {useTashkilot} from "@/hooks/useTashkilot";

interface NavbarKotibiyatProps {
    setPage?: (value: (((prevState: string) => string) | string)) => void
    organ: string
}

const NavbarKotibiyat = ({setPage}: NavbarKotibiyatProps) => {
    const [activePage, setActivePage] = useState("file");
    const {data} = useTashkilot();

    const handleClick = (page: string) => {
        setActivePage(page);
        if (setPage) {
            setPage(page)
        }
    };

    const linkStyle = (page: string) =>
        `cursor-pointer flex flex-row items-center px-1 
        hover:text-gray-300 transition 
        ${activePage === page ? "text-blue-400 border-b-2 border-blue-400 font-semibold" : ""}`;

    return (
        <div>
            {/* Navbar */}
            <nav
                className="flex flex-row justify-between items-center w-full p-2 bg-gray-700 text-white fixed top-0 z-100">
                <div className="flex items-center gap-2">
                    <Image src={logo} alt="logo" className="image_navbar360"/>
                    <span>
                      {data?.organ
                          ? data.organ.charAt(0).toUpperCase() + data.organ.slice(1)
                          : ""}
                    </span>
                </div>
                <div className="flex items-center gap-6 text-[17px]">
                      <span
                          className={linkStyle("file")}
                          onClick={() => handleClick("file")}
                      >
                        <FileText className="mr-2"/> Hujjat
                      </span>

                    <span
                        className={linkStyle("kel")}
                        onClick={() => handleClick("kel")}
                    >
                        <FileDown className="mr-2"/> Kel/hujjat
                      </span>

                    <span
                        className={linkStyle("jurnal")}
                        onClick={() => handleClick("jurnal")}
                    >
                        <NotebookPen className="mr-2"/> Jurnal
                      </span>

                    <span
                        className={linkStyle("nomeklatura")}
                        onClick={() => handleClick("nomeklatura")}
                    >
                        <Library className="mr-2"/> Nomeklatura
                      </span>

                    <span
                        className={linkStyle("controlni")}
                        onClick={() => handleClick("controlni")}
                    >
                        <CalendarClock className="mr-2"/> Controlni
                    </span>

                    <span
                        className={linkStyle("buyruq")}
                        onClick={() => handleClick("buyruq")}
                    >
                        <BookMarked className="mr-2"/> Buyruq
                    </span>
                    <span
                        className={linkStyle("chat")}
                        onClick={() => handleClick("chat")}
                    >
                        <MessageCircleMore className="mr-2"/> Chat
                    </span>
                </div>

                <div>
                    <UserProfile/>
                </div>
            </nav>

            {/* Content */}
            <div className="p-4">
                {activePage === "file" && <File/>}
                {activePage === "kel" && <KelDocument/>}
                {activePage === "jurnal" && <Jurnal/>}
                {activePage === "nomeklatura" && <Nomeklatura/>}
                {activePage === "controlni" && <Controlni/>}
                {activePage === "buyruq" && <Buyruq/>}
                {activePage === "chat" && <Chat/>}
            </div>
        </div>
    );
};

export default NavbarKotibiyat;
