import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  Plus,
  Trash2,
  Users,
  Smile,
  X,
  CreditCard,
  UserCheck
} from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Form states (Add student)
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('Computer Science');
  const [yearOfStudy, setYearOfStudy] = useState(1);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students/');
      setStudents(res.data);
    } catch (err) {
      setError('Failed to fetch students registration registers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api.post('/students/', {
        name,
        roll_number: rollNumber,
        email,
        phone,
        branch,
        year_of_study: parseInt(yearOfStudy)
      });
      setMsg('Student registered in central Gymkhana log successfully!');
      setShowModal(false);
      // Reset form
      setName('');
      setRollNumber('');
      setEmail('');
      setPhone('');
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Validation constraint conflict. Roll number or Email might exist.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete Student Profile? All associated active checkouts will be released.')) return;
    setError('');
    setMsg('');
    try {
      await api.delete(`/students/${id}`);
      setMsg('Student deregistered successfully.');
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Friction detected deleting record.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500 border-r-2 border-transparent"></div>
        <span className="ml-3 text-gray-400 font-medium text-sm">Loading RBU borrower directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-gray-300">
      <div className="flex justify-between items-center bg-[#161920] border border-gray-800 p-5 rounded-2xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" /> Students Registration Directory
          </h1>
          <p className="text-gray-400 text-xs mt-1">Manage official university credentials of scholars eligible for equipment hand-out log.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-800/80 rounded-lg text-white font-semibold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Enroll Student Profile
        </button>
      </div>

      {(error || msg) && (
        <div className="flex flex-col gap-2">
          {error && (
            <div className="bg-red-950/40 border border-red-800/45 text-red-400 text-sm px-4 py-2.5 rounded-xl">
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

      {/* Grid List Table */}
      <div className="bg-[#161920] border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F1115] border-b border-gray-800/70 text-xs text-gray-400 uppercase tracking-widest font-semibold">
                <th className="py-4 px-5">Student / ID</th>
                <th className="py-4 px-5">Academic program</th>
                <th className="py-4 px-5">Roll number ID</th>
                <th className="py-4 px-5">Secure communication</th>
                <th className="py-4 px-5 text-right">Interactive settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {students.length > 0 ? (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-[#1C1F28]/40 transition text-sm">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-950/40 border border-red-900/30 text-red-400 flex items-center justify-center font-bold text-xs uppercase">
                          {student.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{student.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">DB:{student.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-medium text-gray-300">
                      {student.branch} <span className="text-gray-500 text-xs font-normal">({student.year_of_study} year)</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 rounded-md bg-[#0F1115] text-xs font-semibold tracking-wider font-mono text-gray-400 border border-gray-800">
                        {student.roll_number}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-xs text-gray-400 space-y-0.5">
                      <div>📧 {student.email}</div>
                      <div>📞 {student.phone}</div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="p-1 px-3 bg-red-950/30 hover:bg-red-950/60 text-red-400 hover:text-red-300 rounded-lg border border-red-950/40 font-medium text-xs transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Deregister
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-500 text-xs">
                    No students currently listed in central sports program. Add student to manage allocations.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add student modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#161920] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#0F1115] border border-gray-800 rounded-lg text-gray-500 hover:text-gray-300 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 border-b border-gray-800/60">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-red-500" />
                Enroll Student Profile
              </h2>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Full Scholar Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sameer Dixit"
                  className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Roll Number (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RBU2024CS110"
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 uppercase text-sm font-mono"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Year of Study</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Official RBU Email</label>
                <input
                  type="email"
                  required
                  placeholder="name.roll@rbu.edu.in"
                  className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Mobile Phone</label>
                  <input
                    type="text"
                    required
                    maxLength="10"
                    placeholder="e.g. 9823456789"
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Academic Branch</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mechanical"
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 text-sm"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition"
                >
                  Terminate
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-800 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md transition"
                >
                  Record Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
