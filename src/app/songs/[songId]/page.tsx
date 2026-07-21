import { SongDetailPage } from "../song-detail-page";

interface SongPageProps {
  params: Promise<{ songId: string }>;
}

export default async function SongPage({ params }: SongPageProps) {
  const { songId } = await params;
  return <SongDetailPage songId={songId} />;
}
