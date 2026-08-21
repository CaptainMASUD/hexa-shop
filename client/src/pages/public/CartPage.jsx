import { Link } from 'react-router-dom'

import { HugeiconsIcon } from '@hugeicons/react'

import {
  ArrowRight01Icon,
  Delete02Icon,
  GiftIcon,
  HexagonIcon,
  MinusSignIcon,
  PlusSignIcon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons'

import { useCart } from '../../contexts/CartContext'
import { useCurrency } from '../../contexts/CurrencyContext'

/* ========================================================================== */
/* Cart Page                                                                  */
/* ========================================================================== */

export default function CartPage() {
  const {
    items,
    subtotal,
    updateQuantity,
    removeItem,
  } = useCart()

  const { format } = useCurrency()

  /* ====================================================================== */
  /* Empty Cart                                                             */
  /* ====================================================================== */

  if (!items.length) {
    return (
      <main
        className="
          min-h-[calc(100vh-64px)]
          bg-[var(--hexa-bg)]
          text-[var(--hexa-text)]
        "
      >
        <div
          className="
            hexa-container

            py-10
            sm:py-12
            lg:py-16
          "
        >
          <section
            className="
              flex
              min-h-[390px]
              w-full
              items-center
              justify-center

              rounded-[22px]

              border
              border-[var(--hexa-border)]

              bg-[var(--hexa-card)]

              px-5
              py-12

              sm:min-h-[420px]
              sm:px-8

              lg:min-h-[430px]
              lg:rounded-[24px]
            "
          >
            <div
              className="
                mx-auto
                flex
                max-w-[620px]
                flex-col
                items-center

                text-center
              "
            >
              {/* ======================================================== */}
              {/* Shopping Bag Icon                                       */}
              {/* ======================================================== */}

              <div
                className="
                  flex
                  h-[74px]
                  w-[74px]
                  items-center
                  justify-center

                  rounded-[22px]

                  border
                  border-purple-500/15

                  bg-purple-500/[0.055]

                  text-purple-500

                  sm:h-[80px]
                  sm:w-[80px]
                "
              >
                <UIIcon
                  icon={ShoppingBag01Icon}
                  size={35}
                  strokeWidth={1.65}
                />
              </div>

              {/* ======================================================== */}
              {/* Heading                                                 */}
              {/* ======================================================== */}

              <h1
                className="
                  mt-6

                  text-[28px]
                  font-black
                  leading-tight
                  tracking-[-0.035em]

                  text-[var(--hexa-text)]

                  sm:text-[32px]
                  lg:text-[34px]
                "
              >
                Your cart is empty
              </h1>

              {/* ======================================================== */}
              {/* Description                                             */}
              {/* ======================================================== */}

              <p
                className="
                  mt-3

                  max-w-[520px]

                  text-[14px]
                  font-normal
                  leading-6

                  text-[var(--hexa-muted)]

                  sm:text-[15px]
                "
              >
                Browse HEXA and choose a product,
                plan or bundle.
              </p>

              {/* ======================================================== */}
              {/* CTA                                                     */}
              {/* ======================================================== */}

              <Link
                to="/products"
                className="
                  hexa-btn
                  group

                  mt-7

                  !inline-flex
                  !h-[52px]
                  !items-center
                  !justify-center
                  !gap-2.5
                  !rounded-[13px]
                  !px-6
                  !py-0

                  transform-gpu

                  text-[14px]
                  font-semibold

                  transition-transform
                  duration-150
                  ease-out

                  hover:scale-[1.015]
                  active:scale-[0.985]
                "
              >
                <UIIcon
                  icon={ShoppingBag01Icon}
                  size={18}
                  strokeWidth={1.8}
                />

                Browse products

                <UIIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.9}
                  className="
                    transition-transform
                    duration-150
                    ease-out

                    group-hover:translate-x-0.5
                  "
                />
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  /* ====================================================================== */
  /* Cart With Items                                                        */
  /* ====================================================================== */

  return (
    <main
      className="
        min-h-screen

        bg-[var(--hexa-bg)]
        text-[var(--hexa-text)]
      "
    >
      <div
        className="
          hexa-container

          py-9
          sm:py-11
        "
      >
        {/* ================================================================ */}
        {/* Header                                                           */}
        {/* ================================================================ */}

        <header>
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <span
              className="
                flex
                h-7
                w-7
                items-center
                justify-center

                rounded-lg

                bg-purple-500/[0.07]

                text-purple-500
              "
            >
              <UIIcon
                icon={ShoppingBag01Icon}
                size={15}
                strokeWidth={1.8}
              />
            </span>

            <p
              className="
                text-[11px]
                font-bold
                uppercase
                tracking-[0.12em]

                text-purple-500
              "
            >
              Your cart
            </p>
          </div>

          <div
            className="
              mt-2.5

              flex
              flex-wrap
              items-end
              justify-between
              gap-3
            "
          >
            <div>
              <h1
                className="
                  text-[30px]
                  font-black
                  leading-tight
                  tracking-[-0.035em]

                  text-[var(--hexa-text)]

                  sm:text-[34px]
                "
              >
                Review your order
              </h1>

              <p
                className="
                  mt-2

                  text-sm

                  text-[var(--hexa-muted)]
                "
              >
                {items.length}{' '}
                {items.length === 1
                  ? 'item'
                  : 'items'}{' '}
                in your cart
              </p>
            </div>

            <Link
              to="/products"
              className="
                group

                hidden
                items-center
                gap-1.5

                text-[12px]
                font-medium

                text-purple-500

                transition-colors
                duration-150

                hover:text-purple-400

                sm:inline-flex
              "
            >
              Continue shopping

              <UIIcon
                icon={ArrowRight01Icon}
                size={14}
                strokeWidth={1.8}
                className="
                  transition-transform
                  duration-150

                  group-hover:translate-x-0.5
                "
              />
            </Link>
          </div>
        </header>

        {/* ================================================================ */}
        {/* Main Layout                                                      */}
        {/* ================================================================ */}

        <div
          className="
            mt-7

            grid
            items-start
            gap-6

            lg:grid-cols-[minmax(0,1fr)_350px]
          "
        >
          {/* ============================================================== */}
          {/* Cart Items                                                     */}
          {/* ============================================================== */}

          <section
            className="
              min-w-0
              space-y-3
            "
          >
            {items.map((item) => {
              const isBundle =
                item.itemType === 'bundle'

              const href =
                isBundle
                  ? `/bundle/${item.slug}`
                  : `/product/${item.slug}`

              const lineTotal =
                Number(item.price || 0) *
                Number(item.quantity || 1)

              return (
                <article
                  key={item.key}
                  className="
                    group

                    rounded-[18px]

                    border
                    border-[var(--hexa-border)]

                    bg-[var(--hexa-card)]

                    p-3.5

                    transition-[border-color]
                    duration-150

                    hover:border-purple-500/25

                    sm:p-4
                  "
                >
                  <div
                    className="
                      grid
                      grid-cols-[82px_minmax(0,1fr)]
                      gap-3.5

                      sm:grid-cols-[104px_minmax(0,1fr)_auto]
                      sm:items-center
                      sm:gap-4
                    "
                  >
                    {/* ================================================== */}
                    {/* Image                                              */}
                    {/* ================================================== */}

                    <Link
                      to={href}
                      className="
                        block
                        overflow-hidden

                        rounded-[14px]

                        bg-[var(--hexa-bg-soft)]
                      "
                    >
                      <div
                        className="
                          aspect-square
                          overflow-hidden
                        "
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="
                              h-full
                              w-full

                              transform-gpu

                              object-cover

                              transition-transform
                              duration-300
                              ease-out

                              group-hover:scale-[1.025]
                            "
                          />
                        ) : (
                          <div
                            className="
                              flex
                              h-full
                              items-center
                              justify-center

                              text-purple-500/40
                            "
                          >
                            <UIIcon
                              icon={
                                isBundle
                                  ? GiftIcon
                                  : HexagonIcon
                              }
                              size={
                                isBundle
                                  ? 28
                                  : 31
                              }
                              strokeWidth={1.5}
                            />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* ================================================== */}
                    {/* Information                                        */}
                    {/* ================================================== */}

                    <div
                      className="
                        min-w-0
                      "
                    >
                      <div
                        className="
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >
                        <Link
                          to={href}
                          className="
                            min-w-0
                            truncate

                            text-[15px]
                            font-semibold
                            tracking-[-0.015em]

                            text-[var(--hexa-text)]

                            transition-colors
                            duration-150

                            hover:text-purple-500
                          "
                        >
                          {item.name}
                        </Link>

                        {isBundle && (
                          <span
                            className="
                              shrink-0

                              rounded-full

                              border
                              border-purple-500/15

                              bg-purple-500/[0.06]

                              px-2
                              py-0.5

                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.08em]

                              text-purple-500
                            "
                          >
                            Bundle
                          </span>
                        )}
                      </div>

                      {/* Product Type */}

                      <p
                        className="
                          mt-1

                          truncate

                          text-[12px]

                          text-[var(--hexa-muted)]
                        "
                      >
                        {isBundle
                          ? `${
                              item.components?.length ||
                              0
                            } included products`
                          : item.variantName ||
                            item.productType ||
                            'Digital product'}
                      </p>

                      {/* ================================================= */}
                      {/* Customer Inputs                                   */}
                      {/* ================================================= */}

                      {item.customerInputs &&
                        Object.keys(
                          item.customerInputs
                        ).length > 0 && (
                          <div
                            className="
                              mt-2

                              flex
                              flex-wrap
                              gap-1.5
                            "
                          >
                            {Object.entries(
                              item.customerInputs
                            )
                              .filter(
                                ([, value]) =>
                                  value
                              )
                              .map(
                                ([
                                  key,
                                  value,
                                ]) => (
                                  <span
                                    key={key}
                                    className="
                                      inline-flex
                                      max-w-full
                                      items-center
                                      gap-1

                                      rounded-lg

                                      border
                                      border-[var(--hexa-border)]

                                      bg-[var(--hexa-bg-soft)]

                                      px-2
                                      py-1

                                      text-[10px]

                                      text-[var(--hexa-muted)]
                                    "
                                  >
                                    <span
                                      className="
                                        capitalize
                                      "
                                    >
                                      {key.replace(
                                        /([A-Z])/g,
                                        ' $1'
                                      )}
                                      :
                                    </span>

                                    <strong
                                      className="
                                        max-w-[150px]
                                        truncate

                                        font-medium

                                        text-[var(--hexa-text)]
                                      "
                                    >
                                      {String(value)}
                                    </strong>
                                  </span>
                                )
                              )}
                          </div>
                        )}

                      {/* Unit Price */}

                      <div
                        className="
                          mt-2.5

                          flex
                          flex-wrap
                          items-baseline
                          gap-1.5
                        "
                      >
                        <span
                          className="
                            text-[15px]
                            font-bold

                            text-[var(--hexa-text)]
                          "
                        >
                          {format(item.price)}
                        </span>

                        <span
                          className="
                            text-[10px]

                            text-[var(--hexa-muted)]
                          "
                        >
                          each
                        </span>
                      </div>
                    </div>

                    {/* ================================================== */}
                    {/* Item Controls                                      */}
                    {/* ================================================== */}

                    <div
                      className="
                        col-span-2

                        flex
                        items-center
                        justify-between
                        gap-3

                        border-t
                        border-[var(--hexa-border)]

                        pt-3

                        sm:col-span-1
                        sm:flex-col
                        sm:items-end
                        sm:border-0
                        sm:pt-0
                      "
                    >
                      {/* Quantity */}

                      <QuantityStepper
                        quantity={item.quantity}
                        onDecrease={() =>
                          updateQuantity(
                            item.key,
                            Math.max(
                              1,
                              item.quantity - 1
                            )
                          )
                        }
                        onIncrease={() =>
                          updateQuantity(
                            item.key,
                            item.quantity + 1
                          )
                        }
                      />

                      <div
                        className="
                          flex
                          items-center
                          gap-2
                        "
                      >
                        {/* Desktop Line Total */}

                        <div
                          className="
                            hidden
                            text-right

                            sm:block
                          "
                        >
                          <p
                            className="
                              text-[10px]

                              text-[var(--hexa-muted)]
                            "
                          >
                            Total
                          </p>

                          <p
                            className="
                              mt-0.5

                              text-sm
                              font-bold

                              text-[var(--hexa-text)]
                            "
                          >
                            {format(
                              lineTotal
                            )}
                          </p>
                        </div>

                        {/* Delete */}

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              item.key
                            )
                          }
                          aria-label={`Remove ${item.name}`}
                          title="Remove item"
                          className="
                            flex
                            h-9
                            w-9
                            transform-gpu
                            items-center
                            justify-center

                            rounded-xl

                            text-[var(--hexa-muted)]

                            transition-[transform,background-color,color]
                            duration-150
                            ease-out

                            hover:scale-[1.03]
                            hover:bg-rose-500/[0.08]
                            hover:text-rose-500

                            active:scale-[0.94]
                          "
                        >
                          <UIIcon
                            icon={Delete02Icon}
                            size={17}
                            strokeWidth={1.8}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ==================================================== */}
                  {/* Mobile Line Total                                    */}
                  {/* ==================================================== */}

                  <div
                    className="
                      mt-3

                      flex
                      items-center
                      justify-between

                      border-t
                      border-[var(--hexa-border)]

                      pt-3

                      sm:hidden
                    "
                  >
                    <span
                      className="
                        text-[11px]

                        text-[var(--hexa-muted)]
                      "
                    >
                      Item total
                    </span>

                    <span
                      className="
                        text-sm
                        font-bold

                        text-[var(--hexa-text)]
                      "
                    >
                      {format(lineTotal)}
                    </span>
                  </div>
                </article>
              )
            })}
          </section>

          {/* ============================================================== */}
          {/* Order Summary                                                  */}
          {/* ============================================================== */}

          <aside
            className="
              rounded-[18px]

              border
              border-[var(--hexa-border)]

              bg-[var(--hexa-card)]

              p-5

              lg:sticky
              lg:top-24
            "
          >
            {/* ============================================================ */}
            {/* Summary Header                                               */}
            {/* ============================================================ */}

            <div
              className="
                flex
                items-center
                gap-2.5
              "
            >
              <span
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center

                  rounded-xl

                  bg-purple-500/[0.07]

                  text-purple-500
                "
              >
                <UIIcon
                  icon={ShoppingBag01Icon}
                  size={18}
                  strokeWidth={1.8}
                />
              </span>

              <div>
                <h2
                  className="
                    text-[15px]
                    font-semibold

                    text-[var(--hexa-text)]
                  "
                >
                  Order summary
                </h2>

                <p
                  className="
                    mt-0.5

                    text-[10px]

                    text-[var(--hexa-muted)]
                  "
                >
                  {items.length}{' '}
                  {items.length === 1
                    ? 'item'
                    : 'items'}
                </p>
              </div>
            </div>

            {/* ============================================================ */}
            {/* Summary Rows                                                 */}
            {/* ============================================================ */}

            <div
              className="
                mt-5
                space-y-3
              "
            >
              <SummaryRow
                label="Subtotal"
                value={format(subtotal)}
              />

              <SummaryRow
                label="Discounts"
                value="At checkout"
              />

              <div
                className="
                  border-t
                  border-[var(--hexa-border)]

                  pt-4
                "
              >
                <div
                  className="
                    flex
                    items-end
                    justify-between
                    gap-3
                  "
                >
                  <span
                    className="
                      text-sm
                      font-semibold

                      text-[var(--hexa-text)]
                    "
                  >
                    Estimated total
                  </span>

                  <span
                    className="
                      text-[22px]
                      font-black
                      tracking-[-0.03em]

                      text-[var(--hexa-text)]
                    "
                  >
                    {format(subtotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* Checkout                                                     */}
            {/* ============================================================ */}

            <Link
              to="/checkout"
              className="
                hexa-btn
                group

                mt-5

                !flex
                !h-11
                !w-full
                !items-center
                !justify-center
                !gap-2
                !rounded-xl
                !py-0

                transform-gpu

                text-sm
                font-semibold

                transition-transform
                duration-150
                ease-out

                hover:scale-[1.01]
                active:scale-[0.985]
              "
            >
              <UIIcon
                icon={ShoppingBag01Icon}
                size={17}
                strokeWidth={1.8}
              />

              Proceed to checkout

              <UIIcon
                icon={ArrowRight01Icon}
                size={15}
                strokeWidth={1.9}
                className="
                  transition-transform
                  duration-150

                  group-hover:translate-x-0.5
                "
              />
            </Link>

            <Link
              to="/products"
              className="
                mt-2.5

                flex
                h-10
                w-full
                items-center
                justify-center
                gap-2

                rounded-xl

                text-[12px]
                font-medium

                text-[var(--hexa-muted)]

                transition-[background-color,color]
                duration-150

                hover:bg-purple-500/[0.05]
                hover:text-purple-500
              "
            >
              <UIIcon
                icon={ShoppingBag01Icon}
                size={15}
                strokeWidth={1.8}
              />

              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}

/* ========================================================================== */
/* Quantity Stepper                                                           */
/* ========================================================================== */

function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
}) {
  const canDecrease =
    Number(quantity) > 1

  return (
    <div
      className="
        flex
        h-9
        items-center

        overflow-hidden

        rounded-xl

        border
        border-[var(--hexa-border)]

        bg-[var(--hexa-bg-soft)]
      "
    >
      {/* Minus */}

      <button
        type="button"
        onClick={onDecrease}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
        className="
          flex
          h-full
          w-9
          transform-gpu
          items-center
          justify-center

          text-[var(--hexa-muted)]

          transition-[transform,background-color,color]
          duration-150

          hover:bg-purple-500/[0.07]
          hover:text-purple-500

          active:scale-[0.88]

          disabled:pointer-events-none
          disabled:opacity-30
        "
      >
        <UIIcon
          icon={MinusSignIcon}
          size={15}
          strokeWidth={2}
        />
      </button>

      {/* Quantity */}

      <span
        className="
          flex
          h-full
          min-w-[38px]
          items-center
          justify-center

          border-x
          border-[var(--hexa-border)]

          px-2

          text-[12px]
          font-semibold
          tabular-nums

          text-[var(--hexa-text)]
        "
      >
        {quantity}
      </span>

      {/* Plus */}

      <button
        type="button"
        onClick={onIncrease}
        aria-label="Increase quantity"
        className="
          flex
          h-full
          w-9
          transform-gpu
          items-center
          justify-center

          text-[var(--hexa-muted)]

          transition-[transform,background-color,color]
          duration-150

          hover:bg-purple-500/[0.07]
          hover:text-purple-500

          active:scale-[0.88]
        "
      >
        <UIIcon
          icon={PlusSignIcon}
          size={15}
          strokeWidth={2}
        />
      </button>
    </div>
  )
}

/* ========================================================================== */
/* Summary Row                                                                */
/* ========================================================================== */

function SummaryRow({
  label,
  value,
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4

        text-[12px]
      "
    >
      <span
        className="
          text-[var(--hexa-muted)]
        "
      >
        {label}
      </span>

      <span
        className="
          text-right
          font-medium

          text-[var(--hexa-text)]
        "
      >
        {value}
      </span>
    </div>
  )
}

/* ========================================================================== */
/* Hugeicons                                                                  */
/* ========================================================================== */

function UIIcon({
  icon,
  size = 18,
  strokeWidth = 1.7,
  className = '',
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color="currentColor"
      strokeWidth={strokeWidth}
      className={className}
    />
  )
}