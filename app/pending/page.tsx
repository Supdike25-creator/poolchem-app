export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="mx-6 max-w-xl rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center shadow-sm">
        <h1 className="mb-4 text-4xl font-bold text-slate-950">Account Pending</h1>
        <p className="text-lg text-slate-600">
          Your account is pending approval. Please contact your administrator to get access.
        </p>
      </div>
    </div>
  );
}
