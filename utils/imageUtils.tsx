import {StaticImageData} from "next/image";

export const getBase64FromImage = async (imageSrc: StaticImageData): Promise<string> => {
    try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error("Logo to Base64 Error:", err);
        return "";
    }
};

export const convertBlobUrlToBase64 = async (blobUrl: string): Promise<string | null> => {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error("Blob URL to Base64 Error:", err);
        return null;
    }
};

export const processContentWithBase64Images = async (html: string): Promise<string> => {
    const div = document.createElement("div");
    div.innerHTML = html;

    const images = div.querySelectorAll("img");
    for (const img of images) {
        const blobUrl = img.src;
        if (blobUrl.startsWith("blob:")) {
            const base64 = await convertBlobUrlToBase64(blobUrl);
            if (base64) {
                img.src = base64;
            }
        }
    }

    return div.innerHTML;
};
