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
  'h-9 gap-2 rounded-lg border-slate-600/50 bg-slate-700/50 text-slate-200 shadow-sm hover:border-sky-500/50 hover:bg-slate-700 hover:text-white';

const fieldClass =
  'h-9 border-slate-600/50 bg-slate-700/40 text-slate-100 placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-sky-500/30';

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

        <div className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/40 px-2 py-1">
          <Paperclip className="size-4 shrink-0 text-slate-400" />
          <IlovaModal
            value={formValues.attachmentText}
            onChange={(ids) =>
              setFormValues((prev) => updateForm(prev, { attachmentText: ids }))
            }
          />
        </div>

        <div className="mx-1 hidden h-6 w-px bg-slate-600 sm:block" />

        <div className="relative min-w-[120px] flex-1 sm:max-w-[140px]">
          <Tag className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
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
          <Type className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
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
