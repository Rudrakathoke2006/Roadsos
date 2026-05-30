import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  Activity,
  Dribbble,
  CalendarDays,
  AlertOctagon,
  Users,
  CheckCircle,
  FileSpreadsheet,
  ArrowRightLeft,
  Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard({ setActivePage }) {
  const [stats, setStats] = useState({
    totalEquipment: 0,
    activeLoans: 0,
    overdueLoans: 0,
    totalBookings: 0,
  });
  const [equipmentData, setEquipmentData] = useState([]);
  const [recentLoans, setRecentLoans] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category Colors
  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Parallel fetches for speed and reliability
      const [eqRes, issRes, bookRes] = await Promise.all([
        api.get('/equipment/'),
        api.get('/issuances/'),
        api.get('/bookings/')
      ]);

      const equipments = eqRes.data;
      const issuances = issRes.data;
      const bookings = bookRes.data;

      // Calculations
      const active = issuances.filter(i => i.status === 'ISSUED');
      
      // Calculate overdues
      const now = new Date();
      const overdue = issuances.filter(i => {
        return i.status === 'ISSUED' && new Date(i.return_due_at) < now;
      });

      setStats({
        totalEquipment: equipments.reduce((acc, curr) => acc + curr.total_quantity, 0),
        activeLoans: active.length,
        overdueLoans: overdue.length,
        totalBookings: bookings.length,
      });

      // Recalculate category distribution for Charts
      const catCount = {};
      equipments.forEach(eq => {
        catCount[eq.category] = (catCount[eq.category] || 0) + eq.total_quantity;
      });
      const chartFormat = Object.keys(catCount).map(cat => ({
        name: cat,
        value: catCount[cat]
      }));
      setEquipmentData(chartFormat);

      // Save top lists for preview
      setRecentLoans(issuances.slice(0, 5));
      setRecentBookings(bookings.slice(0, 5));
    } catch (err) {
      console.error("Dashboard error loading data states:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500 border-r-2 border-transparent"></div>
        <span className="ml-3 text-gray-400 font-medium text-sm">Synchronizing live dashboard telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans text-gray-200">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">University Gymkhana Operations</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time usage insights, inventory flow, and active reservations.</p>
        </div>
        <a
          href={`${import.meta.env.VITE_API_URL || 'http://localhost/api/v1'}/issuances/export`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-600 border border-green-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-md transition"
        >
          <FileSpreadsheet className="w-4 h-4" /> Export Excel Register
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-[#161920] border border-gray-800/80 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Equipment Items</span>
            <span className="text-3xl font-extrabold text-white mt-1.5 block">{stats.totalEquipment}</span>
          </div>
          <div className="p-3.5 bg-red-950/40 text-red-500 rounded-xl border border-red-900/30">
            <Dribbble className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161920] border border-gray-800/80 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Active Loans</span>
            <span className="text-3xl font-extrabold text-amber-500 mt-1.5 block">{stats.activeLoans}</span>
          </div>
          <div className="p-3.5 bg-amber-950/40 text-amber-500 rounded-xl border border-amber-900/30">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161920] border border-gray-800/80 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Overdue Debits</span>
            <span className="text-3xl font-extrabold text-red-500 mt-1.5 block">{stats.overdueLoans}</span>
          </div>
          <div className="p-3.5 bg-red-950/60 text-red-500 rounded-xl border border-red-500/30 animate-pulse">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161920] border border-gray-800/80 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Facility Bookings</span>
            <span className="text-3xl font-extrabold text-blue-400 mt-1.5 block">{stats.totalBookings}</span>
          </div>
          <div className="p-3.5 bg-blue-950/40 text-blue-500 rounded-xl border border-blue-900/30">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main visual diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category distribution Pie Chart */}
        <div className="bg-[#161920] border border-gray-800 p-6 rounded-2xl lg:col-span-1 shadow-lg">
          <h2 className="text-md font-bold text-white uppercase tracking-wider border-b border-gray-800/60 pb-3 mb-4">Stock Breakdown</h2>
          <div className="h-64 flex items-center justify-center">
            {equipmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={equipmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {equipmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#161920', border: '1px solid #1f2937', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-600 font-mono">No inventory data loaded.</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {equipmentData.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-gray-400 truncate uppercase tracking-tight">{val.name}: <strong className="text-white">{val.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Quantities in stock Bar Chart */}
        <div className="bg-[#161920] border border-gray-800 p-6 rounded-2xl lg:col-span-2 shadow-lg">
          <h2 className="text-md font-bold text-white uppercase tracking-wider border-b border-gray-800/60 pb-3 mb-1 pt-0">Quantity Allocation Details</h2>
          <div className="h-64 mt-4">
            {equipmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equipmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#161920', border: '1px solid #1f2937', color: '#fff' }} />
                  <Bar dataKey="value" fill="#800020" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-500 font-mono">No quantities to render.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recents list tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent active issuances */}
        <div className="bg-[#161920] border border-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Active / Overdue Loans
            </h2>
            <button
              onClick={() => setActivePage('loans')}
              className="text-xs text-red-500 hover:text-red-400 font-semibold uppercase tracking-wider"
            >
              Manage
            </button>
          </div>
          <div className="space-y-3.5 max-h-80 overflow-y-auto">
            {recentLoans.length > 0 ? (
              recentLoans.map((loan, index) => {
                const now = new Date();
                const overdue = loan.status === 'ISSUED' && new Date(loan.return_due_at) < now;
                return (
                  <div key={index} className="p-3 bg-[#0F1115] rounded-xl border border-gray-800/60 flex items-center justify-between text-xs transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm">{loan.student?.name || 'N/A'}</strong>
                        <span className="text-gray-500 font-mono">({loan.student?.roll_number})</span>
                      </div>
                      <div className="text-gray-400">
                        Borrowed: <strong className="text-gray-200">{loan.equipment?.name}</strong> (x{loan.quantity})
                      </div>
                    </div>
                    <div className="text-right">
                      {loan.status === 'RETURNED' ? (
                        <span className="px-2.5 py-1 rounded-full bg-green-950/50 text-green-400 border border-green-900/40 font-semibold">Returned</span>
                      ) : overdue ? (
                        <span className="px-2.5 py-1 rounded-full bg-red-950/60 text-red-400 border border-red-500/30 font-semibold animate-pulse">Overdue</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-950/50 text-amber-400 border border-amber-900/40 font-semibold">Borrowed</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-gray-500 text-xs">No recent checkout ledger records.</div>
            )}
          </div>
        </div>

        {/* Recent facility Bookings */}
        <div className="bg-[#161920] border border-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-400" /> Ground & Networks Approvals
            </h2>
            <button
              onClick={() => setActivePage('bookings')}
              className="text-xs text-red-500 hover:text-red-400 font-semibold uppercase tracking-wider"
            >
              Approvals
            </button>
          </div>
          <div className="space-y-3.5 max-h-80 overflow-y-auto">
            {recentBookings.length > 0 ? (
              recentBookings.map((book, index) => (
                <div key={index} className="p-3 bg-[#0F1115] rounded-xl border border-gray-800/60 flex items-center justify-between text-xs transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm">{book.facility_name}</strong>
                    </div>
                    <div className="text-gray-400">
                      Rented by: <strong className="text-gray-200">{book.student?.name}</strong> ({book.student?.branch})
                    </div>
                    <div className="text-gray-500 text-[10px] font-mono">
                      Time slot: {new Date(book.start_time).toLocaleDateString()} {new Date(book.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(book.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    {book.status === 'APPROVED' ? (
                      <span className="px-2.5 py-1 rounded-full bg-green-950/50 text-green-400 border border-green-900/40 font-semibold">Approved</span>
                    ) : book.status === 'CANCELLED' ? (
                      <span className="px-2.5 py-1 rounded-full bg-gray-950 text-gray-500 border border-gray-800 font-semibold">Cancelled</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-blue-950/40 text-blue-400 border border-blue-900/30 font-semibold">Requested</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-xs">No active facility reservations on system.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
