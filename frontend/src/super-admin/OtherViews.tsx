import React from 'react';
import { Layers, Activity, Building2, RefreshCcw, Users } from 'lucide-react';

export function CloudInfrastructure() {
  return (
    <div className="py-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-700">
        {[
          { title: 'S3 Storage', usage: '4.2 TB', status: 'Optimal', icon: Layers, color: 'text-blue-500' },
          { title: 'EC2 Clusters', usage: '12 Active', status: 'Healthy', icon: Activity, color: 'text-emerald-500' },
          { title: 'Global CDN', usage: '840 GB/s', status: 'Stable', icon: Building2, color: 'text-purple-500' },
          { title: 'Lambda Tasks', usage: '1.2M req', status: 'Active', icon: RefreshCcw, color: 'text-amber-500' }
        ].map((asset, i) => (
          <div key={i} className="bg-slate-50/50 border border-slate-200 p-8 rounded-3xl hover:border-slate-700 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl bg-white/[0.03] ${asset.color}`}>
                <asset.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{asset.status}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{asset.title}</h3>
            <p className="text-2xl font-black text-slate-700 tracking-tighter">{asset.usage}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DatabasePerformance() {
  return (
    <div className="py-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-10 animate-in zoom-in-95 duration-500">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity size={120} className="text-emerald-500" />
          </div>
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)]">
            <Activity size={40} className="text-emerald-500 shadow-xl" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Database Performance</h2>
          <p className="text-slate-500 text-[14px] font-medium mt-4 max-w-md">Currently aggregating query metrics and lock wait times. Real-time visualization will be available shortly.</p>
          <div className="mt-10 flex gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-1.5 w-8 bg-slate-800 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SystemDocumentation() {
  return (
    <div className="py-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl animate-in fade-in duration-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">API Reference</h3>
            <p className="text-slate-500 text-sm">Full developer guide for SuperAdmin REST endpoints.</p>
          </div>
          <div className="bg-white border border-slate-200 p-8 rounded-3xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">System Manual</h3>
            <p className="text-slate-500 text-sm">Operational guidelines for platform maintenance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupportCenter() {
  return (
    <div className="py-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto border border-blue-500/20">
          <Users size={40} className="text-blue-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Support Management</h2>
        <p className="text-slate-500 text-[14px] max-w-md mx-auto">Connect directly with the global infrastructure team. Average response time: <span className="text-emerald-500 font-bold">14 mins</span>.</p>
        <button className="bg-blue-600 text-slate-900 font-bold px-10 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">Open High-Priority Ticket</button>
      </div>
    </div>
  );
}
