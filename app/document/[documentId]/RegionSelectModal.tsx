"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Building2, Loader2, Search, X } from "lucide-react";
import { parseDocumentAddress } from "@/lib/documentAddress";

interface Props {
    /** copyNumber: tanlangan manzillar ("Korxona (Viloyat)") */
    selectedRegions: string[];
    setSelectedRegions: (regions: string[]) => void;
    triggerClassName?: string;
}

type Organization = { id: string; name: string; province: string; label: string };

/**
 * Hujjat yuborish manzillari — faqat tizimda ro'yxatdan o'tgan korxonalar (shahobchalar).
 * Ro'yxatga olingandan keyin har bir tanlangan korxonaning kotibiyatiga nusxa boradi.
 */
export default function RegionSelectModal({ selectedRegions, setSelectedRegions, triggerClassName }: Props) {
    const [open, setOpen] = useState(false);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [ownId, setOwnId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [draft, setDraft] = useState<string[]>(selectedRegions);

    useEffect(() => {
        if (!open || orgs.length) return;
        let active = true;
        setLoading(true);
        fetch("/api/shahobcha/all", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : { organizations: [] }))
            .then((d) => {
                if (!active) return;
                setOrgs(Array.isArray(d.organizations) ? d.organizations : []);
                setOwnId(d.ownShahobchaId ?? null);
            })
            .catch(() => {})
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [open, orgs.length]);

    const grouped = useMemo(() => {
        const q = query.trim().toLowerCase();
        const map = new Map<string, Organization[]>();
        for (const o of orgs) {
            if (o.id === ownId) continue; // o'z korxonasiga nusxa yuborilmaydi
            if (q && !o.label.toLowerCase().includes(q)) continue;
            map.set(o.province, [...(map.get(o.province) ?? []), o]);
        }
        return [...map.entries()];
    }, [orgs, ownId, query]);

    const toggle = (label: string) =>
        setDraft((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));

    // Eski hujjatlardagi faqat viloyat nomli manzillar ham ko'rinib, olib tashlanishi mumkin
    const legacy = draft.filter((v) => parseDocumentAddress(v).kind === "region");

    return (
        <>
            <Button
                variant="outline"
                className={triggerClassName}
                onClick={() => {
                    setDraft(selectedRegions);
                    setQuery("");
                    setOpen(true);
                }}>
                <Building2 className="mr-2 size-4" />
                Manzillarni tanlash
                {selectedRegions.length > 0 && (
                    <span className="ml-1 rounded-full bg-sky-500/20 px-1.5 text-xs text-sky-700">
                        {selectedRegions.length}
                    </span>
                )}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="size-5 text-primary" />
                            Yuborish manzillari
                        </DialogTitle>
                        <DialogDescription>
                            Tizimda ro‘yxatdan o‘tgan korxonalardan tanlang. Hujjat ro‘yxatga olingach, har biriga
                            alohida nusxa yuboriladi va u yerda kiruvchi hujjat sifatida ro‘yxatga olinadi.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Korxona yoki viloyat nomi"
                            className="pl-8"
                        />
                    </div>

                    {legacy.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {legacy.map((v) => (
                                <span
                                    key={v}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                                    {v} (viloyat)
                                    <button type="button" onClick={() => toggle(v)} aria-label={`${v} manzilini olib tashlash`}>
                                        <X className="size-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                        {loading ?
                            <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                                <Loader2 className="size-4 animate-spin" /> Yuklanmoqda...
                            </p>
                        : grouped.length === 0 ?
                            <p className="py-8 text-center text-sm text-slate-500">Korxona topilmadi.</p>
                        : grouped.map(([province, list]) => (
                                <div key={province}>
                                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {province}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {list.map((o) => (
                                            <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={draft.includes(o.label)}
                                                    onCheckedChange={() => toggle(o.label)}
                                                />
                                                <span>{o.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Bekor qilish
                        </Button>
                        <Button
                            onClick={() => {
                                setSelectedRegions(draft);
                                setOpen(false);
                            }}>
                            Saqlash ({draft.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
