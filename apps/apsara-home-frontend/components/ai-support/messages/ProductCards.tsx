import type { ProductCardsMessage } from "../types"

function normalizePrice(price: string) {
  return price.replace(/(\d[\d,]*)\.00\b/g, "$1")
}

export function ProductCards({ message }: { message: ProductCardsMessage }) {
  return (
    <div className="w-full space-y-2">
      {message.cards.map((card, i) => (
        <a
          key={i}
          href={card.url}
          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-2.5 no-underline shadow-sm transition-all duration-150 hover:-translate-y-px hover:shadow-md"
        >
          {card.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image}
              alt={card.name}
              className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs leading-snug font-semibold text-slate-900">
              {card.name}
            </span>
            {card.description && (
              <span className="line-clamp-2 text-[11px] leading-snug text-slate-500">
                {card.description}
              </span>
            )}
            {card.price && (
              <span className="text-xs font-bold text-indigo-600">
                ₱{normalizePrice(card.price)}
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  )
}
