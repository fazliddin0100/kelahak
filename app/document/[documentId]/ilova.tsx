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
    <div>
      <Select
        value={value[0]}
        onValueChange={(id) => onChange(id ? [id] : [])}>
        <SelectTrigger className="h-8 w-[180px] border-0 bg-transparent text-slate-200 shadow-none focus:ring-0">
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
