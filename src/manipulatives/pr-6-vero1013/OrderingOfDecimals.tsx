import html from './decimal-ordering-number-line-zoom.html?raw'

export default function OrderingOfDecimals() {
  return (
    <iframe
      title="Ordering of decimals"
      srcDoc={html}
      className="h-[500px] w-[800px] rounded-xl border-0 bg-white shadow-xl"
    />
  )
}
