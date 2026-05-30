import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  Plus,
  QrCode,
  ArrowRightLeft,
  Calendar,
  X,
  User,
  Activity,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Dribbble,
  BookOpen
} from 'lucide-react';

export default function Issuances() {
  const [issuances, setIssuances] = useState([]);
  const [students, setStudents] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Form selections and triggers
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [returnDueAt, setReturnDueAt] = useState('');

  // QR modal and details
  const [activeQR, setActiveQR] = useState(null); // stores active issuance object with qr token

  const loadData = async () => {
    setLoading(true);
    try {
      const [issRes, studRes, eqRes] = await Promise.all([
        api.get('/issuances/'),
        api.get('/students/'),
        api.get('/equipment/')
      ]);
      setIssuances(issRes.data);
      setStudents(studRes.data);

      // Only show equipment that has some stock available
      setEquipments(eqRes.data);
    } catch (err) {
      setError('Failure during synchronization of active loan registers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openIssueModal = () => {
    setError('');
    setMsg('');
    setSelectedStudent(students[0]?.id || '');
    setSelectedEquipment(equipments.filter(e => e.available_quantity > 0)[0]?.id || '');
    setQuantity(1);
    
    // Set default due date: tomorrow at current time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Format to local ISO for datetime-local input
    const localISO = tomorrow.toISOString().slice(0, 16);
    setReturnDueAt(localISO);

    setShowIssueModal(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      const response = await api.post('/issuances/issue', {
        student_id: selectedStudent,
        equipment_id: selectedEquipment,
        quantity: parseInt(quantity),
        return_due_at: new Date(returnDueAt).toISOString()
      });

      setMsg('Material checked out & authorized! Signed QR token generated.');
      setShowIssueModal(false);
      loadData();
      
      // Auto display generated QR
      setActiveQR(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Loans operation locked. Verify requested quantity is within stock limits.');
    }
  };

  const handleReturn = async (id) => {
    setError('');
    setMsg('');
    try {
      await api.post(`/issuances/return/${id}`);
      setMsg('Sports asset checked in! Available inventory stock pools incremented.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operational glitch processing checkout return.');
    }
  };

  const showItemQR = (issuance) => {
    setActiveQR(issuance);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500 border-r-2 border-transparent"></div>
        <span className="ml-3 text-gray-400 font-medium text-sm">Validating checkout records ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-gray-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161920] border border-gray-800 p-5 rounded-2xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-red-500" /> Equipment Hand-Out Register
          </h1>
          <p className="text-gray-400 text-xs mt-1">Dispense university stock assets to registered scholars. Generate signed secure QR barcodes for mobile checkpoints.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700/60 rounded-lg text-gray-300 cursor-pointer transition"
            title="Refresh database"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openIssueModal}
            className="px-4 py-2.5 bg-red-700 hover:bg-red-600 border border-red-800/85 rounded-lg text-white font-semibold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record New Issuance
          </button>
        </div>
      </div>

      {(error || msg) && (
        <div className="flex flex-col gap-2">
          {error && (
            <div className="bg-red-950/40 border border-red-800/40 text-red-400 text-sm px-4 py-2.5 rounded-xl">
              ⚠️ {error}
            </div>
          )}
          {msg && (
            <div className="bg-green-950/40 border border-green-800/40 text-green-400 text-sm px-4 py-2.5 rounded-xl">
              ✅ {msg}
            </div>
          )}
        </div>
      )}

      {/* Main Ledger list table */}
      <div className="bg-[#161920] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F1115] border-b border-gray-800/75 text-xs text-gray-400 uppercase tracking-widest font-semibold">
                <th className="py-4 px-5">Scholar borrower</th>
                <th className="py-4 px-5">Material Description</th>
                <th className="py-4 px-5">Issued period</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-right">Verification & Return details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {issuances.length > 0 ? (
                issuances.map((item) => {
                  const now = new Date();
                  const overdue = item.status === 'ISSUED' && new Date(item.return_due_at) < now;
                  return (
                    <tr key={item.id} className="hover:bg-[#1C1F28]/40 transition text-sm">
                      <td className="py-4 px-5">
                        <div className="font-semibold text-white">{item.student?.name || 'Unknown Student'}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{item.student?.roll_number}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-medium text-gray-200">{item.equipment?.name || 'Decommissioned Equipment'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Quantity rented: <strong className="text-white">{item.quantity} units</strong></div>
                      </td>
                      <td className="py-4 px-5 text-xs font-mono text-gray-400 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          <span>Out: {new Date(item.issued_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${overdue ? "bg-red-500" : "bg-teal-500"}`}></span>
                          <span>Due: {new Date(item.return_due_at).toLocaleString()}</span>
                        </div>
                        {item.returned_at && (
                          <div className="flex items-center gap-1.5 text-green-400">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <span>In : {new Date(item.returned_at).toLocaleString()}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {item.status === 'RETURNED' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-green-950/40 text-green-400 border border-green-800/25 font-semibold text-xs inline-block">Returned</span>
                        ) : overdue ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-950/60 text-red-400 border border-red-500/30 font-semibold text-xs inline-block animate-pulse">Overdue</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-900/40 font-semibold text-xs inline-block">Outstanding</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex gap-2">
                          {item.status === 'ISSUED' ? (
                            <>
                              <button
                                onClick={() => showItemQR(item)}
                                className="p-1 px-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700/60 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1 transition cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" /> Token QR
                              </button>
                              <button
                                onClick={() => handleReturn(item.id)}
                                className="p-1 px-3 bg-red-950/30 hover:bg-red-950/50 text-red-400 hover:text-red-300 rounded-lg border border-red-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                              >
                                Check In
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-600 text-xs font-mono italic">Checked in & locked</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500 text-xs">
                    No active or past issuances registered. Click Record New to make checks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record check-out modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#161920] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowIssueModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#0F1115] border border-gray-800 rounded-lg text-gray-500 hover:text-gray-300 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-red-500" />
                Hand-out Sports Gear
              </h2>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Select Borrowing Scholar</label>
                <select
                  required
                  className="block w-full py-2.5 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <option value="" disabled>-- Connect Student Profile --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="text-[10px] text-amber-500">⚠️ No active student directory found. Please register student first.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Select Available Equipment</label>
                <select
                  required
                  className="block w-full py-2.5 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                >
                  <option value="" disabled>-- Connect Stock Gear --</option>
                  {equipments.map(e => (
                    <option key={e.id} value={e.id} disabled={e.available_quantity <= 0}>
                      {e.name} (Stock: {e.available_quantity}/{e.total_quantity} | Condition: {e.condition})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Checkout Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="block w-full py-2.5 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Return Deadline Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm font-sans"
                    value={returnDueAt}
                    onChange={(e) => setReturnDueAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={students.length === 0 || equipments.length === 0}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-800 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md transition disabled:opacity-40"
                >
                  Dispense Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Generation Verification display Modal */}
      {activeQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#161920] border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-5 relative">
            <button
              onClick={() => setActiveQR(null)}
              className="absolute top-4 right-4 p-1.5 bg-[#0F1115] border border-gray-800 rounded-lg text-gray-500 hover:text-gray-300 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-950/55 text-red-500 border border-red-900/30">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">University Security Checkpoint QR</h2>
              <p className="text-gray-400 text-xs mt-1">Expirable gatepass authorized by RBU Gymkhana.</p>
            </div>

            {/* Render dynamic secure QR */}
            <div className="bg-white p-3.5 rounded-2xl inline-block shadow-md">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=800020&data=${encodeURIComponent(activeQR.qr_token || '')}`}
                alt="Gymkhana Gates Pass Verification Code"
                className="w-44 h-44 cursor-crosshair rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-3 bg-[#0F1115] border border-gray-800 rounded-xl text-left text-xs space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span className="text-gray-500">Student:</span>
                <strong className="text-white">{activeQR.student?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Material:</span>
                <strong className="text-white">{activeQR.equipment?.name} (x{activeQR.quantity})</strong>
              </div>
              <div className="flex justify-between text-[10px] text-amber-500 font-mono mt-1 pt-1 border-t border-gray-800/80">
                <span>Pass expires in {import.meta.env.QR_TOKEN_EXPIRE_MINUTES || '30'} minutes. Scan at checkpoint to check-in back gear.</span>
              </div>
            </div>

            <button
              onClick={() => setActiveQR(null)}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-lg transition"
            >
              Close gate pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
