import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ParkingSlot, BookingWithDetails } from '../lib/supabase';
import { Car, MapPin, Clock, CheckCircle, XCircle, LogOut, Calendar } from 'lucide-react';

export default function UserDashboard() {
  const { profile, signOut } = useAuth();
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([]);
  const [myBookings, setMyBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadData();

    const slotsChannel = supabase
      .channel('parking-slots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, () => {
        loadParkingSlots();
      })
      .subscribe();

    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadMyBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadParkingSlots(), loadMyBookings()]);
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

  const loadMyBookings = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_slots (*),
        profiles (*)
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyBookings(data as BookingWithDetails[]);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    if (!profile) return;

    setBooking(true);
    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: profile.id,
          slot_id: slotId,
          status: 'active',
        });

      if (bookingError) throw bookingError;

      const { error: updateError } = await supabase
        .from('parking_slots')
        .update({ status: 'occupied', updated_at: new Date().toISOString() })
        .eq('id', slotId);

      if (updateError) throw updateError;

      await loadData();
    } catch (error: any) {
      alert('Failed to book slot: ' + error.message);
    } finally {
      setBooking(false);
    }
  };

  const handleReleaseSlot = async (bookingId: string, slotId: string) => {
    setBooking(true);
    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          release_time: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      const { error: updateError } = await supabase
        .from('parking_slots')
        .update({ status: 'free', updated_at: new Date().toISOString() })
        .eq('id', slotId);

      if (updateError) throw updateError;

      await loadData();
    } catch (error: any) {
      alert('Failed to release slot: ' + error.message);
    } finally {
      setBooking(false);
    }
  };

  const getSlotTypeColor = (type: string) => {
    switch (type) {
      case 'handicapped':
        return 'bg-blue-100 text-blue-800';
      case 'electric':
        return 'bg-green-100 text-green-800';
      case 'compact':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeBooking = myBookings.find((b) => b.status === 'active');

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
                <p className="text-xs text-gray-500">User Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
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
        {activeBooking && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Active Booking
                </h3>
                <div className="space-y-2 text-sm text-green-800">
                  <p className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span className="font-medium">{activeBooking.parking_slots.slot_number}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {activeBooking.parking_slots.location}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Booked: {new Date(activeBooking.booking_time).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleReleaseSlot(activeBooking.id, activeBooking.slot_id)}
                disabled={booking}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                Release Slot
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Parking Slots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingSlots.map((slot) => (
              <div
                key={slot.id}
                className={`bg-white rounded-xl shadow-sm border-2 p-6 transition ${
                  slot.status === 'free' ? 'border-green-200 hover:shadow-md' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{slot.slot_number}</h3>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {slot.location}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      slot.status === 'free'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {slot.status === 'free' ? 'Available' : 'Occupied'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSlotTypeColor(slot.slot_type)}`}>
                    {slot.slot_type.charAt(0).toUpperCase() + slot.slot_type.slice(1)}
                  </span>
                </div>

                {slot.status === 'free' && !activeBooking && (
                  <button
                    onClick={() => handleBookSlot(slot.id)}
                    disabled={booking}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {booking ? 'Booking...' : 'Book Now'}
                  </button>
                )}

                {slot.status === 'free' && activeBooking && (
                  <button disabled className="w-full bg-gray-300 text-gray-500 font-medium py-2 rounded-lg cursor-not-allowed">
                    Release current slot first
                  </button>
                )}

                {slot.status !== 'free' && (
                  <div className="flex items-center justify-center gap-2 text-red-600 font-medium py-2">
                    <XCircle className="w-5 h-5" />
                    Not Available
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-7 h-7" />
            Booking History
          </h2>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booked At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Released At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {myBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No bookings yet
                      </td>
                    </tr>
                  ) : (
                    myBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {booking.parking_slots.slot_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {booking.parking_slots.location}
                        </td>
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
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
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
    </div>
  );
}
