import type { CategoryCardsMessage } from "../types"

export function CategoryCards({ message }: { message: CategoryCardsMessage }) {
  return (
    <div className="w-full space-y-2">
      {message.cards.map((card, i) => (
        <a
          key={i}
          href={card.url}
          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 no-underline shadow-sm transition-all duration-150 hover:-translate-y-px hover:shadow-md"
        >
          <span className="text-xs font-semibold text-slate-900">
            {card.name}
          </span>
          {card.count > 0 && (
            <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-orange-600">
              {card.count} products
            </span>
          )}
        </a>
      ))}
    </div>
  )
}
