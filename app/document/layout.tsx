import React from 'react';

interface DocumentLayoutProps {
  children: React.ReactNode;
}

const DocumentLayout = ({ children }: DocumentLayoutProps) => {
  return <div className="h-screen w-full overflow-hidden bg-slate-50">{children}</div>;
};

export default DocumentLayout;
