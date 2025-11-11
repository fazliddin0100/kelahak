// lib/antivirus.ts
import NodeClam from "clamscan";

let clamInstance: any = null;

async function getClam() {
    if (!clamInstance) {
        const clam = new NodeClam().init({
            removeInfected: false,
            quarantineInfected: false,
            debugMode: false,
            clamscan: {
                path: "/usr/bin/clamscan", // Linux/Mac uchun
                scanArchives: true,
            },
        });
        clamInstance = clam;
    }
    return clamInstance;
}

export async function scanBufferWithClamAV(buffer: Buffer): Promise<boolean> {
    const clam = await getClam();
    const {isInfected} = await clam.isInfected(buffer);
    return !isInfected;
}
