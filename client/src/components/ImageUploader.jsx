import { useState } from 'react'
import { FaCloudUploadAlt } from 'react-icons/fa'
import { uploadAdminImage } from '../api/admin.api'
import { apiErrorMessage } from '../api/client'
import { useToast } from '../contexts/ToastContext'
export default function ImageUploader({folder='products',value,onChange,label='Image'}){const[busy,setBusy]=useState(false);const{notify}=useToast();const upload=async(e)=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);try{const result=await uploadAdminImage(file,folder);onChange({url:result.url,publicId:result.publicId,alt:value?.alt||''});notify('Image uploaded')}catch(error){notify(apiErrorMessage(error,'Upload failed'),'error')}finally{setBusy(false)}};return <div><span className="hexa-label">{label}</span><div className="flex items-center gap-3">{value?.url&&<img src={value.url} alt="" className="h-16 w-20 rounded-lg border border-white/10 object-cover"/>}<label className="hexa-btn-secondary cursor-pointer !px-4 !py-2 text-sm"><FaCloudUploadAlt/>{busy?'Uploading…':'Upload image'}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={upload} className="hidden"/></label></div></div>}
