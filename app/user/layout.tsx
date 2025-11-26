import React from 'react';

interface DocumentLayoutProps {
  children: React.ReactNode;
}

const UserLayout = async ({ children }: DocumentLayoutProps) => {
  return <>{children}</>;
};

export default UserLayout;
