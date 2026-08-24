import html from './cone-vs-cylinder.html?raw'

export default function VolumeOfCone() {
  return (
    <iframe
      title="Volume of cone"
      srcDoc={html}
      className="h-[500px] w-[800px] rounded-xl border-0 bg-white shadow-xl"
    />
  )
}
