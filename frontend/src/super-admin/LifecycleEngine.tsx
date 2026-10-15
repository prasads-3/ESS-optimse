import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function LifecycleEngine() {
  const { orgs, setModalOpen }: any = useOutletContext();
  const EVENTS: any[] = [];
  const actionItems: any[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  (orgs || []).forEach((org: any) => {
    if (org.createdAt) {
      EVENTS.push({
        color: 'bg-slate-300',
        title: `${org.name} - Lifecycle Began`,
        desc: `Organization structure initialized.`,
        date: new Date(org.createdAt).toLocaleDateString(),
        timestamp: new Date(org.createdAt).getTime(),
      });
    }

    if (!org.endDate) return;

    const endDate = new Date(org.endDate);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30 && diffDays > 0) {
      EVENTS.push({
        color: 'bg-amber-500',
        title: `${org.name} - Expiring Soon`,
        desc: `Subscription expires in ${diffDays} days.`,
        date: endDate.toLocaleDateString(),
        timestamp: endDate.getTime(),
        org
      });
      actionItems.push({ org, diffDays, expired: false, endDate });
    } else if (diffDays <= 0) {
      EVENTS.push({
        color: 'bg-rose-500',
        title: `${org.name} - Expired`,
        desc: `Subscription expired ${Math.abs(diffDays)} days ago.`,
        date: endDate.toLocaleDateString(),
        timestamp: endDate.getTime(),
        org
      });
      actionItems.push({ org, diffDays, expired: true, endDate });
    } else {
      EVENTS.push({
        color: 'bg-emerald-500',
        title: `${org.name} - Active Renewal Set`,
        desc: `Valid for ${diffDays} more days.`,
        date: endDate.toLocaleDateString(),
        timestamp: endDate.getTime(),
        org
      });
    }
  });

  EVENTS.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Timeline */}
        <div className="bg-white rounded-[24px] border border-slate-200 p-10 flex flex-col h-full shadow-2xl">
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Subscription Lifecycle Events</h3>
            <p className="text-slate-500 text-[13px] mt-0.5 font-medium">Recent state transitions</p>
          </div>

          <div className="space-y-10 relative">
            <div className="absolute left-1.5 top-0 bottom-0 w-[1px] bg-slate-200 ml-[2px]" />
            {EVENTS.length === 0 ? (
              <div className="py-10 text-center text-slate-400">No events found</div>
            ) : EVENTS.map((ev, i) => (
              <div key={i} className="flex gap-6 relative group">
                <div className={`w-3 h-3 rounded-full mt-1.5 z-10 ring-4 ring-white ${ev.color} transition-all`} />
                <div>
                  <h4 className="text-[13px] font-bold text-slate-800">{ev.title}</h4>
                  <p className="text-[12px] text-slate-500 mt-1">{ev.desc}</p>
                  <p className="text-[11px] text-slate-600 font-bold mt-2 uppercase tracking-tight">{ev.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Action Center */}
        <div className="bg-white rounded-[24px] border border-slate-200 p-10 shadow-2xl h-full flex flex-col">
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Expiry Action Center</h3>
            <p className="text-slate-500 text-[13px] mt-0.5 font-medium">Subscriptions needing attention</p>
          </div>
          {actionItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex-1">
              <ShieldCheck className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-[13px] font-bold text-slate-500">No Action Required</p>
              <p className="text-[12px] text-slate-400 mt-1">All subscriptions are currently active and well within limits.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl bg-white shadow-sm">
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">{item.org.name}</h4>
                    <p className={`text-[12px] font-bold tracking-tight mt-0.5 ${item.expired ? 'text-rose-500' : 'text-amber-500'}`}>
                      {item.expired ? `Expired ${Math.abs(item.diffDays)} days ago` : `Expires in ${item.diffDays} days`}
                    </p>
                  </div>
                  <button
                    onClick={() => setModalOpen({ type: 'assignPlan', initialOrgId: item.org.id.toString(), plan: item.org.subscriptionPlan })}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-bold shadow-lg hover:bg-slate-800 transition-all"
                  >
                    Renew Plan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
