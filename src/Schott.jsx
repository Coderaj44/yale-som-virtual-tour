import { useRef } from 'react'
import * as THREE from 'three'
import { talk } from './talk.js'
import useChatAvatar from './useChatAvatar.js'

// Prof. Peter Schott: MGT 407 Statistics (EMBA). SoCal energy in a black tux with satin lapels,
// a bow tie, a pink pocket square, shiny shoes, and sunglasses pushed up on his head.
// Faces +z. Same chat behavior as Zaman (see useChatAvatar.js).

export const SCHOTT_ID = 'peter-schott'

const SKIN = '#e8b993' // sun-kissed
const HAIR = '#6b4a2e'
const TUX = '#111114'
const SATIN = '#26262c'
const SHIRT = '#f6f6f2'
const PINK = '#ff4fa3'

const mats = new Map()
const m = (color, o = {}) => {
  const k = color + JSON.stringify(o)
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o }))
  return mats.get(k)
}
const SPH = new THREE.SphereGeometry(1, 24, 16)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CAP = new THREE.CapsuleGeometry(1, 1, 6, 12)
const CONE = new THREE.ConeGeometry(1, 1, 4)
const GRIN = new THREE.TorusGeometry(1, 0.16, 8, 16, Math.PI) // half ring, flipped into a smile
const B = ({ g = SPH, c, p, s, r = [0, 0, 0], o }) => <mesh geometry={g} material={m(c, o)} position={p} scale={s} rotation={r} />
const SHINY = { roughness: 0.25, metalness: 0.3 }

function Arm({ x, armRef, rot }) {
  return (
    <group ref={armRef} position={[x, 1.47, 0]} rotation={rot}>
      <mesh geometry={CAP} material={m(TUX)} position={[0, -0.25, 0]} scale={[0.068, 0.21, 0.068]} />
      <B g={CYL} c={SHIRT} p={[0, -0.47, 0]} s={[0.06, 0.04, 0.06]} />
      <B g={BOX} c="#c9a44a" o={{ metalness: 0.8, roughness: 0.3 }} p={[0, -0.47, 0.06]} s={[0.015, 0.015, 0.01]} />
      <B c={SKIN} p={[0, -0.53, 0.01]} s={[0.045, 0.055, 0.04]} />
    </group>
  )
}

export default function Schott({ position = [0, 0, 0], rotation = 0 }) {
  const root = useRef()
  const head = useRef()
  const mouth = useRef()
  const arm = useRef()
  useChatAvatar(SCHOTT_ID, rotation, { root, head, mouth, arm })

  const open = (e) => {
    if (document.pointerLockElement) return
    e.stopPropagation()
    talk.open(SCHOTT_ID)
  }

  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} onClick={open}>
      {/* patent leather shoes */}
      {[-1, 1].map((sx) => (
        <B key={sx} g={BOX} c="#050505" o={{ roughness: 0.15, metalness: 0.4 }} p={[0.1 * sx, 0.045, 0.05]} s={[0.11, 0.09, 0.27]} />
      ))}
      {/* tux trousers with satin side stripe */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh geometry={CAP} material={m(TUX)} position={[0.1 * sx, 0.5, 0]} scale={[0.082, 0.32, 0.082]} />
          <B g={BOX} c={SATIN} o={SHINY} p={[0.18 * sx, 0.5, 0]} s={[0.006, 0.62, 0.03]} />
        </group>
      ))}
      <B g={CYL} c={TUX} p={[0, 0.88, 0]} s={[0.19, 0.14, 0.15]} />
      {/* jacket body */}
      <mesh geometry={new THREE.CylinderGeometry(0.225, 0.2, 0.62, 24)} material={m(TUX)} position={[0, 1.2, 0]} scale={[1, 1, 0.78]} />
      <B c={TUX} p={[0, 1.49, 0]} s={[0.27, 0.09, 0.18]} />
      {/* jacket tails flare a bit below the waist */}
      <mesh geometry={new THREE.CylinderGeometry(0.2, 0.235, 0.16, 24)} material={m(TUX)} position={[0, 0.84, 0]} scale={[1, 1, 0.8]} />
      {/* white shirt V, satin lapels, bow tie, studs, pink pocket square */}
      <mesh geometry={CONE} material={m(SHIRT)} position={[0, 1.36, 0.157]} rotation={[0, Math.PI / 4, Math.PI]} scale={[0.1, 0.32, 0.02]} />
      {[-1, 1].map((sx) => (
        <B key={sx} g={BOX} c={SATIN} o={SHINY} p={[0.075 * sx, 1.35, 0.168]} r={[0, 0, -0.32 * sx]} s={[0.045, 0.3, 0.012]} />
      ))}
      <B g={BOX} c="#000000" o={SHINY} p={[0, 1.5, 0.175]} s={[0.03, 0.03, 0.02]} />
      {[-1, 1].map((sx) => (
        <B key={sx} g={CONE} c="#000000" o={SHINY} p={[0.04 * sx, 1.5, 0.172]} r={[0, 0, (Math.PI / 2) * sx]} s={[0.035, 0.05, 0.012]} />
      ))}
      {[0, 1, 2].map((i) => (
        <B key={i} c="#111" p={[0, 1.42 - i * 0.06, 0.163]} s={[0.008, 0.008, 0.006]} />
      ))}
      <B g={BOX} c={PINK} p={[0.12, 1.37, 0.16]} r={[0, 0, 0.3]} s={[0.04, 0.03, 0.01]} />
      <B c="#111" p={[0, 1.08, 0.165]} s={[0.012, 0.012, 0.008]} />
      {/* left arm relaxed, right arm gestures while talking */}
      <Arm x={0.27} rot={[0.05, 0, 0.12]} />
      <Arm x={-0.27} armRef={arm} />
      {/* neck + head */}
      <B g={CYL} c={SKIN} p={[0, 1.57, 0]} s={[0.05, 0.08, 0.05]} />
      <B g={CYL} c={SHIRT} p={[0, 1.54, 0]} s={[0.058, 0.03, 0.058]} />
      <group ref={head} position={[0, 1.6, 0]}>
        <group position={[0, -1.6, 0]}>
          <B c={SKIN} p={[0, 1.7, 0]} s={[0.12, 0.138, 0.128]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={SKIN} p={[0.122 * sx, 1.7, 0]} s={[0.02, 0.035, 0.02]} />
          ))}
          {/* tousled surfer hair */}
          <B c={HAIR} p={[0, 1.775, -0.02]} s={[0.13, 0.085, 0.13]} />
          {[-0.06, 0, 0.06].map((x, i) => (
            <B key={i} c={HAIR} p={[x, 1.8, 0.075]} r={[0.6, 0, x * 3]} s={[0.05, 0.035, 0.05]} />
          ))}
          {[-1, 1].map((sx) => (
            <B key={sx} c={HAIR} p={[0.11 * sx, 1.73, -0.03]} s={[0.025, 0.06, 0.09]} />
          ))}
          {/* sunglasses pushed up on his head */}
          {[-1, 1].map((sx) => (
            <B key={sx} c="#0a0a0a" o={{ roughness: 0.1, metalness: 0.5 }} p={[0.045 * sx, 1.835, 0.085]} r={[-0.5, 0, 0]} s={[0.036, 0.024, 0.01]} />
          ))}
          <B g={BOX} c="#c9a44a" o={{ metalness: 0.8, roughness: 0.3 }} p={[0, 1.84, 0.09]} r={[-0.5, 0, 0]} s={[0.03, 0.005, 0.005]} />
          {/* eyes, raised happy brows, nose, big grin */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <B c="#ffffff" p={[0.044 * sx, 1.722, 0.11]} s={[0.022, 0.017, 0.012]} />
              <B c="#2a5d8a" p={[0.044 * sx, 1.722, 0.12]} s={[0.011, 0.012, 0.008]} />
              <B g={BOX} c={HAIR} p={[0.046 * sx, 1.762, 0.114]} r={[0, 0, 0.15 * sx]} s={[0.045, 0.011, 0.01]} />
            </group>
          ))}
          <B c="#d9a07c" p={[0, 1.69, 0.128]} s={[0.02, 0.028, 0.024]} />
          <B g={GRIN} c="#7a2f2a" p={[0, 1.66, 0.118]} r={[0, 0, Math.PI]} s={[0.03, 0.022, 0.03]} />
          <mesh ref={mouth} geometry={BOX} material={m('#6b2f2a')} position={[0, 1.64, 0.118]} scale={[0.05, 0.01, 0.01]} />
        </group>
      </group>
    </group>
  )
}
