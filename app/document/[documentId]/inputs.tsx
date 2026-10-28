import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BookMarked,
  MapPin,
  Paperclip,
  Send,
  ShieldCheck,
  Tag,
  Type,
} from 'lucide-react';
import ImzoQoshishModal from './tasdiqlovchilar';
import RegionSelectModal from './RegionSelectModal';
import BuyruqniTasdiqlashModal from './BuyruqniTasdiqlashModal';
import IlovaModal from './ilova';
import XatYuboruvchiModal from './XatYuboruvchiModal';
import { Approver, DocumentFormValues } from '@/types/user';
import { updateForm } from '@/utils/updateForm';

interface InputsProps {
  formValues: DocumentFormValues;
  setFormValues: React.Dispatch<React.SetStateAction<DocumentFormValues>>;
}

const toolBtn =
  'h-9 gap-2 rounded-md border-slate-300 bg-white text-[#102c50] shadow-none transition-colors duration-150 hover:border-[#c7a75b] hover:bg-[#fbf8ef] hover:text-[#102c50] focus-visible:ring-[#c7a75b]/30';

const fieldClass =
  'h-9 border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus-visible:border-[#c7a75b] focus-visible:ring-[#c7a75b]/30';

const Inputs = ({ formValues, setFormValues }: InputsProps) => {
  const [isImzoModalOpen, setImzoModalOpen] = React.useState(false);
  const [isBuyruqModalOpen, setBuyruqModalOpen] = React.useState(false);
  const [isXatModalOpen, setXatModalOpen] = React.useState(false);

  return (
    <>
      <ImzoQoshishModal
        open={isImzoModalOpen}
        onClose={() => setImzoModalOpen(false)}
        onSave={(
          mainApprover: Approver | null,
          additionalApprovers: Approver[]
        ) =>
          setFormValues((prev) =>
            updateForm(prev, {
              imzoMain: mainApprover,
              imzoAll: additionalApprovers,
            })
          )
        }
      />

      <BuyruqniTasdiqlashModal
        open={isBuyruqModalOpen}
        onClose={() => setBuyruqModalOpen(false)}
        onSave={({ sender, receivers }) =>
          setFormValues((prev) =>
            updateForm(prev, {
              buyruqSender: sender,
              buyruqReceivers: receivers,
            })
          )
        }
      />

      <XatYuboruvchiModal
        open={isXatModalOpen}
        onClose={() => setXatModalOpen(false)}
        onSave={({ sender, receivers }) =>
          setFormValues((prev) =>
            updateForm(prev, {
              xatSender: sender,
              xatReceivers: receivers,
            })
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className={toolBtn}
          onClick={() => setImzoModalOpen(true)}>
          <ShieldCheck className="size-4" />
          <span className="hidden sm:inline">Tasdiqlovchilar</span>
        </Button>

        <Button
          variant="outline"
          className={toolBtn}
          onClick={() => setBuyruqModalOpen(true)}>
          <BookMarked className="size-4" />
          <span className="hidden sm:inline">Buyruqni tasdiqlash</span>
        </Button>

        <Button
          variant="outline"
          className={toolBtn}
          onClick={() => setXatModalOpen(true)}>
          <Send className="size-4" />
          <span className="hidden sm:inline">Xat yuborish</span>
        </Button>

        <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1">
          <Paperclip className="size-4 shrink-0 text-slate-500" />
          <IlovaModal
            value={formValues.attachmentText}
            onChange={(ids) =>
              setFormValues((prev) => updateForm(prev, { attachmentText: ids }))
            }
          />
        </div>

        <div className="mx-1 hidden h-6 w-px bg-slate-300 sm:block" />

        <div className="relative min-w-[120px] flex-1 sm:max-w-[140px]">
          <Tag className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            className={cn(fieldClass, 'pl-8')}
            placeholder="Grifi..."
            value={formValues.grifi}
            onChange={(e) =>
              setFormValues((prev) =>
                updateForm(prev, { grifi: e.target.value })
              )
            }
          />
        </div>

        <div className="relative min-w-[140px] flex-1 sm:max-w-[200px]">
          <Type className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            className={cn(fieldClass, 'pl-8')}
            placeholder="Nomi..."
            value={formValues.nomi ?? ''}
            disabled={!!formValues.nomi}
            onChange={(e) =>
              setFormValues((prev) =>
                updateForm(prev, { nomi: e.target.value })
              )
            }
          />
        </div>

        <RegionSelectModal
          selectedRegions={formValues.selectedRegions}
          setSelectedRegions={(regions) =>
            setFormValues((prev) =>
              updateForm(prev, { selectedRegions: regions })
            )
          }
          triggerClassName={toolBtn}
        />
      </div>
    </>
  );
};

export default Inputs;
