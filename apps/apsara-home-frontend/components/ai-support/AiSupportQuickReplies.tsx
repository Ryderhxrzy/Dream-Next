interface Props {
  items: string[]
  onSelect: (item: string) => void
}

export function AiSupportQuickReplies({ items, onSelect }: Props) {
  if (!items.length) return null
  return (
    <div className="flex max-h-24 flex-shrink-0 flex-wrap gap-1.5 overflow-y-auto border-t border-slate-100 bg-white px-3 py-2">
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(item)}
          className="cursor-pointer rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11.5px] font-semibold whitespace-nowrap text-indigo-600 transition-colors duration-150 hover:border-indigo-300 hover:bg-indigo-100"
        >
          {item}
        </button>
      ))}
    </div>
  )
}
