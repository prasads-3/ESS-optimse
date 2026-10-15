import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, ArrowUpRight, AlertCircle } from 'lucide-react';

export default function AuditLog() {
  const { activities }: any = useOutletContext();
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
      {/* Audit List Container */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl p-6">
        <div className="flex flex-col">
          {activities.length === 0 ? (
            <div className="py-20 text-center text-slate-500 font-medium">No activity logs found</div>
          ) : activities.map((log: any, i: number) => (
            <div
              key={i}
              className={`flex items-center justify-between py-5 px-6 border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-all group`}
            >
              <div className="flex items-center gap-5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.color}`}>
                  {log.type === 'plus' && <Plus size={16} strokeWidth={3} />}
                  {log.type === 'minus' && <div className="w-2.5 h-[3px] bg-rose-500 rounded-full" />}
                  {log.type === 'up' && <ArrowUpRight size={16} strokeWidth={3} />}
                  {log.type === 'alert' && <AlertCircle size={16} strokeWidth={3} />}
                </div>

                <div className="text-[13px] font-medium tracking-tight">
                  <span className="text-slate-800 font-bold">{log.actor}</span>
                  <span className="text-slate-500 mx-1.5">{log.action}</span>
                  <span className="text-slate-800 font-bold">{log.entity}</span>
                  {log.suffix && <span className="text-slate-500 mx-1.5">{log.suffix}</span>}
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-slate-600 transition-colors">
                {log.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
