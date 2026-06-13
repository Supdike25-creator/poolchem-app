import MarketingShell from '@/components/marketing/MarketingShell';

export default function MarketingLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <MarketingShell>
      {children}
      {modal}
    </MarketingShell>
  );
}
