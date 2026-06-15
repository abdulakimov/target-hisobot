import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ReportResponse } from '@hisobotchi/shared';
import { ReportEditor } from '@/components/reports/ReportEditor';

interface ReportEditorContextValue {
  /** Open the editor: no arg = create, a report = edit. */
  openEditor: (report?: ReportResponse) => void;
}

const ReportEditorContext = createContext<ReportEditorContextValue | null>(null);

export function useReportEditor(): ReportEditorContextValue {
  const ctx = useContext(ReportEditorContext);
  if (!ctx) throw new Error('useReportEditor must be used within ReportEditorProvider');
  return ctx;
}

export function ReportEditorProvider({ children }: { children: ReactNode }) {
  // undefined = closed; null = creating; ReportResponse = editing.
  const [editing, setEditing] = useState<ReportResponse | null | undefined>(undefined);

  return (
    <ReportEditorContext.Provider value={{ openEditor: (report) => setEditing(report ?? null) }}>
      {children}
      {editing !== undefined && (
        <ReportEditor report={editing} onClose={() => setEditing(undefined)} />
      )}
    </ReportEditorContext.Provider>
  );
}
