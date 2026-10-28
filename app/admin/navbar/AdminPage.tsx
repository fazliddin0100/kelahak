'use client';

import Arxiv from './arxiv';
import Buyruq from './buyruq';
import Chat from './chat';
import Nomeklatura from './nomeklatura';
import TestQuestions from './test';
import TimeFileControl from './controlni';
import Users from './users';

interface Props {
  page: string;
}

export function AdminPage({ page }: Props) {
  return (
    <div className="w-full">
      {page === 'nomeklatura' && <Nomeklatura />}
      {page === 'orders' && <Buyruq />}
      {page === 'arxiv' && <Arxiv />}
      {page === 'users' && <Users />}
      {page === 'timeFileControl' && <TimeFileControl />}
      {page === 'test' && <TestQuestions />}
      {page === 'chat' && <Chat />}
    </div>
  );
}
