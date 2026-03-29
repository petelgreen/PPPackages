export default function StatusBadge({ status }) {
  const isPicked = status === 'picked'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        isPicked
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isPicked ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {isPicked ? 'Picked up' : 'Pending'}
    </span>
  )
}
