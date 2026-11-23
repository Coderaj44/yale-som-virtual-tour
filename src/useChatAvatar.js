import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { talk } from './talk.js'

// Shared behavior for AI professor avatars:
//  - crosshair aiming (screen center within TALK_RANGE) sets talk.aimed
//  - left click while the pointer is locked opens the chat
//  - while chatting, the avatar turns to face you and looks up/down at your eyes
//  - while a reply is coming in, the head nods, the mouth moves and one arm gestures
// Pass refs to the root group, head group, mouth mesh and gesturing arm group.

const TALK_RANGE = 7 // meters
const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a)) // shortest signed angle

export default function useChatAvatar(id, rotation, { root, head, mouth, arm }, { headY = 1.68, mouthOpen = 0.022 } = {}) {
  const { camera } = useThree()
  const yaw = useRef(rotation)
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const center = useMemo(() => new THREE.Vector2(0, 0), [])

  useEffect(() => {
    const down = (e) => {
      if (e.button === 0 && document.pointerLockElement && talk.get().aimed === id) talk.open(id)
    }
    window.addEventListener('mousedown', down)
    return () => window.removeEventListener('mousedown', down)
  }, [id])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const g = root.current
    if (!g) return
    const { open, speaking, aimed } = talk.get()
    const chatting = open === id
    const dx = camera.position.x - g.position.x
    const dz = camera.position.z - g.position.z
    const dist = Math.hypot(dx, dz)

    if (!open) {
      ray.setFromCamera(center, camera)
      const hit = dist < TALK_RANGE && ray.intersectObject(g, true).length > 0
      if (hit && aimed !== id) talk.setAimed(id)
      if (!hit && aimed === id) talk.setAimed(null)
    } else if (aimed === id) talk.setAimed(null)

    const facing = chatting || (dist < 3.5 && aimed === id)
    const target = facing ? Math.atan2(dx, dz) : rotation + Math.sin(t * 0.4) * 0.35
    yaw.current += turn(yaw.current, target) * Math.min(1, dt * (facing ? 5 : 2))
    g.rotation.y = yaw.current

    const talking = chatting && speaking
    const look = chatting ? Math.atan2(camera.position.y - (g.position.y + headY), Math.max(dist, 0.5)) : 0
    if (head.current) head.current.rotation.x = -look * 0.6 + (talking ? Math.sin(t * 7) * 0.05 : 0)
    if (mouth.current) mouth.current.scale.y = talking ? 0.012 + Math.abs(Math.sin(t * 14)) * mouthOpen : 0.01
    if (arm.current) {
      arm.current.rotation.x = talking ? -0.9 + Math.sin(t * 4) * 0.35 : -0.15 + Math.sin(t * 1.1) * 0.05
      arm.current.rotation.z = talking ? -0.35 : -0.12
    }
  })
}
