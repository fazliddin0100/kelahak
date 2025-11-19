import React from "react";
import { DocumentType, Approver, Sender } from "@/types/document";
import { format } from "date-fns";
import QrCode from "@/helpers/qr-code";
import Image from "next/image";
import gerb from '@/public/gerb.png'

interface BuyruqProps {
    document: DocumentType;
}

export const Buyruq: React.FC<BuyruqProps> = ({ document }) => {

    const isMainSigned = (document.bosSigned as Sender)?.hasSigned ?? false;

    const getMonthUz = (monthIndex: number): string => {
        const months = [
            "yanvar", "fevral", "mart", "aprel", "may", "iyun",
            "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr",
        ];
        return months[monthIndex];
    };

    const formatGrif = (grif?: string): string =>
        grif ? grif.charAt(0).toUpperCase() + grif.slice(1).toLowerCase() : "";

    const formatPosition = (position?: string): string => {
        if (!position) return "";
        const cleaned = position.replace(/DXX/i, "").trim();
        return cleaned.split(/\s+/).map((p) => p.toUpperCase()).join(" ");
    };

    const formatPositionList = (position?: string): string => {
        if (!position) return "";
        const cleaned = position.replace(/DXX/i, "").trim();
        return cleaned.split(/\s+/).filter(Boolean).join(" ");
    };

    const parseDate = (date?: string | Date | { $date: string }): Date => {
        if (!date) return new Date();
        if (date instanceof Date) return date;
        if (typeof date === "string") return new Date(date);
        if (typeof date === "object" && "$date" in date) return new Date(date.$date);
        return new Date();
    };

    const createdDate = parseDate(document.createdAt);

    return (
        <div
            className="flex justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] text-[18.66px]"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
            <div className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-[80px] pt-[30px] pr-[30px] pb-[30px] text-[16px] box-border">

                {/* Grif */}
                <div className="flex flex-col justify-end items-end text-[18.66px]">
                    <p>{formatGrif(document.grif)}</p>
                    <p>{document.copyNumber?.length ?? 1} -nusxa</p>
                </div>

                {/* Sarlavha va gerb */}
                <div className="flex flex-col justify-center items-center text-center">
                    {gerb ? (
                        <Image
                            src={gerb}
                            alt="O‘zbekiston Respublikasi gerbi"
                            width={80}
                            height={80}
                        />
                    ) : (
                        <p className="text-red-500">Gerb rasm mavjud emas</p>
                    )}
                    <p className="font-bold mt-1">
                        BUXORO VILOYATI HOKIMIYATI <br />
                        {formatPosition(document.position) || "LAVOZIM YO‘Q"}NING <br />
                        BUYRUG‘I
                    </p>
                    <div className="min-w-[700px] min-h-[1px] bg-black mb-0.5" />
                    <div className="min-w-[700px] min-h-[6px] bg-black" />

                    {/* Sana va raqam */}
                    <div className="flex justify-between items-center mt-2 w-full text-[18px]">
            <span>
              <i>
                {format(createdDate, "yyyy")} yil &#34;
                <span style={{ textDecoration: "underline" }}>
                  {format(createdDate, "dd")}
                </span>
                &#34; {getMonthUz(createdDate.getMonth())}
              </i>
            </span>
                        <span>
              <u>
                <i>1111 /{document.grif ?? "Noma'lum"}</i>
              </u>
              -son
            </span>
                    </div>
                </div>

                {/* Kontent */}
                <div className="mt-[3rem]" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                    <div dangerouslySetInnerHTML={{ __html: typeof document.content === "string" ? document.content : "" }} />
                </div>

                {/* Asosiy imzolovchi shaxs */}
                <div className="flex flex-row justify-between items-center mt-[1rem]">
          <span className="max-w-[70%] font-bold">
            <p>Otryad komandiri</p>
            <span className="flex justify-start items-center gap-4 mt-2">
              <span>{document.bosSigned?.militaryRank ?? "Unvon yo‘q"}</span>
              <span className="text-center">
                {isMainSigned && (
                    <QrCode
                        fullNames={document.bosSigned?.fullName ?? "Imzolanmagan"}
                    />
                )}
              </span>
              <span className="ml-2">{document.bosSigned?.fullName ?? "Noma'lum"}</span>
            </span>
          </span>
                    <span className="max-w-[30%]" />
                </div>

                {/* Qo‘shimcha tasdiqlovchilar */}
                {Array.isArray(document.approvers) && document.approvers.length > 0 && (
                    <div className="w-full mt-[297mm]">
                        <p className="text-center font-bold">
                            O‘zbekiston Respublikasi Davlat Xavfsizlik Xizmati{" "}
                            {formatPositionList(document.position) || "LAVOZIM YO‘Q"}ning buyruq loyihasiga
                        </p>
                        <p className="text-center font-bold">KELISHUV VAROG‘I</p>
                        {document.approvers.map((approver: Approver, index: number) => (
                            <div key={index} className="mt-2">
                                <p className="max-w-[400px] font-bold">{approver.position ?? "Lavozim yo‘q"}</p>
                                <span className="flex justify-start items-center gap-4 mt-2 font-bold">
                  <span>{approver.militaryRank ?? "Unvon yo‘q"}</span>
                  <span className="text-center">
                    {approver.hasSigned && (
                        <QrCode fullNames={approver.fullName ?? "Imzolanmagan"} />
                    )}
                  </span>
                  <span className="ml-2">{approver.fullName ?? "Noma'lum"}</span>
                </span>
                                <span>
                  <i>
                    {format(createdDate, "yyyy")} yil &#34;
                    <span style={{ textDecoration: "underline" }}>{format(createdDate, "dd")}</span>
                    &#34; {getMonthUz(createdDate.getMonth())}
                  </i>
                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
