'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Forma3 from './forma-3';
import Forma6 from './forma-6';
import KelganHujjatlar from './kel-documents';
import { BookText } from 'lucide-react';

const Jurnal = () => {
  const [activeComponent, setActiveComponent] = useState<string>('forma3');

  const renderContent = () => {
    switch (activeComponent) {
      case 'forma3':
        return <Forma3 />;
      case 'forma6':
        return <Forma6 />;
      case 'kelgan':
        return <KelganHujjatlar />;
      default:
        return <div className="text-gray-500"></div>;
    }
  };

  const baseBtn =
    'w-full transition-all duration-300 ease-in-out active:scale-95';

  return (
    <div className="mt-10 flex h-screen">
      {/* Sidebar */}
      <div className="w-[10%] bg-gray-100 p-4 flex flex-col gap-4">
        {/* Forma 3 */}
        <Button
          onClick={() => setActiveComponent('forma3')}
          className={`${baseBtn} ${
            activeComponent === 'forma3'
              ? 'bg-blue-600 text-white'
              : 'bg-black hover:bg-blue-600'
          } flex items-center justify-start`}>
          <BookText className="inline-block mr-2 size-6" />
          Forma 3
        </Button>

        {/* Forma 6 */}
        <Button
          onClick={() => setActiveComponent('forma6')}
          className={`${baseBtn} ${
            activeComponent === 'forma6'
              ? 'bg-blue-600 text-white'
              : 'bg-black hover:bg-blue-600'
          } flex items-center justify-start`}>
          <BookText className="inline-block mr-2 size-6" />
          Forma 6
        </Button>

        {/* Kelgan Hujjatlar */}
        <Button
          onClick={() => setActiveComponent('kelgan')}
          className={`${baseBtn} ${
            activeComponent === 'kelgan'
              ? 'bg-blue-600 text-white'
              : 'bg-black hover:bg-blue-600'
          } flex items-center justify-start`}>
          <BookText className="inline-block mr-2 size-6" />
          Kelgan Hujjatlar
        </Button>
      </div>

      {/* Content */}
      <div className="w-[90%] bg-white p-6 shadow-lg rounded-lg overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Jurnal;
