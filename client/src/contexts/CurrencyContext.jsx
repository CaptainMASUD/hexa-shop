import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getPublicSettings } from '../api/features.api'
const CurrencyContext=createContext(null)
export function CurrencyProvider({children}){
  const [settings,setSettings]=useState(null)
  const [currency,setCurrency]=useState(()=>localStorage.getItem('hexa_currency')||'BDT')
  useEffect(()=>{getPublicSettings().then(setSettings).catch(()=>{})},[])
  useEffect(()=>localStorage.setItem('hexa_currency',currency),[currency])
  const currencies=settings?.currencies?.filter(c=>c.active)||[{code:'BDT',symbol:'৳',rateFromBDT:1}]
  const selected=currencies.find(c=>c.code===currency)||currencies[0]
  const format=(bdt)=>`${selected?.symbol||'৳'}${(Number(bdt||0)*Number(selected?.rateFromBDT||1)).toLocaleString(undefined,{maximumFractionDigits:selected?.code==='BDT'?0:2})}`
  const value=useMemo(()=>({settings,currency,setCurrency,currencies,format}),[settings,currency])
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}
export const useCurrency=()=>useContext(CurrencyContext)
