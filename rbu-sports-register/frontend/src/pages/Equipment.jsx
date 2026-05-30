import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  Plus,
  Trash2,
  Edit,
  Sliders,
  X,
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle,
  Wrench,
  Dribbble
} from 'lucide-react';

export default function Equipment() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  
  // Modal configurations
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('OUTDOOR');
  const [totalQuantity, setTotalQuantity] = useState(5);
  const [condition, setCondition] = useState('GOOD');

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await api.get('/equipment/');
      setItems(response.data);
    } catch (err) {
      setError('Failed to fetch sports inventory database metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setName('');
    setCategory('OUTDOOR');
    setTotalQuantity(5);
    setCondition('GOOD');
    setError('');
    setMsg('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setIsEditMode(true);
    setSelectedId(item.id);
    setName(item.name);
    setCategory(item.category);
    setTotalQuantity(item.total_quantity);
    setCondition(item.condition);
    setError('');
    setMsg('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      if (isEditMode) {
        await api.put(`/equipment/${selectedId}`, {
          name,
          category,
          total_quantity: parseInt(totalQuantity),
          condition
        });
        setMsg('Equipment records modernized successfully!');
      } else {
        await api.post('/equipment/', {
          name,
          category,
          total_quantity: parseInt(totalQuantity),
          condition
        });
        setMsg('New sports unit stocked successfully!');
      }
      setShowModal(false);
      fetchEquipment();
    } catch (err) {
      setError(err.response?.data?.detail || 'Execution error during persistence setup.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are physical entities verified & decommissioned? Click OK to remove logs.')) return;
    setError('');
    setMsg('');
    try {
      await api.delete(`/equipment/${id}`);
      setMsg('Sports entity deprovisioned and database records dropped.');
      fetchEquipment();
    } catch (err) {
      setError(err.response?.data?.detail || 'Active transaction constraint prevents erasure.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500 border-r-2 border-transparent"></div>
        <span className="ml-3 text-gray-400 font-medium text-sm">Synchronizing physical items catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-gray-300">
      <div className="flex justify-between items-center bg-[#161920] border border-gray-800 p-5 rounded-2xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Dribbble className="w-5 h-5 text-red-500" /> Sports Inventory Manager
          </h1>
          <p className="text-gray-400 text-xs mt-1">Regulate total quantities, physical wear states, and check stock items pool levels.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-800/80 rounded-lg text-white font-semibold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Stock New Equipment
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

      {/* Database Catalog Grid layout */}
      <div className="bg-[#161920] border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F1115] border-b border-gray-800/70 text-xs text-gray-400 uppercase tracking-widest font-semibold">
                <th className="py-4 px-5">Equipment Details</th>
                <th className="py-4 px-5">Category type</th>
                <th className="py-4 px-5 text-center">Total Quantities</th>
                <th className="py-4 px-5 text-center">Available Stock</th>
                <th className="py-4 px-5 text-center">Equipment Wear</th>
                <th className="py-4 px-5 text-right">Interactive settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1C1F28]/40 transition text-sm">
                    <td className="py-4 px-5">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{item.id}</div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 rounded-md bg-[#0F1115] text-xs font-semibold tracking-wider font-mono text-gray-400 border border-gray-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center font-bold text-gray-300">
                      {item.total_quantity}
                    </td>
                    <td className="py-4 px-5 text-center">
                      {item.available_quantity === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-950/30 text-red-500 border border-red-900/15 font-semibold text-xs animate-pulse">Out of stock</span>
                      ) : (
                        <span className="font-semibold text-green-400">{item.available_quantity} available</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        item.condition === 'EXCELLENT' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                        item.condition === 'GOOD' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' :
                        item.condition === 'WEAK' ? 'bg-amber-950/40 text-amber-500 border border-amber-900/30' :
                        'bg-red-950/50 text-red-400 border border-red-900/40'
                      }`}>
                        {item.condition}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 px-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700/60 text-xs font-medium transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 inline mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 px-2.5 bg-red-950/30 hover:bg-red-950/60 text-red-400 hover:text-red-300 rounded-lg border border-red-950 font-medium text-xs transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" /> Decom
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-gray-500 text-xs">
                    Our gymkhana catalogs are completely clean. Seed or stock items to operate loan registers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Config Add/Edit Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161920] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#0F1115] border border-gray-800 rounded-lg text-gray-500 hover:text-gray-300 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-red-500" />
                {isEditMode ? 'Modify Stock Level Data' : 'Stock New Equipment Pool'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Equipment Entity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Football (Nivia Size 5)"
                  className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 font-sans text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
                  <select
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 font-sans text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="INDOOR">Indoor</option>
                    <option value="OUTDOOR">Outdoor</option>
                    <option value="ACCESSORY">Accessory</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Wear Condition</label>
                  <select
                    className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 font-sans text-sm"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="WEAK">Weak</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Absolute Total Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="block w-full py-2 px-3 bg-[#0F1115] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-red-500 font-sans text-sm"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value)}
                />
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
                  Commit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
