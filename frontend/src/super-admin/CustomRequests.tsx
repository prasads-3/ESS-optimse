import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { toast } from 'sonner';
import { Building2, MessageSquare, Clock, CheckCircle2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomRequests() {
   const [requests, setRequests] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   const fetchRequests = async () => {
      try {
         const res = await fetch(`${API_BASE_URL}/api/super-admin/custom-plans`, { credentials: 'include' });
         if (res.ok) {
            setRequests(await res.json());
         }
      } catch (e) {
         console.error(e);
         toast.error('Failed to fetch plan requests');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchRequests();
   }, []);

   const updateStatus = async (id: number, status: string) => {
      try {
         const res = await fetch(`${API_BASE_URL}/api/super-admin/custom-plans/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
            credentials: 'include'
         });
         if (res.ok) {
            toast.success(`Request marked as ${status}`);
            fetchRequests();
         } else {
            toast.error('Failed to update status');
         }
      } catch (e) {
         toast.error('Network error');
      }
   };

   if (loading) {
      return <div className="p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 m-auto"></div></div>;
   }

   return (
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Requests</h2>
               <p className="text-slate-500 font-medium text-[13px] mt-1">Review and manage custom plan inquiries from organizations.</p>
            </div>
         </div>

         <div className="grid gap-4">
            <AnimatePresence>
               {requests.map((req, i) => (
                  <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.05 }}
                     key={req.id}
                     className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-start justify-between"
                  >
                     <div className="space-y-3 flex-1 pr-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                              <Building2 size={20} className="text-indigo-600" />
                           </div>
                           <div>
                              <h3 className="font-bold text-slate-900 text-base leading-tight">
                                 {req.organization?.name || 'Unknown Organization'}
                              </h3>
                              <p className="text-[11px] font-semibold text-slate-400 mt-0.5 tracking-wide uppercase flex items-center gap-1.5">
                                 <Clock size={12} />
                                 {new Date(req.createdAt).toLocaleString()}
                              </p>
                           </div>
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ml-auto shrink-0 ${req.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                 req.status === 'Contacted' ? 'bg-blue-100 text-blue-700' :
                                    'bg-amber-100 text-amber-700'
                              }`}>
                              {req.status}
                           </span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-4">
                           <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Users Requested</span>
                              <span className="text-[13px] font-black text-slate-800">{req.users}</span>
                           </div>
                           <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Duration</span>
                              <span className="text-[13px] font-black text-slate-800 capitalize">{req.duration}</span>
                           </div>
                           <div className="col-span-2">
                              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Requested Features</span>
                              <span className="text-[12px] font-bold text-slate-700 leading-snug">{req.features || 'None specified'}</span>
                           </div>
                        </div>
                        {req.specialReq && (
                           <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                              <span className="text-[10px] uppercase font-bold text-amber-600 mb-1 flex items-center gap-1">
                                 <MessageSquare size={12} /> Special Requirements
                              </span>
                              <p className="text-[12px] font-semibold text-amber-900/80 leading-relaxed italic">{req.specialReq}</p>
                           </div>
                        )}
                     </div>

                     <div className="flex flex-col gap-2 shrink-0 border-l border-slate-100 pl-6 h-full justify-center">
                        <button
                           disabled={req.status === 'Pending'}
                           onClick={() => updateStatus(req.id, 'Pending')}
                           className={`w-full px-4 py-2 text-[11px] font-bold rounded-xl transition-colors border ${req.status === 'Pending' ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                           Mark Pending
                        </button>
                        <button
                           disabled={req.status === 'Contacted'}
                           onClick={() => updateStatus(req.id, 'Contacted')}
                           className={`w-full px-4 py-2 text-[11px] font-bold rounded-xl transition-colors border ${req.status === 'Contacted' ? 'bg-blue-50 text-blue-400 border-blue-100 cursor-not-allowed' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                        >
                           Mark Contacted
                        </button>
                        <button
                           disabled={req.status === 'Completed'}
                           onClick={() => updateStatus(req.id, 'Completed')}
                           className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold rounded-xl transition-all shadow-sm ${req.status === 'Completed' ? 'bg-emerald-500 text-white cursor-not-allowed shadow-emerald-500/20' : 'bg-white border text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                        >
                           <CheckCircle2 size={14} /> Resolve
                        </button>
                     </div>
                  </motion.div>
               ))}
            </AnimatePresence>
            {requests.length === 0 && (
               <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                     <Search className="text-slate-300" size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No requests found</h3>
                  <p className="text-[12px] text-slate-500 font-medium mt-1">There are no pending enterprise requests at the moment.</p>
               </div>
            )}
         </div>
      </div>
   )
}
