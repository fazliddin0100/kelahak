// utils/openDocument.ts
import { renderToStaticMarkup } from 'react-dom/server';
import globalsCss from '@/app/globals.css?inline';
import { YollovXati } from '@/namunalar/yollov-xati';
import { Dalolatnoma } from '@/namunalar/dalolatnoma';
import { Malumotnoma } from '@/namunalar/malumotnoma';
import { Buyruq } from '@/namunalar/buyruq';
import { Bildirgi } from '@/namunalar/bildirgi';
import { DocumentType } from '@/types/document';
import { getBase64FromImage, processContentWithBase64Images } from './imageUtils';
import logo from '@/public/dxxLogo.png';
import gerb from '@/public/gerb.png';
import React from "react";

export const openDocument = async (document: DocumentType) => {
    const newTab = window.open('', '_blank');
    if (!newTab) {
        alert('Yangi oyna ochilmadi. Pop-up bloklovchi o‘chirilganligini tekshiring.');
        return;
    }

    try {
        const logoBase64 = await getBase64FromImage(logo);
        let component: React.ReactElement;

        switch (document.title?.toLowerCase().trim()) {
            case 'xat':
                component = <YollovXati document={document} logoBase64={logoBase64}  />;
                break;
            case 'dalolatnoma':
                component = <Dalolatnoma document={document} logoBase64={logoBase64} />;
                break;
            case 'malumotnoma':
            case "ma'lumotnoma":
                component = <Malumotnoma document={document} logoBase64={logoBase64} />;
                break;
            case 'bildirgi':
                component = (
                    <Bildirgi
                        document={document}
                        logoBase64={logoBase64}
                        data={'data' in document ? (document as any).data : undefined}
                    />
                );
                break;
            case 'buyruq':
                component = (
                    <Buyruq
                        document={document}
                        logoBase64={logoBase64}
                        gerb={await getBase64FromImage(gerb)}
                    />
                );
                break;
            default:
                throw new Error('Hujjat turi topilmadi');
        }

        let htmlContent = renderToStaticMarkup(component);
        if (document.content) {
            htmlContent = await processContentWithBase64Images(htmlContent);
        }

        // globals.css ni to'liq ichiga qo'shamiz
        const fullHtml = `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" href="../app/globals.css" />
  <title>${document.title || 'Hujjat'}</title>
  <style>
    /* To'liq globals.css ichidagi CSS */
    ${globalsCss}

    /* Qo'shimcha stillar */
    body {
      font-family: 'Times New Roman', Times, serif !important;
      padding: 20px;
      line-height: 1.6;
      margin: 0;
      background: #f3f4f6;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 10px 0;
    }
    td, th { 
      border: 1px solid #000; 
      padding: 8px; 
      text-align: center; 
    }
    .custom-alert {
      position: fixed; top: 20px; right: 20px; background: #f87171; color: white;
      padding: 15px 20px; border-radius: 8px; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.2);
      z-index: 9999; transition: opacity 0.5s;
    }
    @media print {
      body { background: white; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    const showAlert = (msg) => {
      const div = document.createElement('div');
      div.className = 'custom-alert';
      div.textContent = msg;
      document.body.appendChild(div);
      setTimeout(() => div.style.opacity = '0', 3500);
      setTimeout(() => div.remove(), 4000);
    };
    document.oncontextmenu = e => { e.preventDefault(); showAlert("Hujjat himoyalangan."); };
    document.onkeydown = e => {
      if ((e.ctrlKey && ['p','s','u','c'].includes(e.key.toLowerCase())) || e.key === 'PrintScreen') {
        e.preventDefault(); showAlert("Bu hujjat himoyalangan.");
      }
    };
    const originalPrint = window.print;
    window.print = () => showAlert("Chop etish cheklangan.");
  </script>
</body>
</html>
`;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        newTab.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 10000);

    } catch (err) {
        console.error('Hujjat ochishda xato:', err);
        const errorHtml = `
<!DOCTYPE html>
<html lang="uz">
<head><meta charset="UTF-8"><title>Xato</title></head>
<body style="font-family: sans-serif; padding: 40px; text-align: center;">
  <h2>Hujjatni ochishda xatolik yuz berdi</h2>
  <p>Iltimos, qayta urinib ko'ring yoki administratorga murojaat qiling.</p>
</body>
</html>`;
        const blob = new Blob([errorHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        newTab.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
};