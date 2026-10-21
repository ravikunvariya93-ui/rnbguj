import dbConnect from '@/lib/db';
import KnowledgeResource from '@/models/KnowledgeResource';
import KnowledgeClient, { type KnowledgeItem } from './KnowledgeClient';
import { auth } from '@/auth';
import { isAdminSession } from '@/lib/accessServer';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  await dbConnect();
  const session = await auth();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id || '';
  const isAdmin = await isAdminSession(session);

  const raw = await KnowledgeResource.find({}).sort({ createdAt: -1 }).lean();
  const items = JSON.parse(JSON.stringify(raw)) as KnowledgeItem[];

  return (
    <KnowledgeClient
      initialItems={items}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
    />
  );
}
