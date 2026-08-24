import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
 ArrowDown01Icon,
 ArrowRight01Icon,
 FlameIcon,
 FlashIcon,
 GiftIcon,
 HelpCircleIcon,
 HexagonIcon,
 PackageIcon,
 Shield01Icon,
 ShoppingBag01Icon,
 SparklesIcon,
 StarIcon,
 Tick02Icon,
} from '@hugeicons/core-free-icons'

import {
 getBanners,
 getCategories,
 getProducts,
} from '../../api/catalog.api'
import {
 getBundles,
 getPromotions,
 getPublicSettings,
 getRecommendations,
 getRecentlyViewed,
} from '../../api/features.api'

import ProductCard from '../../components/ProductCard'
import EmptyState from '../../components/EmptyState'
import fallbackHero from '../../images/mlbb.jpg'
import usePageMeta from '../../hooks/usePageMeta'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'

const EASE = [0.22, 1, 0.36, 1]

const reveal = {
 hidden: { opacity: 0, y: 12 },
 visible: {
  opacity: 1,
  y: 0,
  transition: {
   duration: 0.34,
   ease: EASE,
  },
 },
}

const stagger = {
 hidden: {},
 visible: {
  transition: {
   staggerChildren: 0.045,
  },
 },
}

export default function HomePage() {
 const { user } = useAuth()
 const { format } = useCurrency()
 const reduceMotion = useReducedMotion()

 const [categories, setCategories] = useState([])
 const [featured, setFeatured] = useState([])
 const [popular, setPopular] = useState([])
 const [banners, setBanners] = useState([])
 const [bundles, setBundles] = useState([])
 const [promotions, setPromotions] = useState([])
 const [recommended, setRecommended] = useState([])
 const [recent, setRecent] = useState([])
 const [settings, setSettings] = useState(null)
 const [activeBanner, setActiveBanner] = useState(0)
 const [loading, setLoading] = useState(true)

 usePageMeta(
  settings?.seo?.title ||
   'HEXA — Digital Products, Games & Subscriptions',
  settings?.seo?.description ||
   'Shop streaming subscriptions, games, software, AI tools and other digital products through HEXA.'
 )

 useEffect(() => {
  let mounted = true

  Promise.all([
   getCategories(),
   getProducts({ featured: 'true', limit: 8 }),
   getProducts({ popular: 'true', limit: 8, sort: 'popular' }),
   getBanners(),
   getBundles({ featured: 'true' }),
   getPromotions(),
   getPublicSettings(),
  ])
   .then(
    ([
     categoryResponse,
     featuredResponse,
     popularResponse,
     bannerResponse,
     bundleResponse,
     promotionResponse,
     publicSettings,
    ]) => {
     if (!mounted) return

     setCategories(categoryResponse || [])
     setFeatured(featuredResponse?.data || [])
     setPopular(popularResponse?.data || [])
     setBanners(bannerResponse || [])
     setBundles(bundleResponse || [])
     setPromotions(promotionResponse || [])
     setSettings(publicSettings || null)
    }
   )
   .catch(() => {})
   .finally(() => {
    if (mounted) setLoading(false)
   })

  return () => {
   mounted = false
  }
 }, [])

 useEffect(() => {
  if (!user) {
   setRecommended([])
   setRecent([])
   return undefined
  }

  let mounted = true

  Promise.all([getRecommendations(), getRecentlyViewed()])
   .then(([recommendationResponse, recentlyViewedResponse]) => {
    if (!mounted) return

    setRecommended(recommendationResponse || [])
    setRecent(
     (recentlyViewedResponse || [])
      .map((item) => item?.product)
      .filter(Boolean)
    )
   })
   .catch(() => {})

  return () => {
   mounted = false
  }
 }, [user])

 const heroBanners = useMemo(() => {
  const heroOnly = banners.filter((item) => item.placement === 'hero')
  return heroOnly.length ? heroOnly : banners.slice(0, 4)
 }, [banners])

 const adBanners = useMemo(
  () => banners.filter((item) => item.placement !== 'hero'),
  [banners]
 )

 const productBanners = useMemo(
  () => featured.filter((item) => item.bannerImage?.url).slice(0, 3),
  [featured]
 )

 const banner = heroBanners[activeBanner]

 useEffect(() => {
  if (activeBanner >= heroBanners.length) setActiveBanner(0)
 }, [activeBanner, heroBanners.length])

 useEffect(() => {
  if (reduceMotion || heroBanners.length < 2) return undefined

  const interval = setInterval(() => {
   setActiveBanner((current) => (current + 1) % heroBanners.length)
  }, 6000)

  return () => clearInterval(interval)
 }, [heroBanners.length, reduceMotion])

 return (
  <div className="min-h-screen overflow-hidden bg-[var(--hexa-bg)] text-[var(--hexa-text)] transition-colors duration-200">
   {settings?.homepage?.announcement && (
    <AnnouncementBar text={settings.homepage.announcement} />
   )}

   <HeroSection
    banner={banner}
    heroBanners={heroBanners}
    activeBanner={activeBanner}
    setActiveBanner={setActiveBanner}
    reduceMotion={reduceMotion}
   />

   {settings?.homepage?.showCategories !== false &&
    categories.length > 0 && (
     <CategorySection
      categories={categories}
      reduceMotion={reduceMotion}
     />
    )}

   {adBanners.length > 0 && (
    <CampaignSection
     banners={adBanners.slice(0, 2)}
     reduceMotion={reduceMotion}
    />
   )}

   {settings?.homepage?.showFeatured !== false && (
    <ProductSection
     loading={loading}
     products={featured}
     kicker="Featured picks"
     title="Featured products"
     link="/products?featured=true"
     reduceMotion={reduceMotion}
    />
   )}

   {productBanners.length > 0 && (
    <SpotlightSection
     products={productBanners}
     reduceMotion={reduceMotion}
    />
   )}

   {settings?.homepage?.showBundles !== false && bundles.length > 0 && (
    <BundleSection
     bundles={bundles.slice(0, 6)}
     format={format}
     reduceMotion={reduceMotion}
    />
   )}

   {settings?.homepage?.showPromotions !== false &&
    promotions.length > 0 && (
     <PromotionSection
      promotions={promotions.slice(0, 6)}
      reduceMotion={reduceMotion}
     />
    )}

   {recommended.length > 0 && (
    <ProductSection
     products={recommended.slice(0, 8)}
     kicker="For you"
     title="Recommended for you"
     reduceMotion={reduceMotion}
    />
   )}

   {settings?.homepage?.showPopular !== false && popular.length > 0 && (
    <ProductSection
     products={popular}
     kicker="Trending now"
     title="Popular right now"
     reduceMotion={reduceMotion}
    />
   )}

   {recent.length > 0 && (
    <ProductSection
     products={recent.slice(0, 4)}
     kicker="Continue browsing"
     title="Recently viewed"
     reduceMotion={reduceMotion}
    />
   )}

   {settings?.homepage?.showWhyHexa !== false && (
    <WhyHexaSection reduceMotion={reduceMotion} />
   )}

   {settings?.faq?.length > 0 && (
    <FaqSection
     faqs={settings.faq.slice(0, 6)}
     reduceMotion={reduceMotion}
    />
   )}
  </div>
 )
}

function AnnouncementBar({ text }) {
 return (
  <div className="border-b border-[var(--hexa-border)] bg-[var(--hexa-bg-soft)]">
   <div className="hexa-container flex min-h-8 items-center justify-center gap-2 py-1 text-center text-[11px] font-medium text-purple-500 sm:text-xs">
    <UIIcon icon={FlashIcon} size={14} strokeWidth={1.9} />
    <span>{text}</span>
   </div>
  </div>
 )
}

function HeroSection({
 banner,
 heroBanners,
 activeBanner,
 setActiveBanner,
 reduceMotion,
}) {
 return (
  <section className="relative h-[350px] overflow-hidden border-b border-[var(--hexa-border)] bg-black sm:h-[390px] lg:h-[420px]">
   <AnimatePresence mode="wait">
    <motion.div
     key={banner?._id || 'fallback'}
     initial={reduceMotion ? false : { opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={reduceMotion ? undefined : { opacity: 0 }}
     transition={{ duration: reduceMotion ? 0 : 0.38 }}
     className="absolute inset-0"
    >
     <img
      src={banner?.image?.url || fallbackHero}
      alt={banner?.title || 'HEXA digital marketplace'}
      className="h-full w-full object-cover object-center"
      loading="eager"
      decoding="async"
      // eslint-disable-next-line react/no-unknown-property
      fetchpriority="high"
     />

     <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,8,.96)_0%,rgba(5,5,8,.82)_42%,rgba(5,5,8,.30)_72%,rgba(5,5,8,.16)_100%)]" />
     <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,5,8,.52)_0%,transparent_52%)]" />
    </motion.div>
   </AnimatePresence>

   <div className="hexa-container relative z-10 flex h-full items-center py-7">
    <AnimatePresence mode="wait">
     <motion.div
      key={`hero-${banner?._id || 'fallback'}`}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{
       duration: reduceMotion ? 0 : 0.34,
       ease: EASE,
      }}
      className="max-w-3xl"
     >
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[11px] font-medium text-purple-200 backdrop-blur-md">
       <UIIcon icon={HexagonIcon} size={14} strokeWidth={1.8} />
       {banner?.badge || 'Premium digital marketplace'}
      </span>

      <h1 className="mt-4 max-w-3xl text-[2.35rem] font-black leading-[1.04] tracking-[-0.038em] text-white sm:text-[3rem] lg:text-[3.35rem]">
       {banner?.title ||
        'Subscriptions, games & tools. One premium marketplace.'}
      </h1>

      <p className="mt-4 max-w-2xl text-sm font-normal leading-6 text-white/70 sm:text-[15px]">
       {banner?.subtitle ||
        'Discover subscriptions, software, games and digital products in one place.'}
      </p>

      <div className="mt-5 flex flex-wrap gap-2.5">
       <Link
        to={banner?.buttonLink || '/products'}
        className="hexa-btn group !inline-flex !min-h-10 !items-center !gap-2 !rounded-xl !px-4 !py-0 text-sm !font-medium transform-gpu transition-transform duration-150 ease-out hover:scale-[1.015] active:scale-[0.98]"
       >
        {banner?.buttonText || 'Shop now'}
        <UIIcon
         icon={ShoppingBag01Icon}
         size={16}
         strokeWidth={1.9}
         className="transition-transform duration-150 group-hover:translate-x-0.5"
        />
       </Link>

       <Link
        to="/offers"
        className="group inline-flex min-h-10 transform-gpu items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-md transition-[transform,background-color,border-color] duration-150 ease-out hover:scale-[1.015] hover:border-white/25 hover:bg-white/15 active:scale-[0.98]"
       >
        <UIIcon icon={GiftIcon} size={17} strokeWidth={1.8} />
        View offers
       </Link>
      </div>

      <div className="mt-5 hidden max-w-xl grid-cols-3 gap-2 sm:grid">
       <MiniTrust
        icon={Shield01Icon}
        title="Protected"
        text="Secure delivery"
       />
       <MiniTrust
        icon={FlashIcon}
        title="Fast"
        text="Quick browsing"
       />
       <MiniTrust
        icon={StarIcon}
        title="Rewards"
        text="Wallet & points"
       />
      </div>
     </motion.div>
    </AnimatePresence>
   </div>

   {heroBanners.length > 1 && (
    <div className="absolute bottom-4 left-0 right-0 z-20">
     <div className="hexa-container flex justify-center">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
       {heroBanners.map((item, index) => (
        <button
         key={item._id || index}
         type="button"
         onClick={() => setActiveBanner(index)}
         aria-label={`Show banner ${index + 1}`}
         className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out ${
          index === activeBanner
           ? 'w-7 bg-purple-400'
           : 'w-1.5 bg-white/45 hover:bg-white/75'
         }`}
        />
       ))}
      </div>
     </div>
    </div>
   )}
  </section>
 )
}

function CategorySection({ categories, reduceMotion }) {
 return (
  <section className="hexa-container py-12 sm:py-14">
   <SectionHead
    kicker="Explore by category"
    title="Find the service you need faster"
    link="/products"
   />

   <motion.div
    variants={stagger}
    initial={reduceMotion ? false : 'hidden'}
    whileInView="visible"
    viewport={{ once: true, amount: 0.1 }}
    className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
   >
    {categories.slice(0, 8).map((category) => (
     <motion.div key={category._id} variants={reveal} className="min-w-0">
      <Link
       to={`/category/${category.slug}`}
       className="group relative block min-h-[235px] overflow-hidden rounded-[20px] border border-[var(--hexa-border)] bg-[var(--hexa-card)] transition-[border-color] duration-200 hover:border-purple-500/30"
      >
       {category.image?.url ? (
        <>
         <img
          src={category.image.url}
          alt={category.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full transform-gpu object-cover object-center brightness-[0.90] saturate-[1.02] transition-[transform,filter] duration-500 ease-out group-hover:scale-[1.025] group-hover:brightness-100 group-hover:saturate-[1.06]"
         />

         <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,10,.02)_0%,rgba(7,7,10,.10)_38%,rgba(7,7,10,.72)_76%,rgba(7,7,10,.95)_100%)]" />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(168,85,247,.10),transparent_36%)]" />
        </>
       ) : (
        <>
         <div className="absolute inset-0 bg-[var(--hexa-card)]" />
         <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-purple-500/[0.10] blur-3xl" />
         <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-violet-500/[0.07] blur-3xl" />
        </>
       )}

       <div className="relative z-10 flex min-h-[235px] flex-col justify-end p-5">
        <h3
         className={`text-[21px] font-semibold tracking-[-0.025em] ${
          category.image?.url ? 'text-white' : 'text-[var(--hexa-text)]'
         }`}
        >
         {category.name}
        </h3>

        <span
         className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-[background-color,border-color,color] duration-150 ${
          category.image?.url
           ? 'border border-white/15 bg-white/10 text-white backdrop-blur-md group-hover:border-purple-300/30 group-hover:bg-purple-500/20'
           : 'border border-purple-500/15 bg-purple-500/[0.06] text-purple-500 group-hover:bg-purple-500/[0.10]'
         }`}
        >
         Explore category
         <UIIcon
          icon={ArrowRight01Icon}
          size={14}
          strokeWidth={1.9}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
         />
        </span>
       </div>
      </Link>
     </motion.div>
    ))}
   </motion.div>
  </section>
 )
}

function CampaignSection({ banners, reduceMotion }) {
 return (
  <section className="hexa-container pb-12 sm:pb-14">
   <motion.div
    variants={stagger}
    initial={reduceMotion ? false : 'hidden'}
    whileInView="visible"
    viewport={{ once: true, amount: 0.12 }}
    className="grid gap-4 lg:grid-cols-2"
   >
    {banners.map((banner) => (
     <motion.div key={banner._id} variants={reveal}>
      <Link
       to={banner.buttonLink || '/products'}
       className="group relative block min-h-64 overflow-hidden rounded-[20px] border border-[var(--hexa-border)] transition-[border-color] duration-200 hover:border-purple-500/30"
      >
       {banner.image?.url && (
        <img
         src={banner.image.url}
         alt={banner.title || 'Featured campaign'}
         loading="lazy"
         decoding="async"
         className="absolute inset-0 h-full w-full transform-gpu object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
       )}

       <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,12,.94)_0%,rgba(8,8,12,.72)_52%,rgba(8,8,12,.22)_100%)]" />

       <div className="relative flex min-h-64 max-w-md flex-col justify-center p-6 sm:p-7">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[11px] font-medium text-purple-200 backdrop-blur-md">
         <UIIcon icon={SparklesIcon} size={13} strokeWidth={1.8} />
         {banner.badge || 'Featured campaign'}
        </span>

        <h3 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] text-white">
         {banner.title}
        </h3>

        <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white backdrop-blur-md transition-[background-color,border-color] duration-150 group-hover:border-white/25 group-hover:bg-white/15">
         {banner.buttonText || 'Shop now'}
         <UIIcon
          icon={ShoppingBag01Icon}
          size={14}
          strokeWidth={1.9}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
         />
        </span>
       </div>
      </Link>
     </motion.div>
    ))}
   </motion.div>
  </section>
 )
}

function SpotlightSection({ products, reduceMotion }) {
 return (
  <section className="hexa-container pb-14 pt-2">
   <SectionHead
    kicker="Spotlight"
    title="Featured service campaigns"
   />

   <div className="mt-6 space-y-4">
    {products.map((product, index) => (
     <motion.div
      key={product._id}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{
       duration: reduceMotion ? 0 : 0.34,
       ease: EASE,
      }}
     >
      <Link
       to={`/product/${product.slug}`}
       className="group relative block min-h-60 overflow-hidden rounded-[20px] border border-[var(--hexa-border)] transition-[border-color] duration-200 hover:border-purple-500/30"
      >
       <img
        src={product.bannerImage.url}
        alt={`${product.name} campaign`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full transform-gpu object-cover transition-transform duration-500 ease-out group-hover:scale-[1.018]"
       />

       <div
        className={`absolute inset-0 ${
         index % 2
          ? 'bg-[linear-gradient(270deg,rgba(8,8,12,.94),rgba(8,8,12,.28))]'
          : 'bg-[linear-gradient(90deg,rgba(8,8,12,.94),rgba(8,8,12,.28))]'
        }`}
       />

       <div
        className={`relative flex min-h-60 max-w-2xl flex-col justify-center p-6 sm:p-7 ${
         index % 2 ? 'ml-auto items-end text-right' : ''
        }`}
       >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[11px] font-medium text-purple-200 backdrop-blur-md">
         <UIIcon icon={SparklesIcon} size={13} strokeWidth={1.8} />
         Product spotlight
        </span>

        <h3 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] text-white sm:text-3xl">
         {product.name}
        </h3>

        <span className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white backdrop-blur-md transition-[background-color,border-color] duration-150 group-hover:border-white/25 group-hover:bg-white/15">
         View plans
         <UIIcon
          icon={ArrowRight01Icon}
          size={14}
          strokeWidth={1.9}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
         />
        </span>
       </div>
      </Link>
     </motion.div>
    ))}
   </div>
  </section>
 )
}

function BundleSection({ bundles, format, reduceMotion }) {
 return (
  <section className="border-y border-[var(--hexa-border)] bg-[var(--hexa-bg-soft)] py-12 sm:py-14">
   <div className="hexa-container">
    <SectionHead
     kicker="Save more together"
     title="HEXA bundles & combo offers"
     link="/offers"
    />

    <motion.div
     variants={stagger}
     initial={reduceMotion ? false : 'hidden'}
     whileInView="visible"
     viewport={{ once: true, amount: 0.1 }}
     className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
     {bundles.map((bundle) => {
      const hasSale =
       bundle.salePrice > 0 &&
       bundle.salePrice < bundle.regularPrice

      return (
       <motion.div key={bundle._id} variants={reveal}>
        <Link
         to={`/bundle/${bundle.slug}`}
         className="group block h-full overflow-hidden rounded-[18px] border border-[var(--hexa-border)] bg-[var(--hexa-card)] transition-[border-color] duration-200 hover:border-purple-500/30"
        >
         <div className="aspect-[16/9] overflow-hidden bg-purple-500/[0.05]">
          {bundle.image?.url ? (
           <img
            src={bundle.image.url}
            alt={bundle.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full transform-gpu object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
           />
          ) : (
           <div className="flex h-full items-center justify-center text-purple-500/35">
            <UIIcon icon={PackageIcon} size={46} strokeWidth={1.25} />
           </div>
          )}
         </div>

         <div className="p-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/15 bg-purple-500/[0.06] px-2.5 py-1 text-[11px] font-medium text-purple-500">
           <UIIcon icon={GiftIcon} size={13} strokeWidth={1.8} />
           Bundle
          </span>

          <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[var(--hexa-text)]">
           {bundle.name}
          </h3>

          <div className="mt-5 flex items-end justify-between gap-4">
           <div className="min-w-0">
            <p className="text-xs font-normal text-[var(--hexa-muted)]">
             Bundle price
            </p>

            <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--hexa-text)]">
             {format(bundle.salePrice || bundle.regularPrice)}
            </p>

            {hasSale && (
             <p className="mt-0.5 text-xs text-[var(--hexa-muted)] line-through">
              {format(bundle.regularPrice)}
             </p>
            )}
           </div>

           <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-[13px] font-medium text-white">
            View bundle
            <UIIcon
             icon={ArrowRight01Icon}
             size={14}
             strokeWidth={1.9}
             className="transition-transform duration-150 group-hover:translate-x-0.5"
            />
           </span>
          </div>
         </div>
        </Link>
       </motion.div>
      )
     })}
    </motion.div>
   </div>
  </section>
 )
}

function PromotionSection({ promotions, reduceMotion }) {
 return (
  <section className="hexa-container py-12 sm:py-14">
   <SectionHead
    kicker="Limited campaigns"
    title="Special offers"
    link="/offers"
   />

   <motion.div
    variants={stagger}
    initial={reduceMotion ? false : 'hidden'}
    whileInView="visible"
    viewport={{ once: true, amount: 0.1 }}
    className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
   >
    {promotions.map((promotion) => (
     <motion.div key={promotion._id} variants={reveal}>
      <Link
       to={promotion.buttonLink || '/offers'}
       className="group relative block min-h-56 overflow-hidden rounded-[18px] border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-5 transition-[border-color] duration-200 hover:border-purple-500/30"
      >
       {promotion.image?.url && (
        <>
         <img
          src={promotion.image.url}
          alt={
           promotion.headline ||
           promotion.name ||
           'Offer'
          }
          loading="lazy"
          decoding="async"
          className="absolute right-0 top-0 h-full w-2/5 object-cover opacity-25 transition-opacity duration-200 group-hover:opacity-35"
         />
         <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--hexa-card)_58%,transparent_100%)]" />
        </>
       )}

       <div className="relative flex min-h-44 max-w-[80%] flex-col">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-purple-500/15 bg-purple-500/[0.06] px-2.5 py-1 text-[11px] font-medium text-purple-500">
         <UIIcon icon={FlameIcon} size={13} strokeWidth={1.8} />
         {promotion.badge || 'Offer'}
        </span>

        <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.025em] text-[var(--hexa-text)]">
         {promotion.headline || promotion.name}
        </h3>

        <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-xl border border-purple-500/15 bg-purple-500/[0.06] px-3 py-2 text-[13px] font-medium text-purple-500 transition-colors duration-150 group-hover:bg-purple-500/[0.10]">
         {promotion.buttonText || 'View offer'}
         <UIIcon
          icon={ArrowRight01Icon}
          size={14}
          strokeWidth={1.9}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
         />
        </span>
       </div>
      </Link>
     </motion.div>
    ))}
   </motion.div>
  </section>
 )
}

function ProductSection({
 products = [],
 loading = false,
 kicker,
 title,
 link,
 reduceMotion,
}) {
 return (
  <section className="hexa-container py-12 sm:py-14">
   <SectionHead kicker={kicker} title={title} link={link} />

   {loading ? (
    <CardsSkeleton />
   ) : products.length ? (
    <motion.div
     variants={stagger}
     initial={reduceMotion ? false : 'hidden'}
     whileInView="visible"
     viewport={{ once: true, amount: 0.08 }}
     className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
     {products.map((product) => (
      <motion.div key={product._id} variants={reveal}>
       <ProductCard product={product} />
      </motion.div>
     ))}
    </motion.div>
   ) : (
    <div className="mt-6">
     <EmptyState title="Nothing here yet" />
    </div>
   )}
  </section>
 )
}

function WhyHexaSection({ reduceMotion }) {
 const benefits = [
  'Secure digital credential delivery',
  'Coupons, loyalty points and wallet credit',
  'Subscription expiry and renewal awareness',
  'Wishlist, reviews and recommendations',
  'Support tickets and refund workflow',
 ]

 return (
  <section className="hexa-container py-12 sm:py-14">
   <motion.div
    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{
     duration: reduceMotion ? 0 : 0.34,
     ease: EASE,
    }}
    className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]"
   >
    <div className="rounded-[20px] border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-6 sm:p-7">
     <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/15 bg-purple-500/[0.06] px-2.5 py-1 text-[11px] font-medium text-purple-500">
      <UIIcon icon={Shield01Icon} size={13} strokeWidth={1.8} />
      Why HEXA
     </span>

     <h2 className="mt-4 max-w-xl text-[28px] font-black leading-tight tracking-[-0.035em] text-[var(--hexa-text)] sm:text-3xl">
      Built around trust and simple purchasing.
     </h2>

     <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {benefits.map((benefit) => (
       <li
        key={benefit}
        className="flex items-start gap-2.5 text-sm font-normal leading-6 text-[var(--hexa-text-soft)]"
       >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/[0.08] text-purple-500">
         <UIIcon icon={Tick02Icon} size={13} strokeWidth={2} />
        </span>
        <span>{benefit}</span>
       </li>
      ))}
     </ul>
    </div>

    <div className="relative overflow-hidden rounded-[20px] border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-6 sm:p-7">
     <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-purple-500/[0.10] blur-3xl" />

     <div className="relative flex h-full flex-col justify-center">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-purple-500/15 bg-purple-500/[0.06] px-2.5 py-1 text-[11px] font-medium text-purple-500">
       <UIIcon icon={HelpCircleIcon} size={13} strokeWidth={1.8} />
       Need help?
      </span>

      <h2 className="mt-4 text-[28px] font-black leading-tight tracking-[-0.035em] text-[var(--hexa-text)] sm:text-3xl">
       Purchase with confidence.
      </h2>

      <p className="mt-3 max-w-md text-sm leading-6 text-[var(--hexa-muted)]">
       Browse the marketplace or open the support center whenever you need help with an order or service.
      </p>

      <div className="mt-6 flex flex-wrap gap-2.5">
       <Link
        to="/account/support"
        className="hexa-btn group !inline-flex !min-h-10 !items-center !gap-2 !rounded-xl !px-4 !py-0 text-sm !font-medium transform-gpu transition-transform duration-150 hover:scale-[1.015] active:scale-[0.98]"
       >
        Open support center
        <UIIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.9} />
       </Link>

       <Link
        to="/products"
        className="hexa-btn-secondary group !inline-flex !min-h-10 !items-center !gap-2 !rounded-xl !px-4 !py-0 text-sm !font-medium transform-gpu transition-transform duration-150 hover:scale-[1.015] active:scale-[0.98]"
       >
        Browse marketplace
       </Link>
      </div>
     </div>
    </div>
   </motion.div>
  </section>
 )
}

function FaqSection({ faqs, reduceMotion }) {
 return (
  <section className="hexa-container pb-16 pt-3 sm:pb-20">
   <SectionHead
    kicker="FAQ"
    title="Frequently asked questions"
   />

   <motion.div
    variants={stagger}
    initial={reduceMotion ? false : 'hidden'}
    whileInView="visible"
    viewport={{ once: true, amount: 0.1 }}
    className="mt-6 grid gap-3 lg:grid-cols-2"
   >
    {faqs.map((faq, index) => (
     <motion.details
      key={`${faq.question}-${index}`}
      variants={reveal}
      className="group rounded-[16px] border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4 transition-[border-color] duration-150 open:border-purple-500/25"
     >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-[var(--hexa-text)] [&::-webkit-details-marker]:hidden sm:text-[15px]">
       <span>{faq.question}</span>

       <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/[0.06] text-purple-500">
        <UIIcon
         icon={ArrowDown01Icon}
         size={16}
         strokeWidth={1.9}
         className="transition-transform duration-200 ease-out group-open:rotate-180"
        />
       </span>
      </summary>

      <p className="mt-4 border-t border-[var(--hexa-border)] pt-4 text-sm font-normal leading-6 text-[var(--hexa-muted)]">
       {faq.answer}
      </p>
     </motion.details>
    ))}
   </motion.div>
  </section>
 )
}

function MiniTrust({ icon, title, text }) {
 return (
  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 backdrop-blur-md">
   <UIIcon icon={icon} size={17} strokeWidth={1.8} className="text-purple-300" />
   <p className="mt-1.5 text-[13px] font-medium text-white">{title}</p>
   <p className="mt-0.5 text-[10px] text-white/55">{text}</p>
  </div>
 )
}

function SectionHead({ kicker, title, link }) {
 return (
  <div className="flex items-end justify-between gap-4">
   <div className="min-w-0">
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-purple-500 sm:text-xs">
     {kicker}
    </p>
    <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--hexa-text)] sm:text-[28px]">
     {title}
    </h2>
   </div>

   {link && (
    <Link
     to={link}
     className="group hidden shrink-0 items-center gap-1.5 rounded-xl border border-purple-500/15 bg-purple-500/[0.05] px-3.5 py-2 text-[13px] font-medium text-purple-500 transition-[background-color,border-color] duration-150 hover:border-purple-500/25 hover:bg-purple-500/[0.09] sm:inline-flex"
    >
     View all
     <UIIcon
      icon={ArrowRight01Icon}
      size={14}
      strokeWidth={1.9}
      className="transition-transform duration-150 group-hover:translate-x-0.5"
     />
    </Link>
   )}
  </div>
 )
}

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

function CardsSkeleton() {
 return (
  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   {Array.from({ length: 4 }).map((_, index) => (
    <div
     key={index}
     className="h-[390px] animate-pulse rounded-[18px] border border-[var(--hexa-border)] bg-[var(--hexa-card)]"
    />
   ))}
  </div>
 )
}
