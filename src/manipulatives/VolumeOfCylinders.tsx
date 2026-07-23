import html from './cylinder-cross-sections.html?raw'

export default function VolumeOfCylinders() {
  return (
    <iframe
      title="Volume of Cylinders"
      srcDoc={html}
      className="h-[500px] w-[800px] rounded-xl border-0 bg-white shadow-xl"
    />
  )
}
