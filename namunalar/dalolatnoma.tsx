import { DocumentType, Approver, Sender } from "@/types/document";
import { format } from "date-fns";
import QrCode from "@/helpers/qr-code";
import React from "react";

interface DalolatnomaProps {
    document: DocumentType;
    data?: DocumentType | null;
}

export const Dalolatnoma: React.FC<DalolatnomaProps> = ({ document, data }) => {
    const getFormattedName = (fullName?: string): string => {
        if (!fullName) return "Noma'lum";
        const twoLetterPrefixes = ["Sh", "Ch", "Dj", "Zh", "Kh"];
        const parts = fullName.trim().split(/\s+/);

        let sName = parts[0] ?? "";
        let name = parts[1] ?? "";
        let fName = parts[2] ?? "";

        if (parts.length === 2) {
            fName = parts[1];
            name = "";
        } else if (parts.length === 1) {
            fName = parts[0];
            sName = "";
            name = "";
        }

        const getFormattedPart = (part: string): string =>
            !part
                ? ""
                : twoLetterPrefixes.includes(part.substring(0, 2))
                    ? part.substring(0, 2)
                    : part.charAt(0).toUpperCase();

        const sNameFormatted = getFormattedPart(sName);
        const nameFormatted = getFormattedPart(name);

        if (!sName && !name) return fName || "Noma'lum";
        return `${sNameFormatted}${nameFormatted ? `.${nameFormatted}.` : ""} ${
            fName || "Noma'lum"
        }`.trim();
    };

    const formatGrif = (grif?: string): string =>
        grif ? grif.charAt(0).toUpperCase() + grif.slice(1).toLowerCase() : "";

    const formatDate = (date?: string | Date | { $date: string }): string => {
        if (!date) return "Sana noma'lum";
        const parsedDate =
            typeof date === "object" && "$date" in date
                ? new Date(date.$date)
                : new Date(date);
        return `${format(parsedDate, "yyyy")} yil "${format(
            parsedDate,
            "dd"
        )}" ${format(parsedDate, "MMM").toLowerCase()}`;
    };

    const isSigned = (document.bosSigned as Sender)?.hasSigned ?? false;

    return (
        <div
            className="flex flex-col justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] overflow-x-hidden"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
            <div className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-[80px] pt-[30px] pr-[30px] pb-[30px] text-lg box-border mb-4">
                {/* Grif va nusxa */}
                <div className="flex flex-col justify-end items-end mb-1">
                    <p>{formatGrif(document.grif)}</p>
                    <p>
                        {document.copyNumber
                            ? `${document.copyNumber.length} -Nusxada`
                            : "Nusxalar soni noma'lum"}
                    </p>
                </div>

                {/* Tasdiqlash qismi */}
                <div className="flex flex-row justify-between items-center mt-2">
                    <span className="max-w-[40%]" />
                    <span className="max-w-[60%]">
            <p className="font-bold">&#34;TASDIQLAYMAN&#34;</p>
            <p className="font-bold">
              {(document.bosSigned as Sender)?.position ??
                  document.position ??
                  "Lavozim noma'lum"}
            </p>
            <span className="flex items-center justify-between gap-4">
              <span className="font-bold">
                {(document.bosSigned as Sender)?.militaryRank ??
                    document.militaryRank ??
                    "Unvon noma'lum"}
              </span>
              <span className="text-center">
                {isSigned && (
                    <QrCode fullNames={(document.bosSigned as Sender)?.fullName} />
                )}
              </span>
              <span className="font-bold">
                {getFormattedName(
                    (document.bosSigned as Sender)?.fullName ?? document.fullName
                )}
              </span>
            </span>
            <i>{formatDate(document.createdAt)}</i>
          </span>
                </div>

                {/* Sarlavha */}
                <div className="flex flex-col justify-center items-center mt-3">
                    <p className="font-bold">
                        {document.title?.toUpperCase() ?? "SARLAVHA NOMA'LUM"}
                    </p>
                    <span className="flex w-full justify-between items-center gap-4 mt-4">
            <span>
              <i>{formatDate(document.createdAt)}</i>
            </span>
            <span>
              31/{data?.province}-
              <u>
                {document.registrationIndex} {formatGrif(document.grif)}
              </u>
            </span>
          </span>
                </div>

                {/* Kontent */}
                <div className="flex flex-col justify-center items-center">
                    <div
                        style={{ width: "100%", wordBreak: "break-word", overflowWrap: "break-word" }}
                        className="mt-4"
                        dangerouslySetInnerHTML={{
                            __html: typeof document.content === "string" ? document.content : "",
                        }}
                    />
                </div>

                {/* Muallif */}
                <div className="mt-2 mb-2 w-full text-lg">
          <span className="min-w-[40%]">
            <span className="inline-block align-top font-bold w-[400px] overflow-hidden text-ellipsis whitespace-normal">
              {document.author?.position ?? "Lavozim noma'lum"}
            </span>
            <br />
            <span className="flex items-center gap-4 font-bold">
              <span>{document.author?.militaryRank ?? "Unvon noma'lum"}</span>
              <span>
                {isSigned && document.author?.fullName && (
                    <QrCode fullNames={document.author?.fullName} />
                )}
              </span>
              <span>{document.author?.fullName ?? ""}</span>
            </span>
            <i>{formatDate(document.createdAt)}</i>
          </span>
                </div>

                {/* Kelishilganlar */}
                {Array.isArray(document.approvers) && document.approvers.length > 0 && (
                    <div className="mt-10">
                        <h3 className="font-bold">&#34;KELISHILDI&#34;</h3>
                        {document.approvers.map((approver: Approver, index: number) => (
                            <div key={index} className="mb-2 w-full text-lg">
                <span className="min-w-[40%]">
                  <span className="inline-block align-top font-bold w-[400px] overflow-hidden text-ellipsis whitespace-normal">
                    {approver.position ?? "Lavozim noma'lum"}
                  </span>
                  <br />
                  <span className="flex items-center gap-4 font-bold">
                    <span>{approver.militaryRank ?? "Unvon noma'lum"}</span>
                    <span>
                      {approver.hasSigned && approver.fullName && (
                          <QrCode fullNames={approver.fullName} />
                      )}
                    </span>
                    <span>{getFormattedName(approver.fullName)}</span>
                  </span>
                  <span>
                    <i>{formatDate(document.createdAt)}</i>
                  </span>
                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
