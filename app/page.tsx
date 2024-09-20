import FileUpload from '@/components/FileUpload';
import SubscriptionButton from '@/components/SubscriptionButton';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { checkSubscription } from '@/lib/subscription';
import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { ArrowRight, LogIn } from 'lucide-react';
import Link from 'next/link';

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;
  const isPro = await checkSubscription();
  let firstChat;
  firstChat = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId || ''));
  if (firstChat) {
    firstChat = firstChat[0];
  }

  return (
    <main className="w-screen min-h-screen bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-red-300 to-green-100">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center">
            <h1 className="mr-3 text-5xl font-semibold">Chat with PDF</h1>
            <UserButton />
          </div>

          <div className="flex mt-2">
            {isSignedIn && firstChat && (
              <>
                <Button>
                  <Link className="flex items-center" href={`/chat/${firstChat.id}`}>
                    Go to chats <ArrowRight className="ml-2" />
                  </Link>
                </Button>
                <div className="ml-3">
                  <SubscriptionButton isPro={isPro} />
                </div>
              </>
            )}
          </div>

          <p className="max-w-xl mt-1 text-lg text-slate-600">
            Join millions of users for research, answer questions and get answers with AI
          </p>

          <div className="w-full mt-4">
            {isSignedIn ? (
              <FileUpload />
            ) : (
              <Link href="/sign-in">
                <Button>
                  Sign in to get started <LogIn className="ml-2" size={16} />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
