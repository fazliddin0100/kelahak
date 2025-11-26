import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

      <div className="flex flex-row items-center gap-4">
        <Button variant="outline" onClick={() => setImzoModalOpen(true)}>
          Tasdiqlovchilar
        </Button>
        <Button variant="outline" onClick={() => setBuyruqModalOpen(true)}>
          Buyruqni Tasdiqlash
        </Button>
        <Button variant="outline" onClick={() => setXatModalOpen(true)}>
          Xat Yuborish
        </Button>

        {/* Ilova tanlash */}
        <IlovaModal
          value={formValues.attachmentText}
          onChange={(ids) =>
            setFormValues((prev) => updateForm(prev, { attachmentText: ids }))
          }
        />

        <Input
          className="bg-white"
          placeholder="Grifi..."
          value={formValues.grifi}
          onChange={(e) =>
            setFormValues((prev) => updateForm(prev, { grifi: e.target.value }))
          }
        />

        <Input
          className="bg-white"
          placeholder="Nomi..."
          value={formValues.nomi ?? ''}
          disabled={!!formValues.nomi}
          onChange={(e) =>
            setFormValues((prev) => updateForm(prev, { nomi: e.target.value }))
          }
        />

        <RegionSelectModal
          selectedRegions={formValues.selectedRegions}
          setSelectedRegions={(regions) =>
            setFormValues((prev) =>
              updateForm(prev, { selectedRegions: regions })
            )
          }
        />
      </div>
    </>
  );
};

export default Inputs;
