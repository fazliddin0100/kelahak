'use client';

import { MessageCircleMore } from 'lucide-react';
import { PlaceholderPage } from './section-shell';

const Chat = () => (
  <PlaceholderPage
    title="Chat"
    description="Ichki xabarlar va muloqot"
    icon={MessageCircleMore}
    iconClassName="bg-emerald-500/10 text-emerald-600"
  />
);

export default Chat;
