import type { ProductCardsMessage } from "../types"
import { AiSupportAvatar } from "../AiSupportAvatar"

export function ProductCards({ message }: { message: ProductCardsMessage }) {
  return (
    <div className="flex items-start gap-2">
      <AiSupportAvatar />
      <div className="grid max-w-[86%] grid-cols-1 gap-2">
        {message.cards.map((card) => (
          <article
            key={card.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex gap-3 p-2.5">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {card.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Product images can come from multiple backend/CDN hosts. */}
                    <img
                      src={card.image}
                      alt={card.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-slate-100" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-900">
                  {card.name}
                </h4>
                <p className="mt-1 text-[12px] font-semibold text-indigo-600">
                  {card.price}
                </p>
                {(card.brand || typeof card.stock === "number") && (
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    {[card.brand, typeof card.stock === "number" ? `${card.stock} in stock` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <a
                  href={card.url}
                  className="mt-2 inline-flex h-8 items-center rounded-lg bg-slate-900 px-3 text-[11px] font-bold text-white"
                >
                  View product
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
