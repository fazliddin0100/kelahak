'use client';

import { MessageCircleMore } from 'lucide-react';
import { PlaceholderPage } from './shared';

const Chat = () => (
  <PlaceholderPage
    title="Chat"
    description="Foydalanuvchilar bilan ichki muloqot"
    icon={MessageCircleMore}
    iconClassName="bg-violet-500/10 text-violet-600"
  />
);

export default Chat;
