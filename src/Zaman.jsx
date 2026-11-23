import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Labubu from './Labubu.jsx'
import { talk } from './talk.js'
import useChatAvatar from './useChatAvatar.js'

// Prof. Tauhid Zaman: black hoodie with a pink BLACKPINK print, jeans, white kicks,
// glasses, and a pink Labubu hanging off his belt loop. Built from primitives.
// Faces +z. Aim the crosshair at him and click (touch mode: tap the 'Tap to chat' button);
// while you're chatting he turns to face you and "talks" while a reply is coming in.

export const ZAMAN_ID = 'tauhid-zaman'

const SKIN = '#c58c5c' // light brown
const HAIR = '#141010'
const HOODIE = '#141418'
const JEANS = '#2b3a55'
const PINK = '#ff4fa3'

const mats = new Map()
const m = (color, o = {}) => {
  const k = color + JSON.stringify(o)
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }))
  return mats.get(k)
}
const SPH = new THREE.SphereGeometry(1, 24, 16)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CAP = new THREE.CapsuleGeometry(1, 1, 6, 12)
const TORUS = new THREE.TorusGeometry(1, 0.12, 8, 24)
const B = ({ g = SPH, c, p, s, r = [0, 0, 0], o }) => <mesh geometry={g} material={m(c, o)} position={p} scale={s} rotation={r} />

function printTex() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = HOODIE
  g.fillRect(0, 0, 512, 256)
  g.fillStyle = PINK
  g.font = 'bold 74px "Arial Black", Arial, sans-serif'
  g.textAlign = 'center'
  g.fillText('BLACKPINK', 256, 120)
  g.font = 'bold 34px Arial, sans-serif'
  g.fillText('♥  IN YOUR AREA  ♥', 256, 190)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export default function Zaman({ position = [0, 0, 0], rotation = 0 }) {
  const root = useRef()
  const head = useRef()
  const mouth = useRef()
  const talkArm = useRef()
  const charm = useRef()
  const printMat = useMemo(() => new THREE.MeshStandardMaterial({ map: printTex(), roughness: 0.9 }), [])
  useChatAvatar(ZAMAN_ID, rotation, { root, head, mouth, arm: talkArm })

  // the Labubu swings on its clip
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    charm.current.rotation.z = Math.sin(t * 2.3) * 0.25
    charm.current.rotation.x = Math.sin(t * 1.7) * 0.15
  })

  const open = (e) => {
    if (document.pointerLockElement) return // handled by the mousedown listener
    e.stopPropagation()
    talk.open(ZAMAN_ID)
  }

  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} onClick={open}>
      {/* sneakers */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={BOX} c="#f4f4f4" p={[0.1 * sx, 0.05, 0.04]} s={[0.12, 0.1, 0.28]} />
          <B g={BOX} c={PINK} p={[0.1 * sx, 0.015, 0.04]} s={[0.125, 0.03, 0.285]} />
        </group>
      ))}
      {/* jeans */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={CAP} material={m(JEANS)} position={[0.1 * sx, 0.5, 0]} scale={[0.085, 0.32, 0.085]} />
      ))}
      <B g={CYL} c={JEANS} p={[0, 0.88, 0]} s={[0.19, 0.14, 0.15]} />
      <B g={BOX} c="#1a1a1a" p={[0, 0.95, 0]} s={[0.39, 0.04, 0.31]} />
      {/* hoodie body */}
      <mesh geometry={new THREE.CylinderGeometry(0.23, 0.215, 0.6, 24)} material={m(HOODIE)} position={[0, 1.23, 0]} scale={[1, 1, 0.78]} />
      <B c={HOODIE} p={[0, 1.5, 0]} s={[0.26, 0.09, 0.18]} />
      <B g={CYL} c="#0d0d10" p={[0, 0.96, 0]} s={[0.215, 0.07, 0.17]} />
      {/* BLACKPINK chest print + kangaroo pocket */}
      <mesh position={[0, 1.27, 0.176]} material={printMat}>
        <planeGeometry args={[0.3, 0.15]} />
      </mesh>
      <B g={BOX} c="#1d1d23" p={[0, 1.07, 0.165]} s={[0.24, 0.11, 0.02]} />
      {/* hood behind the neck + pink drawstrings */}
      <B c={HOODIE} p={[0, 1.55, -0.1]} s={[0.17, 0.1, 0.12]} />
      <mesh geometry={TORUS} material={m(HOODIE)} position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.13, 0.11, 0.3]} />
      {[-1, 1].map((sx) => (
        <B key={sx} g={CYL} c={PINK} p={[0.045 * sx, 1.46, 0.165]} s={[0.006, 0.08, 0.006]} />
      ))}
      {/* Labubu keychain on the right hip belt loop */}
      <group position={[-0.17, 0.94, 0.11]}>
        <B g={TORUS} c="#d8d8d8" o={{ metalness: 0.9, roughness: 0.25 }} p={[0, 0, 0]} r={[0, Math.PI / 2, 0]} s={[0.022, 0.022, 0.022]} />
        <group ref={charm}>
          <B g={CYL} c="#d8d8d8" o={{ metalness: 0.9, roughness: 0.25 }} p={[0, -0.04, 0]} s={[0.004, 0.06, 0.004]} />
          <Labubu height={0.17} fur="#ff8fc7" expression="mischief" anim="idle" position={[0, -0.24, 0]} />
        </group>
      </group>
      {/* left arm (+x) relaxed, right arm (-x) gestures while talking */}
      <group position={[0.27, 1.47, 0]} rotation={[0.05, 0, 0.12]}>
        <mesh geometry={CAP} material={m(HOODIE)} position={[0, -0.25, 0]} scale={[0.07, 0.21, 0.07]} />
        <B g={CYL} c="#0d0d10" p={[0, -0.47, 0]} s={[0.066, 0.05, 0.066]} />
        <B c={SKIN} p={[0, -0.53, 0.01]} s={[0.045, 0.055, 0.04]} />
      </group>
      <group ref={talkArm} position={[-0.27, 1.47, 0]}>
        <mesh geometry={CAP} material={m(HOODIE)} position={[0, -0.25, 0]} scale={[0.07, 0.21, 0.07]} />
        <B g={CYL} c="#0d0d10" p={[0, -0.47, 0]} s={[0.066, 0.05, 0.066]} />
        <B c={SKIN} p={[0, -0.53, 0.01]} s={[0.045, 0.055, 0.04]} />
      </group>
      {/* neck + head */}
      <B g={CYL} c={SKIN} p={[0, 1.57, 0]} s={[0.05, 0.08, 0.05]} />
      <group ref={head} position={[0, 1.6, 0]}>
        <group position={[0, -1.6, 0]}>
          <B c={SKIN} p={[0, 1.7, 0]} s={[0.118, 0.138, 0.128]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={SKIN} p={[0.12 * sx, 1.7, 0]} s={[0.02, 0.035, 0.02]} />
          ))}
          {/* short black hair with a little front swoop */}
          <B c={HAIR} p={[0, 1.765, -0.015]} s={[0.126, 0.09, 0.13]} />
          <B c={HAIR} p={[0.02, 1.8, 0.07]} r={[0.5, 0, -0.2]} s={[0.09, 0.04, 0.06]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={HAIR} p={[0.108 * sx, 1.73, -0.02]} s={[0.025, 0.06, 0.09]} />
          ))}
          {/* eyes, brows, nose, mouth */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <B c="#ffffff" p={[0.044 * sx, 1.722, 0.11]} s={[0.022, 0.017, 0.012]} />
              <B c="#1d1410" p={[0.044 * sx, 1.722, 0.12]} s={[0.011, 0.012, 0.008]} />
              <B g={BOX} c={HAIR} p={[0.046 * sx, 1.758, 0.114]} r={[0, 0, -0.08 * sx]} s={[0.045, 0.011, 0.01]} />
            </group>
          ))}
          <B c="#b47c50" p={[0, 1.69, 0.127]} s={[0.02, 0.028, 0.024]} />
          <mesh ref={mouth} geometry={BOX} material={m('#6b2f2a')} position={[0, 1.645, 0.118]} scale={[0.06, 0.01, 0.01]} />
          {/* nerd glasses */}
          {[-1, 1].map((sx) => (
            <B key={sx} g={TORUS} c="#111111" p={[0.046 * sx, 1.722, 0.128]} s={[0.034, 0.03, 0.03]} />
          ))}
          <B g={BOX} c="#111111" p={[0, 1.726, 0.13]} s={[0.025, 0.006, 0.006]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={BOX} c="#111111" p={[0.085 * sx, 1.726, 0.06]} s={[0.005, 0.006, 0.13]} />
          ))}
        </group>
      </group>
    </group>
  )
}
