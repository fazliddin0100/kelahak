import { DocumentType } from "@/types/document";
import { format } from "date-fns";
import QrCode from "@/helpers/qr-code";
import logo from '@/public/dxxLogo.png'
import Image from "next/image";

interface YollovXatiProps {
    document: DocumentType;
    data?: DocumentType | null;

}

export const YollovXati = ({ document, data }: YollovXatiProps) => {

    // O‘zbekcha oy nomlari
    const getMonthUz = (monthIndex: number): string => {
        const months = [
            "yanvar",
            "fevral",
            "mart",
            "aprel",
            "may",
            "iyun",
            "iyul",
            "avgust",
            "sentyabr",
            "oktyabr",
            "noyabr",
            "dekabr",
        ];
        return months[monthIndex];
    };

    const formatGrif = (grif: string | undefined): string => {
        if (!grif) {
            return "";
        }
        return grif.charAt(0).toUpperCase() + grif.slice(1).toLowerCase();
    };


    // Hujjatning imzolanganligini tekshirish
    const isSigned = !document.canSign;

    // mainApprover ma'lumotlari
    const mainApprover = {
        fullName: document.fullName || "",
        militaryRank: document.militaryRank || "",
        position: document.position || "",
    };

    // full name
    const fullNames = document.fullName

    // Receiver ma'lumotlarini formatlash
    const renderReceiverInfo = () => {
        if (!document.receiver || document.receiver.length === 0) {
            return (
                <span className="max-w-[55%] font-bold">
                    <p>Lavozim yo‘q</p>
                    <span className="flex justify-start items-center gap-4 mt-2">
                        <span>Unvon yo‘q</span>
                        <span className="ml-2">Noma`lum</span>
                    </span>
                </span>
            );
        }

        if (document.receiver.length > 1) {
            return (
                <span className="max-w-[55%] font-bold">
                    <p>Viloyat komandirlariga</p>
                </span>
            );
        }

        const singleReceiver = document.receiver[0];
        return (
            <span className="max-w-[55%] font-bold">
                <p>{singleReceiver.position || "Lavozim yo‘q"}</p>
                <span className="flex justify-start items-center gap-4 mt-2">
                    <span>{singleReceiver.militaryRank || "Unvon yo‘q"}</span>
                    <span className="ml-2">{singleReceiver.fullName || "Noma'lum"}ga</span>
                </span>
            </span>
        );
    };

    return (
        <div
            className="flex justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] text-[18.66px]"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
            <div
                className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-[80px] pt-[30px] pr-[30px] pb-[30px] text-[16px] box-border"
            >
                {/* Grif */}
                <div className="flex flex-col justify-end items-end text-[18.66px]">
                    <p>{formatGrif(document.grif)}</p>
                    <p>{document.copyNumber?.length} -Nusxada</p>
                </div>

                {/* Sarlavha va logo */}
                <div className="flex flex-col justify-center items-center text-center">
                    <Image src={logo} alt="logo" width={100} height={100} />
                    <p className="font-bold mt-1">BUXORO VILOYATI HOKIMIYATI</p>
                    <div className="min-w-[700px] min-h-[1px] bg-black mb-0.5" />
                    <div className="min-w-[700px] min-h-[6px] bg-black" />

                    {/* Sana va raqam */}
                    <div className="flex justify-between items-center mt-2 w-full text-[16px]">
                        <span>
                            {format(new Date(
                                typeof document.createdAt === "object" && document.createdAt && "$date" in document.createdAt
                                    ? document.createdAt.$date
                                    : document.createdAt || new Date()
                            ), "yyyy")} yil &#34;
                            <span style={{ textDecoration: "underline" }}>
                                {format(new Date(
                                    typeof document.createdAt === "object" && document.createdAt && "$date" in document.createdAt
                                        ? document.createdAt.$date
                                        : document.createdAt || new Date()
                                ), "dd")}
                            </span>
                            &#34; {getMonthUz(
                                new Date(
                                    typeof document.createdAt === "object" && document.createdAt && "$date" in document.createdAt
                                        ? document.createdAt.$date
                                        : document.createdAt || new Date()
                                ).getMonth()
                            )}
                        </span>
                        <span>31/{data?.province[0]}-<u>{document.registrationIndex} {formatGrif(document.grif)}</u></span>
                    </div>

                </div>
                    {/* Qabul qiluvchi (Receiver) */}
                    <div className="flex flex-row justify-between items-center mt-[1rem]">
                        <span className="max-w-[55%]"></span>
                        <span className="max-w-[55%] font-bold">
                            {renderReceiverInfo()}
                        </span>
                    </div>

                {/* Kontent */}
                <div>
                    <div
                        className="mt-4"
                        style={{
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                        }}
                    >
                        <div
                            dangerouslySetInnerHTML={{
                                __html: typeof document.content === "string" ? document.content : "",
                            }}
                        />
                    </div>
                </div>

                {/* Asosiy tasdiqlovchi (mainApprover) */}
                {mainApprover.fullName && (
                    <div className="mt-4 w-full text-[16px] font-bold">
                        <h2 className="text-lg">Asosiy tasdiqlovchi (TASDIQLAYMAN)</h2>
                        <p><strong>Lavozim:</strong> {mainApprover.position || "Lavozim yo‘q"}</p>
                        <p><strong>Unvon:</strong> {mainApprover.militaryRank || "Unvon yo‘q"}</p>
                        <p><strong>Ism:</strong> {mainApprover.fullName || "Noma'lum"}</p>
                    </div>
                )}

                {/* Yuboruvchi (Sender) */}
                <div className="mt-4 w-full text-[16px] font-bold">
                    <span className="min-w-[40%]">
                        <span
                            className="inline-block align-top"
                            style={{
                                width: "400px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "normal",
                            }}
                        >
                            {document.sender?.position || "Lavozim yo‘q"}
                        </span>
                        <br />
                        <span className="flex items-center justify-self-start gap-4">
                            <span className="self-center">{document.sender?.militaryRank || "Unvon yo‘q"}</span>
                            <span className="self-center">
                                {isSigned && <QrCode fullNames={document?.fullName} />}
                            </span>
                            <span className="self-center">{document.sender?.fullName || ''}</span>
                        </span>
                    </span> 
                </div>

                {/* Qo‘shimcha tasdiqlovchilar (Agar mavjud bo‘lsa) */}
                {document.approvers && document.approvers.length > 0 && (
                    <div className="mt-4 w-full text-[16px] font-bold">
                        <h2 className="text-lg">Qo‘shimcha tasdiqlovchilar (KELISHILDI)</h2>
                        {document.approvers.map((approver, index) => (
                            <div key={index} className="mt-2">
                                <p><strong>Lavozim:</strong> {approver.position || "Lavozim yo‘q"}</p>
                                <p><strong>Unvon:</strong> {approver.militaryRank || "Unvon yo‘q"}</p>
                                <p><strong>Ism:</strong> {approver.fullName || "Noma'lum"}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
