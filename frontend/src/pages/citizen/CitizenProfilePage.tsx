import { useAuth } from '../../hooks/useAuth';

export const CitizenProfilePage = () => {
  const { profile } = useAuth();
  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-xl font-semibold">Profile</h2>
      <p>Name: {profile?.full_name ?? 'N/A'}</p>
      <p>Email: {profile?.email}</p>
      <p>Role: {profile?.role}</p>
    </div>
  );
};
