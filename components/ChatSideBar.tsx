'use client';
import { DrizzleChat } from '@/lib/db/schema';
import Link from 'next/link';
import React from 'react';
import { Button } from './ui/button';
import { MessageCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import SubscriptionButton from './SubscriptionButton';

type Props = {
  chats: DrizzleChat[];
  chatId: number;
  isPro?: boolean;
};

const ChatSideBar = ({ chats, chatId, isPro }: Props) => {

  return (
    <div className="w-full h-screen p-4 text-gray-200 bg-gray-900 relative">
      <Link href="/">
        <Button className="w-full border-dashed border-white border mb-2">
          <PlusCircle className="mr-2 w-4 h-4" />
          New Chat
        </Button>
      </Link>
      <div className="flex flex-col">
        {chats.map((chat) => (
          <Link key={chat.id} href={`/chat/${chat.id}`}>
            <div
              className={cn(
                'rounded-lg p-3 text-slate-300 flex items-center',
                { 'bg-blue-600': chat.id === chatId },
                { 'hover:text-white': chat.id !== chatId }
              )}>
              <MessageCircle className="mr-2 w-4 h-4" />
              <p className="w-ful overflow-hidden text-sm truncate whitespace-nowrap text-ellipsis">
                {chat.pdfName}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <div className="absolute bottom-4 left-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
          <Link href="/">Home</Link>
          <Link target="_blank" href="https://github.com/in0vik/ChatPDF">Source</Link>
          <SubscriptionButton isPro={isPro} />
        </div>
      </div>
    </div>
  );
};

export default ChatSideBar;
