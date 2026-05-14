export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center px-6">
        <h1 className="text-4xl font-bold text-white mb-4">Account Pending</h1>
        <p className="text-lg text-slate-300">
          Your account is pending approval. Please contact your administrator to get access.
        </p>
      </div>
    </div>
  );
}
