// app/document-open/[id]/page.tsx
import DocumentClient from './DocumentClient';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
    const { id } = await params;

    return <DocumentClient documentId={id} />;
}