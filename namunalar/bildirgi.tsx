import { format } from "date-fns";
import { uz } from "date-fns/locale";
import DOMPurify from "dompurify";
import QrCode from "@/helpers/qr-code";
import { DocumentType, ObjectIdLike, DateLike } from "@/types/document";
import React from "react";

interface MalumotnomaProps {
    document: DocumentType;
    province?: string;
    data?: unknown;
}

export const Bildirgi: React.FC<MalumotnomaProps> = ({
                                                         document,
                                                         province,
                                                     }) => {
    const getFormattedName = (fullName?: string): string => {
        if (!fullName) return "Noma'lum";
        const parts = fullName.trim().split(/\s+/);
        const [sName = "", name = "", fName = ""] = parts;
        return `${sName.charAt(0).toUpperCase()}${name ? `.${name.charAt(0).toUpperCase()}.` : ""} ${fName}`;
    };

    const formatGrif = (grif?: string): string =>
        grif ? grif.charAt(0).toUpperCase() + grif.slice(1).toLowerCase() : "";

    const parseDate = (date?: DateLike): Date => {
        if (!date) return new Date();
        if (date instanceof Date) return date;
        if (typeof date === "string") return new Date(date);
        if (typeof date === "object" && "$date" in date) return new Date(date.$date);
        return new Date();
    };

    const formatDate = (date?: DateLike): string => {
        try {
            const parsed = parseDate(date);
            return `${format(parsed, "yyyy")} yil "${format(parsed, "dd")}" ${format(parsed, "MMMM", { locale: uz })}`;
        } catch {
            return "Sana noma'lum";
        }
    };

    const getIdString = (id?: ObjectIdLike): string => {
        if (!id) return "unknown";
        return typeof id === "string" ? id : id.$oid;
    };

    const isSigned = document.sender?.hasSigned ?? false;

    return (
        <div
            className="flex flex-col justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] overflow-x-hidden"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
            <div className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-[80px] pt-[30px] pr-[30px] pb-[30px] text-lg box-border mb-4">

                {/* Grif va nusxa */}
                <div className="flex flex-col justify-end items-end mb-1">
                    <p>{formatGrif(document.grif)}</p>
                    <p>{document.copyNumber?.length === 0 ? 1 : document.copyNumber?.length} -Nusxa</p>
                </div>

                {/* Receiver */}
                <div className="grid grid-cols-[45%_55%] grid-rows-3 gap-4 mt-4 font-bold">
                    <div className="row-span-2" />
                    {document.receiver?.map((rec, index) => (
                        <div key={getIdString(rec._id) || `receiver-${index}`} className="col-span-1">
                            {rec.position || "Lavozim noma'lum"}
                            <br />
                            <span>
                {rec.militaryRank || "Unvon noma'lum"} {rec.fullName ? ` ${rec.fullName}ga` : ""}
              </span>
                        </div>
                    ))}
                </div>

                {/* Kontent */}
                <div
                    className="mt-4"
                    style={{ width: "100%", wordBreak: "break-word", overflowWrap: "break-word" }}
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                            typeof document.content === "string" ? document.content : "Kontent mavjud emas"
                        ),
                    }}
                />

                {/* Sender */}
                <div className="mt-2 mb-2 w-full text-lg">
          <span className="min-w-[40%]">
            <span className="inline-block align-top font-bold w-[400px] overflow-hidden text-ellipsis whitespace-normal">
              {document.sender?.position || "Lavozim noma'lum"}
            </span>
            <br />
            <span className="flex items-center gap-4 font-bold">
              <span>{document.sender?.militaryRank || "Unvon noma'lum"}</span>
                {isSigned && document.sender?.fullName && (
                    <span>
                  <QrCode fullNames={document.sender.fullName} />
                </span>
                )}
                <span>{getFormattedName(document.sender?.fullName)}</span>
            </span>
            <i>{formatDate(document.createdAt)}</i>
          </span>
                </div>

                {/* Approvers */}
                {(document.approvers?.length ?? 0) > 0 && (
                    <div className="mt-10">
                        <h3 className="font-bold">&#34;KELISHILDI&#34;</h3>
                        {document.approvers?.map((approver, index) => (
                            <div key={getIdString(approver._id) || `approver-${index}`} className="mb-2 w-full text-lg">
                <span className="min-w-[40%]">
                  <span className="inline-block align-top font-bold w-[400px] overflow-hidden text-ellipsis whitespace-normal">
                    {approver.position || "Lavozim noma'lum"}
                  </span>
                  <br />
                  <span className="flex items-center gap-4 font-bold">
                    <span>{approver.militaryRank || "Unvon noma'lum"}</span>
                      {approver.hasSigned && (
                          <span>
                        <QrCode fullNames={approver.fullName ?? "Noma'lum"} />
                      </span>
                      )}
                      <span>{getFormattedName(approver.fullName)}</span>
                  </span>
                  <i>{formatDate(document.createdAt)}</i>
                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Registratsiya */}
                {document.registrationIndex && province && (
                    <div className="max-w-[300px] flex flex-col text-justify mt-3">
            <span>
              <i>Reg: </i>
              <i>
                31/{province} - {document.registrationIndex} {formatGrif(document.grif)}
              </i>
            </span>
                        <p>
                            <i>{formatDate(document.createdAt)}</i>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
