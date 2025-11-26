import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocuments } from '@/hooks/useDocuments';

interface IlovaModalProps {
  value?: string[];
  onChange: (ids: string[]) => void;
}

const IlovaModal = ({ value = [], onChange }: IlovaModalProps) => {
  const { documents } = useDocuments();

  return (
    <div className="space-y-4 bg-white rounded-lg">
      <Select
        value={value[0]} // agar faqat bitta tanlansa
        onValueChange={(id) => onChange(id ? [id] : [])}>
        <SelectTrigger className="w-[200px] p-2 text-center">
          <SelectValue placeholder="Ilovani tanlang" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          {documents.map((doc) => (
            <SelectItem
              key={doc._id}
              value={doc._id}
              className="text-center font-bold">
              {doc.title}
              {doc.registrationIndex ? ` Reg: ${doc.registrationIndex}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default IlovaModal;
