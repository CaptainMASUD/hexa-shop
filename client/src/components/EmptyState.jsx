import { BsHexagon } from 'react-icons/bs'
export default function EmptyState({ title = 'Nothing here yet', description = 'There is no data to display.' }) {
  return <div className="hexa-panel py-14 text-center"><BsHexagon className="mx-auto text-4xl text-purple-500/60"/><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{description}</p></div>
}
