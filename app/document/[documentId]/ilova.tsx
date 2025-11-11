"use client"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"

const IlovaModal = () => {
    return (
        <div className="space-y-4 bg-white rounded-lg">
            <Select onValueChange={(value) => console.log("Ilovani:", value)}>
                <SelectTrigger className="w-[300px] p-2 text-center">
                    <SelectValue placeholder="Ilovani tanlang" className="text-center"/>
                </SelectTrigger>
                <SelectContent className="bg-white text-center">
                    <SelectItem value="option1" className="text-center">Variant 1</SelectItem>
                    <SelectItem value="option2" className="text-center">Variant 2</SelectItem>
                    <SelectItem value="option3" className="text-center">Variant 3</SelectItem>
                </SelectContent>

            </Select>
        </div>
    )
}
export default IlovaModal
