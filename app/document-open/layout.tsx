import EimzoSignHost from '@/components/EimzoSignHost';

export default function DocumentOpenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full overflow-hidden">
      {children}
      <EimzoSignHost />
    </div>
  );
}
