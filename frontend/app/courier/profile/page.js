'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CourierProfile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicleNumber: '',
    vehicleType: 'Bike',
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'courier')) {
      router.replace('/login?next=/courier/profile');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'courier') {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/courier/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          vehicleNumber: data.vehicleNumber || '',
          vehicleType: data.vehicleType || 'Bike',
        });
      } else {
        toast.error('Failed to fetch profile');
      }
    } catch (err) {
      toast.error('Failed to fetch profile');
    } finally {
      setBusy(false);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch('/api/courier/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Profile updated successfully!');
        setProfile(data.courier);
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !user) return <div className="spinner" />;
  if (busy) return <div className="spinner" />;

  return (
    <div className="container page">
      <div className="section-header">
        <h1>My Profile</h1>
        <Link href="/courier" className="btn btn-secondary">Back to Dashboard</Link>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Courier Status</h3>
        <p><strong>Status:</strong> {profile?.courierStatus || 'Available'}</p>
        <p><strong>Role:</strong> {profile?.role}</p>
      </div>

      <div className="card">
        <h3>Edit Profile</h3>
        <form onSubmit={updateProfile} className="stack">
          <div className="field">
            <label>Name</label>
            <input
              className="input"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Phone</label>
            <input
              className="input"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Vehicle Number</label>
            <input
              className="input"
              type="text"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              placeholder="e.g., MH-12-AB-1234"
            />
          </div>
          <div className="field">
            <label>Vehicle Type</label>
            <select
              className="input"
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
            >
              <option value="Bike">Bike</option>
              <option value="Scooter">Scooter</option>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={updating}>
            {updating ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
