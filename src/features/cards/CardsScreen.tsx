import { CreditCard, Plus } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useUIStore } from '@/app/store'
import { Carousel } from '@/components/Carousel'
import { EmptyState } from '@/components/EmptyState'
import { ListGroup, ListRow } from '@/components/List'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { addPeriods, todayISO } from '@/core/dates'
import { availableLimit } from '@/core/limits'
import { purchaseProgress } from '@/core/purchases'
import { currentPeriod, summarizeStatement } from '@/core/statements'
import type { Card } from '@/core/types'
import { CreditCardFace } from './CreditCardFace'
import { PurchaseRow } from './PurchaseRow'
import { StatementRow } from './StatementRow'
import { useCardInstallments, useCardOverrides, useCardPayments, useCards, useCategories, usePurchasesForCard, useSettings } from './hooks'

export function CardsScreen() {
  const navigate = useNavigate()
  const cards = useCards()
  const activeCardId = useUIStore((s) => s.activeCardId)
  const setActiveCardId = useUIStore((s) => s.setActiveCardId)

  // Índice del carrusel a partir de la tarjeta activa (o la primera).
  const index = Math.max(0, cards?.findIndex((c) => c.id === activeCardId) ?? 0)
  const active: Card | undefined = cards?.[index]
  useEffect(() => {
    if (cards && cards.length > 0 && !cards.some((c) => c.id === activeCardId)) setActiveCardId(cards[0]!.id)
  }, [cards, activeCardId, setActiveCardId])

  const addButton = (
    <Pressable pressScale={0.9} aria-label="Agregar tarjeta" onClick={() => navigate('/tarjetas/nueva')} className="flex items-center justify-center text-tint">
      <Plus size={26} />
    </Pressable>
  )

  if (!cards) return <Screen title="Tarjetas" right={addButton}>{null}</Screen>

  if (cards.length === 0) {
    return (
      <Screen title="Tarjetas" right={addButton}>
        <EmptyState
          icon={<CreditCard size={56} strokeWidth={1.5} />}
          title="Agregá tu primera tarjeta"
          description="Solo guardamos los últimos 4 dígitos, nunca el número completo ni el código de seguridad."
          action={<Button onClick={() => navigate('/tarjetas/nueva')}>Agregar tarjeta</Button>}
        />
      </Screen>
    )
  }

  return (
    <Screen title="Tarjetas" right={addButton}>
      <div className="pt-1">
        <Carousel index={index} onIndexChange={(i) => setActiveCardId(cards[i]?.id ?? null)}>
          {cards.map((card) => (
            <CardSlide key={card.id} card={card} onEdit={() => navigate(`/tarjetas/${card.id}/editar`)} />
          ))}
        </Carousel>
      </div>
      {active && <CardDetails key={active.id} card={active} />}
    </Screen>
  )
}

function CardSlide({ card, onEdit }: { card: Card; onEdit: () => void }) {
  const installments = useCardInstallments(card.id)
  const settings = useSettings()
  const limit = useMemo(() => {
    if (!installments) return undefined
    let pendingARS = 0
    let pendingUSD = 0
    for (const i of installments) {
      if (i.status !== 'pending') continue
      if (i.currency === 'USD') pendingUSD += i.amount
      else pendingARS += i.amount
    }
    return availableLimit({ limit: card.limit, pendingARS, pendingUSD, ...(settings?.usdRate ? { usdRate: settings.usdRate } : {}) })
  }, [installments, card.limit, settings?.usdRate])
  return <CreditCardFace card={card} {...(limit ? { limit } : {})} privateMode={settings?.privateMode ?? false} onEdit={onEdit} />
}

function CardDetails({ card }: { card: Card }) {
  const navigate = useNavigate()
  const installments = useCardInstallments(card.id)
  const payments = useCardPayments(card.id)
  const overrides = useCardOverrides(card.id)
  const purchases = usePurchasesForCard(card.id)
  const categories = useCategories('expense')
  const settings = useSettings()
  const privateMode = settings?.privateMode ?? false
  const today = todayISO()

  const statements = useMemo(() => {
    if (!installments || !payments) return []
    const current = currentPeriod(card, today, overrides)
    const base = { card, installments, payments, today, overrides, ...(settings?.usdRate ? { usdRate: settings.usdRate } : {}) }
    const previous = summarizeStatement({ ...base, period: addPeriods(current, -1) })
    const rows = [
      { label: 'Actual', summary: summarizeStatement({ ...base, period: current }) },
      { label: 'Próximo', summary: summarizeStatement({ ...base, period: addPeriods(current, 1) }) },
    ]
    if (previous.count > 0) rows.unshift({ label: 'Último cerrado', summary: previous })
    return rows
  }, [card, installments, payments, overrides, settings?.usdRate, today])

  const byPurchase = useMemo(() => {
    const map = new Map<string, typeof installments>()
    for (const i of installments ?? []) {
      const list = map.get(i.purchaseId) ?? []
      list.push(i)
      map.set(i.purchaseId, list)
    }
    return map
  }, [installments])
  const categoryById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])

  return (
    <>
      <ListGroup title="Resúmenes">
        {statements.map(({ label, summary }) => (
          <StatementRow key={summary.period} label={label} summary={summary} privateMode={privateMode} onPress={() => navigate(`/tarjetas/${card.id}/resumenes/${summary.period}`)} />
        ))}
        <ListRow label="Todos los resúmenes y compromisos futuros" chevron onPress={() => navigate(`/tarjetas/${card.id}/resumenes`)} last />
      </ListGroup>

      <ListGroup title={`Compras${purchases && purchases.length ? ` (${purchases.length})` : ''}`}>
        <ListRow icon={<Plus size={22} className="text-tint" />} label="Nueva compra" chevron onPress={() => navigate(`/tarjetas/${card.id}/compras/nueva`)} last={!purchases?.length} />
        {purchases?.map((p, i) => (
          <PurchaseRow
            key={p.id}
            purchase={p}
            progress={purchaseProgress(byPurchase.get(p.id) ?? [])}
            {...(categoryById.get(p.categoryId) ? { category: categoryById.get(p.categoryId)! } : {})}
            privateMode={privateMode}
            onPress={() => navigate(`/compras/${p.id}`)}
            last={i === purchases.length - 1}
          />
        ))}
      </ListGroup>
    </>
  )
}
