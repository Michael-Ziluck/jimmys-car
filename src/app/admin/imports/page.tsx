import { HistoricalImportCard } from "./historical-import-card";

export const maxDuration: number = 300;

export default function AdminImportsPage() {
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-950">
          Data imports
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Refresh site data from its external source workbooks.
        </p>
      </div>
      <div className="mt-6">
        <HistoricalImportCard />
      </div>
    </>
  );
}
