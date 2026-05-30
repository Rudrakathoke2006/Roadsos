import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  CalendarRange,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  X,
  CreditCard,
  Building,
  Flag
} from 'lucide-react';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Form states (Add booking slot)
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [facilityName, setFacilityName] = useState('Cricket Nets (Inner Box)');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const FACILITIES = [
    'Cricket Nets (Inner Box)',
    'Synthetic Tennis Arena',
    'Main Basketball Court',
    'Badminton Synthetic court',
    'Indoor Gymnasium Hall',
    'Football Practice Field'
  ];

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const [bookRes, studRes] = await Promise.all([
        api.get('/bookings/'),
        api.get('/students/')
      ]);
      setBookings(bookRes.data);
      setStudents(studRes.data);
    } catch (err) {
      setError('Operational sync error fetching facility reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const openAddModal = () => {
    setError('');
    setMsg('');
    setSelectedStudent(students[0]?.id || '');
    setFacilityName('Cricket Nets (Inner Box)');
    
    // Set start time as now, end time as +1 hour
    const now = new Date();
    const stLocal = now.toISOString().slice(0, 16);
    now.setHours(now.getHours() + 1);
    const etLocal = now.toISOString().slice(0, 16);
    
    setStartTime(stLocal);
    setEndTime(etLocal);
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api.post('/bookings/', {
        student_id: selectedStudent,
        facility_name: facilityName,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString()
      });
      setMsg('Gymkhana facility slot blocked! Pending validation review.');
      setShowModal(false);
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operational glitch registering booking slot.');
    }
  };

  const handleApprove = async (id) => {
    setError('');
    setMsg('');
    try {
      await api.post(`/bookings/approve/${id}`);
      setMsg('Facility booking approved and signed off!');
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Glitches encountered checking slot authorizations.');
    }
  };

  const handleCancel = async (id) => {
    setError('');
    setMsg('');
    try {
      await api.post(`/bookings/cancel/${id}`);
      setMsg('Facility reservation cancelled and released.');
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error processing reservation cancellation.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500 border-r-2 border-transparent"></div>
        <span className="ml-3 text-gray-400 font-medium text-sm">Synchronizing booking slots calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-gray-300">
      <div className="flex justify-between items-center bg-[#161920] border border-gray-800 p-5 rounded-2xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-red-500" /> Facility Booking Register
          </h1>
          <p className="text-gray-400 text-xs mt-1">Regulate and authorize bookings for synthetic courts, cricket nets, or the football turf slots.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-800/80 rounded-lg text-white font-semibold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Block Facility Slot
        </button>
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

      {/* Bookings catalog matrix table */}
      <div className="bg-[#161920] border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F1115] border-b border-gray-800/70 text-xs text-gray-400 uppercase tracking-widest font-semibold">
                <th className="py-4 px-5">Reserved sports Arena</th>
                <th className="py-4 px-5">Borrower scholar</th>
                <th className="py-4 px-5">Time Slot coordinates</th>
                <th className="py-4 px-5 text-center">Authorization</th>
                <th className="py-4 px-5 text-right">Interactive settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {bookings.length > 0 ? (
                bookings.map((book) => (
                  <tr key={book.id} className="hover:bg-[#1C1F28]/40 transition text-sm">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <Building className="w-4 h-4 text-gray-500 shrink-0" />
                        <div>
                          <div className="font-bold text-white text-md">{book.facility_name}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{book.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-gray-200">{book.student?.name || 'Unknown Student'}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{book.student?.roll_number}</div>
                    </td>
                    <td className="py-4 px-5 text-xs text-gray-400 space-y-0.5 font-mono">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Clock className="w-3 h-3 text-red-500" />
                        <span>Start: {new Date(book.start_time).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Clock className="w-3 h-3 text-green-500" />
                        <span>End : {new Date(book.end_time).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        book.status === 'APPROVED' ? 'bg-green-950/40 text-green-400 border border-green-800/25' :
                        book.status === 'CANCELLED' ? 'bg-gray-800 text-gray-500 border border-gray-700/60' :
                        'bg-blue-950/40 text-blue-400 border border-blue-900/30 font-semibold'
                      }`}>
                        {book.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex gap-2">
                        {book.status === 'BOOKED' && (
                          <button
                            onClick={() => handleApprove(book.id)}
                            className="p-1 px-3 bg-green-950/40 hover:bg-green-950/60 text-green-400 hover:text-green-300 rounded-lg border border-green-900/40 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {book.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel(book.id)}
                            className="p-1 px-3 bg-red-950/30 hover:bg-red-950/50 text-red-400 hover:text-red-300 rounded-lg border border-red-950 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                          >
                            Release / Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500 text-xs">
                    No facility bookings have been logged yet. Click Block Facility Slot to claim space.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Slot reservations Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#161920] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#0F1115] border border-gray-800 rounded-lg text-gray-500 hover:text-gray-300 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 border-b border-gray-800/60">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-red-500" />
                Reserve Gymkhana Slot
              </h2>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Select Scholar Applicant</label>
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
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Gymkhana Facility Area</label>
                <select
                  required
                  className="block w-full py-2.5 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                >
                  {FACILITIES.map((f, i) => (
                    <option key={i} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Reservation Start Slot</label>
                  <input
                    type="datetime-local"
                    required
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm font-sans"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Reservation End Slot</label>
                  <input
                    type="datetime-local"
                    required
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm font-sans"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={students.length === 0}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-800 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md transition disabled:opacity-40"
                >
                  Claim Arena Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
