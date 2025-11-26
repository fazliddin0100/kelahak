import { DocumentType, Approver } from '@/types/document';
import { format } from 'date-fns';
import QrCode from '@/helpers/qr-code';
import React from 'react';

interface MalumotnomaProps {
  document: DocumentType;
  data?: DocumentType | null;
}

export const Malumotnoma: React.FC<MalumotnomaProps> = ({ document, data }) => {
  const getFormattedName = (fullName?: string): string => {
    if (!fullName) return "Noma'lum";
    const twoLetterPrefixes = ['Sh', 'Ch', 'Dj', 'Zh', 'Kh'];
    const parts = fullName.trim().split(/\s+/);

    let sName = parts[0] ?? '';
    let name = parts[1] ?? '';
    let fName = parts[2] ?? '';

    if (parts.length === 2) {
      fName = parts[1];
      name = '';
    } else if (parts.length === 1) {
      fName = parts[0];
      sName = '';
      name = '';
    }

    const getFormattedPart = (part: string): string =>
      !part
        ? ''
        : twoLetterPrefixes.includes(part.substring(0, 2))
        ? part.substring(0, 2)
        : part.charAt(0).toUpperCase();

    const sNameFormatted = getFormattedPart(sName);
    const nameFormatted = getFormattedPart(name);

    if (!sName && !name) return fName || "Noma'lum";
    return `${sNameFormatted}${nameFormatted ? `.${nameFormatted}.` : ''} ${
      fName || "Noma'lum"
    }`.trim();
  };

  const formatGrif = (grif?: string): string =>
    grif ? grif.charAt(0).toUpperCase() + grif.slice(1).toLowerCase() : '';

  const formatDate = (date?: string | Date | { $date: string }): string => {
    if (!date) return "Sana noma'lum";
    const parsedDate =
      typeof date === 'object' && '$date' in date
        ? new Date(date.$date)
        : new Date(date);
    return `${format(parsedDate, 'yyyy')} yil "${format(
      parsedDate,
      'dd'
    )}" ${format(parsedDate, 'MMM').toLowerCase()}`;
  };

  const isSigned = document.author?.hasSigned ?? false;

  return (
    <div
      className="flex flex-col justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] overflow-x-hidden"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <div className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-[80px] pt-[30px] pr-[30px] pb-[30px] text-lg box-border mb-4">
        {/* Hujjat grifi */}
        <div className="flex flex-col justify-end items-end mb-1">
          <p>{formatGrif(document.grif)}</p>
          <p>{Math.max(document.copyNumber?.length ?? 0, 1)} -Nusxa</p>
        </div>

        {/* Kontent */}
        <div
          className="mt-4"
          style={{
            width: '100%',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
          dangerouslySetInnerHTML={{
            __html:
              typeof document.content === 'string' ? document.content : '',
          }}
        />

        {/* Muallif imzosi */}
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
                  <QrCode fullNames={document.author.fullName} />
                )}
              </span>
              <span>{document.author?.fullName ?? ''}</span>
            </span>
            <i>{formatDate(document.createdAt)}</i>
          </span>
        </div>

        {/* Tasdiqlovchilar */}
        {Array.isArray(document.approvers) && document.approvers.length > 0 && (
          <div className="mt-10">
            <h3 className="font-bold">&#34;KELISHILDI&#34;</h3>

            {document.bosSigned && (
              <div className="mb-2 w-full text-lg">
                <span className="inline-block align-top font-bold w-[400px] overflow-hidden text-ellipsis whitespace-normal">
                  {document.bosSigned.position ?? "Lavozim noma'lum"}
                </span>
                <br />
                <span className="flex items-center gap-4 font-bold">
                  <span>
                    {document.bosSigned.militaryRank ?? "Unvon noma'lum"}
                  </span>
                  <span>
                    {document.bosSigned.hasSigned && (
                      <QrCode fullNames={document.bosSigned.fullName} />
                    )}
                  </span>
                  <span>{getFormattedName(document.bosSigned.fullName)}</span>
                </span>
                <i>{formatDate(document.createdAt)}</i>
              </div>
            )}

            {document.approvers.map((approver: Approver, index: number) => (
              <div key={index} className="mb-2 w-full text-lg">
                <span className="inline-block align-top font-bold w-[400px] overflow-hidden text-ellipsis whitespace-normal">
                  {approver.position ?? "Lavozim noma'lum"}
                </span>
                <br />
                <span className="flex items-center gap-4 font-bold">
                  <span>{approver.militaryRank ?? "Unvon noma'lum"}</span>
                  <span>
                    {approver.hasSigned && (
                      <QrCode fullNames={approver.fullName} />
                    )}
                  </span>
                  <span>{getFormattedName(approver.fullName)}</span>
                </span>
                <i>{formatDate(document.createdAt)}</i>
              </div>
            ))}
          </div>
        )}

        {/* Registratsiya */}
        <div className="max-w-[300px] flex flex-col text-justify mt-3">
          <span>
            <i>Reg: </i>
            <i>
              31/{data?.province} - {document.registrationIndex}{' '}
              {formatGrif(document.grif)}
            </i>
          </span>
          <p>
            <i>{formatDate(document.createdAt)}</i>
          </p>
        </div>
      </div>
    </div>
  );
};
