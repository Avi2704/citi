import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';

export const CitizenReportPage = () => {
  const { token } = useAuth();
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('Garbage issue');
  const [category, setCategory] = useState('mixed_waste');
  const [image, setImage] = useState<File | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
      },
      () => {
        setMessage('Unable to fetch location. Please enter it manually.');
      },
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !image) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('address', address);
    formData.append('image', image);

    setMessage('Analyzing image...');
    try {
      await apiRequest('/reports', {
        method: 'POST',
        body: formData,
        token,
      });
      setMessage('Report submitted successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Report submission failed');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Report Waste</h2>
      <form className="space-y-3 rounded border bg-white p-4" onSubmit={handleSubmit}>
        <input className="w-full rounded border p-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea className="w-full rounded border p-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue" rows={4} />
        <input className="w-full rounded border p-2" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
        <input className="w-full rounded border p-2" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" />
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="w-full rounded border p-2" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" />
          <input className="w-full rounded border p-2" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" />
        </div>
        <button className="rounded border px-3 py-2" type="button" onClick={useCurrentLocation}>Use my current location</button>
        <input className="w-full rounded border p-2" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        <button className="rounded bg-emerald-700 px-3 py-2 text-white" type="submit">Submit report</button>
      </form>
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </div>
  );
};
