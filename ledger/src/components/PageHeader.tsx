export function PageHeader({
  title,
  lede,
}: {
  title: string;
  lede?: React.ReactNode;
}) {
  return (
    <div className="mb-8 max-w-3xl">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      {lede ? <p className="mt-3 text-text-secondary">{lede}</p> : null}
    </div>
  );
}
