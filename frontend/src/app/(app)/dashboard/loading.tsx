export default function DashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        <div className="h-4 w-96 bg-slate-100 rounded-lg" />
      </div>

      <div className="h-48 bg-slate-200 rounded-2xl" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-72 bg-slate-100 rounded-2xl" />
        <div className="lg:col-span-5 h-72 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  );
}
