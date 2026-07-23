import html from './absolute-value-manipulatives.html?raw'

export default function AbsoluteValueManipulative() {
  return (
    <iframe
      title="absolute value"
      srcDoc={html}
      className="h-[500px] w-[800px] rounded-xl border-0 bg-white shadow-xl"
    />
  )
}
