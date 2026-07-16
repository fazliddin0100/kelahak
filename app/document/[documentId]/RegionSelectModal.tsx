"use client";

import {useRef, useState} from "react";
import Draggable, {DraggableData, DraggableEvent} from "react-draggable";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {MapPin} from "lucide-react";

interface Props {
    selectedRegions: string[];
    setSelectedRegions: (regions: string[]) => void;
    triggerClassName?: string;
}

const regions = [
    "Toshkent viloyati", "Andijon", "Namangan", "Farg‘ona", "Samarqand", "Buxoro",
    "Xorazm", "Surxondaryo", "Qashqadaryo", "Jizzax", "Sirdaryo", "Navoiy",
    "Qoraqalpog‘iston"
];

export default function RegionSelectModal({
                                              selectedRegions,
                                              setSelectedRegions,
                                              triggerClassName,
                                          }: Props) {
    const [open, setOpen] = useState(false);
    const [disabled, setDisabled] = useState(true);
    const [bounds, setBounds] = useState({left: 0, top: 0, right: 0, bottom: 0});

    const dragRef = useRef<HTMLDivElement>(null);

    const onStartDrag = (_e: DraggableEvent, data: DraggableData) => {
        const win = document.documentElement;
        const rect = dragRef.current?.getBoundingClientRect();
        if (!rect) return;

        setBounds({
            left: -rect.left + data.x,
            right: win.clientWidth - (rect.right - data.x),
            top: -rect.top + data.y,
            bottom: win.clientHeight - (rect.bottom - data.y),
        });
    };

    const toggleRegion = (region: string) => {
        if (selectedRegions.includes(region)) {
            setSelectedRegions(selectedRegions.filter((r) => r !== region));
        } else {
            setSelectedRegions([...selectedRegions, region]);
        }
    };

    return (
        <>
            {/* Modalni ochuvchi tugma */}
            <Button variant="outline" className={triggerClassName} onClick={() => setOpen(true)}>
                <MapPin className="mr-2 size-4" />
                Viloyatlarni tanlash
                {selectedRegions.length > 0 && (
                    <span className="ml-1 rounded-full bg-sky-500/20 px-1.5 text-xs text-sky-300">
                        {selectedRegions.length}
                    </span>
                )}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <Draggable
                    disabled={disabled}
                    onStart={onStartDrag}
                    bounds={bounds}
                    nodeRef={dragRef}
                >
                    <div ref={dragRef}>
                        <DialogContent
                            className="max-w-md"
                            onMouseOver={() => setDisabled(false)}
                            onMouseOut={() => setDisabled(true)}
                        >
                            <DialogHeader>
                                <DialogTitle className="cursor-move select-none">
                                    Viloyatlarni tanlang
                                </DialogTitle>
                                <DialogDescription>
                                    Viloyatlarni tanlang, so‘ng saqlash tugmasini bosing.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Checkboxlar */}
                            <div className="flex flex-col gap-3 py-2">
                                {regions.map((region) => (
                                    <label
                                        key={region}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={selectedRegions.includes(region)}
                                            onCheckedChange={() => toggleRegion(region)}
                                        />
                                        <span>{region}</span>
                                    </label>
                                ))}
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)}>
                                    Bekor qilish
                                </Button>
                                <Button onClick={() => setOpen(false)}>Saqlash</Button>
                            </DialogFooter>
                        </DialogContent>
                    </div>
                </Draggable>
            </Dialog>
        </>
    );
}
