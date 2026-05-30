import React, { useState } from "react";
import { Terminal, Database, Play, AlertOctagon, HelpCircle } from "lucide-react";

interface SqlTerminalProps {
  onRunQuery: (sql: string) => Promise<{ success: boolean; data?: any; error?: string }>;
}

export default function SqlTerminal({ onRunQuery }: SqlTerminalProps) {
  const [queryText, setQueryText] = useState("SELECT * FROM incidents ORDER BY reported_at DESC LIMIT 3;");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const demoQueries = [
    {
      label: "Show Incidents",
      sql: "SELECT id, incident_type, severity, status, latitude, longitude FROM incidents ORDER BY reported_at DESC;",
    },
    {
      label: "Find Level 1 Hospitals",
      sql: "SELECT name, trauma_level, icu_beds_available, phone_emergency FROM hospitals WHERE trauma_level = 'LEVEL_1';",
    },
    {
      label: "Show Available Responders",
      sql: "SELECT call_sign, driver_name, driver_phone, status FROM responders WHERE status = 'AVAILABLE';",
    },
    {
      label: "Check Outbound SMS Logs",
      sql: "SELECT recipient, recipient_name, status, message_body FROM notifications LIMIT 4;",
    },
  ];

  const handleExecute = async (sqlToRun: string) => {
    setExecuting(true);
    setErrorMsg(null);
    try {
      const res = await onRunQuery(sqlToRun);
      if (res.success && res.data) {
        setResult({
          columns: res.data.columns || [],
          rows: res.data.rows || [],
        });
      } else {
        setErrorMsg(res.error || "Execution failed with non-descript error.");
        setResult(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Dynamic parse connection fault.");
      setResult(null);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="text-slate-200 font-bold">SQL CONSOLE (PostgreSQL PostGIS Engine)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block"></span>
        </div>
      </div>

      {/* Shortcuts pill area */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2.5 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1 mr-1">
          <Database className="w-3.5 h-3.5 text-slate-400" /> Quick Query:
        </span>
        {demoQueries.map((q, idx) => (
          <button
            key={idx}
            disabled={executing}
            onClick={() => {
              setQueryText(q.sql);
              handleExecute(q.sql);
            }}
            className="bg-slate-800 hover:bg-slate-700 active:bg-slate-950 text-slate-300 font-medium px-2.5 py-1 rounded text-[11px] border border-slate-700/50 transition-colors"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Editor & Command Execute Panel */}
      <div className="p-4 flex flex-col gap-3">
        <div className="relative">
          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            disabled={executing}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/50 focus:outline-none rounded-lg p-3 text-emerald-400 font-mono text-xs leading-relaxed resize-none shadow-inner"
            placeholder="SELECT * FROM tableName;"
          />
          <button
            disabled={executing}
            onClick={() => handleExecute(queryText)}
            className="absolute right-3.5 bottom-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold tracking-wide px-3.5 py-1.5 rounded-md shadow flex items-center gap-1.5 transition-all text-[11px] uppercase cursor-pointer disabled:opacity-50"
          >
            {executing ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Run SQL
          </button>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-lg flex items-start gap-2.5 text-red-300">
            <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Database Error:</span> {errorMsg}
            </div>
          </div>
        )}

        {/* SQL Output rows table */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden max-h-[170px] overflow-y-auto">
          {!result && !errorMsg && (
            <div className="py-8 px-4 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <HelpCircle className="w-6 h-6 text-slate-700" />
              <span>Type custom Postgres query or click a shortcut pill above to run diagnostic tests.</span>
            </div>
          )}

          {result && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800">
                    {result.columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="p-2 py-1.5 font-bold text-slate-400 uppercase text-[10px] tracking-wider border-r border-slate-800/50 last:border-0"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {result.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={result.columns.length || 1}
                        className="p-4 text-center text-slate-500 font-mono text-[11px]"
                      >
                        Dataset is empty (0 rows returned).
                      </td>
                    </tr>
                  ) : (
                    result.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-900/45 transition-colors">
                        {result.columns.map((col, colIdx) => {
                          const val = row[col];
                          let rendered = JSON.stringify(val);
                          if (val === null) {
                            rendered = "NULL";
                          } else if (typeof val === "string") {
                            rendered = val;
                          } else if (typeof val === "object") {
                            rendered = JSON.stringify(val);
                          } else if (typeof val === "number") {
                            rendered = String(val);
                          }
                          return (
                            <td
                              key={colIdx}
                              className="p-2 py-1 text-slate-300 font-mono text-[11px] truncate max-w-[150px] border-r border-slate-800/20 last:border-0"
                              title={rendered}
                            >
                              {rendered}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
