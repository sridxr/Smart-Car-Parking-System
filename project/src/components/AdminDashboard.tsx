import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ParkingSlot, BookingWithDetails, Profile } from '../lib/supabase';
import { Car, MapPin, Plus, Pencil, Trash2, LogOut, Users, ParkingCircle, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([]);
  const [allBookings, setAllBookings] = useState<BookingWithDetails[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ParkingSlot | null>(null);

  const [formData, setFormData] = useState({
    slot_number: '',
    location: '',
    slot_type: 'regular' as 'regular' | 'compact' | 'handicapped' | 'electric',
    status: 'free' as 'free' | 'occupied' | 'reserved',
  });

  useEffect(() => {
    loadData();

    const slotsChannel = supabase
      .channel('admin-slots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, () => {
        loadParkingSlots();
      })
      .subscribe();

    const bookingsChannel = supabase
      .channel('admin-bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadAllBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadParkingSlots(), loadAllBookings(), loadAllUsers()]);
    setLoading(false);
  };

  const loadParkingSlots = async () => {
    const { data, error } = await supabase
      .from('parking_slots')
      .select('*')
      .order('slot_number');

    if (!error && data) {
      setParkingSlots(data);
    }
  };

  const loadAllBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_slots (*),
        profiles (*)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setAllBookings(data as BookingWithDetails[]);
    }
  };

  const loadAllUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (!error && data) {
      setAllUsers(data);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('parking_slots').insert([formData]);

      if (error) throw error;

      setShowAddModal(false);
      resetForm();
      await loadParkingSlots();
    } catch (error: any) {
      alert('Failed to add slot: ' + error.message);
    }
  };

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingSlot.id);

      if (error) throw error;

      setEditingSlot(null);
      resetForm();
      await loadParkingSlots();
    } catch (error: any) {
      alert('Failed to update slot: ' + error.message);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this parking slot?')) return;

    try {
      const { error } = await supabase.from('parking_slots').delete().eq('id', id);

      if (error) throw error;

      await loadParkingSlots();
    } catch (error: any) {
      alert('Failed to delete slot: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      slot_number: '',
      location: '',
      slot_type: 'regular',
      status: 'free',
    });
  };

  const openEditModal = (slot: ParkingSlot) => {
    setEditingSlot(slot);
    setFormData({
      slot_number: slot.slot_number,
      location: slot.location,
      slot_type: slot.slot_type,
      status: slot.status,
    });
  };

  const stats = {
    totalSlots: parkingSlots.length,
    freeSlots: parkingSlots.filter((s) => s.status === 'free').length,
    occupiedSlots: parkingSlots.filter((s) => s.status === 'occupied').length,
    totalUsers: allUsers.filter((u) => u.role === 'user').length,
    activeBookings: allBookings.filter((b) => b.status === 'active').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Smart Parking</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-blue-600 font-medium">Administrator</p>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Slots</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSlots}</p>
              </div>
              <ParkingCircle className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.freeSlots}</p>
              </div>
              <Activity className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Occupied</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.occupiedSlots}</p>
              </div>
              <Car className="w-10 h-10 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Bookings</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.activeBookings}</p>
              </div>
              <Activity className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <Users className="w-10 h-10 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Parking Slots Management</h2>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Add Slot
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parkingSlots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{slot.slot_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{slot.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {slot.slot_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            slot.status === 'free'
                              ? 'bg-green-100 text-green-800'
                              : slot.status === 'occupied'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {slot.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(slot)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Bookings</h2>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booked At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Released At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No bookings yet
                      </td>
                    </tr>
                  ) : (
                    allBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.profiles.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {booking.parking_slots.slot_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{booking.parking_slots.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(booking.booking_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {booking.release_time ? new Date(booking.release_time).toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {(showAddModal || editingSlot) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingSlot ? 'Edit Parking Slot' : 'Add New Parking Slot'}
            </h3>
            <form onSubmit={editingSlot ? handleUpdateSlot : handleAddSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Number</label>
                <input
                  type="text"
                  required
                  value={formData.slot_number}
                  onChange={(e) => setFormData({ ...formData, slot_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., A-101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Ground Floor - Section A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Type</label>
                <select
                  value={formData.slot_type}
                  onChange={(e) =>
                    setFormData({ ...formData, slot_type: e.target.value as typeof formData.slot_type })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="regular">Regular</option>
                  <option value="compact">Compact</option>
                  <option value="handicapped">Handicapped</option>
                  <option value="electric">Electric</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="free">Free</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSlot(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  {editingSlot ? 'Update' : 'Add'} Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
