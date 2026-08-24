import html from './cone-sphere-cylinder.html?raw'

export default function VolumeOfSphere() {
  return (
    <iframe
      title="Volume of Sphere"
      srcDoc={html}
      className="h-[500px] w-[800px] rounded-xl border-0 bg-white shadow-xl"
    />
  )
}
