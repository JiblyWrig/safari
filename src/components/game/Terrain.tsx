'use client'

import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { terrainHeight, WATER_LEVEL, WORLD_SIZE } from '@/lib/terrain'
import { grassTexture, bumpTexture } from '@/lib/textures'
import { stats } from '@/lib/stats'

const SEG = 200

export function Terrain({ shadows = true }: { shadows?: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEG, SEG)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const cGrass = new THREE.Color('#7c9a44')
    const cSand = new THREE.Color('#e0cd92')
    const cRock = new THREE.Color('#7d7770')
    const tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = terrainHeight(x, z)
      pos.setY(i, y)

      // blend by region only — uniform grass everywhere except sand/rock
      const waterDist = Math.hypot(x - 70, z - 70)
      const ridgeDist = Math.hypot(x + 80, z + 80)
      tmp.copy(cGrass)
      // sand near water
      if (waterDist < 30 && y < WATER_LEVEL + 2.2) {
        const s = THREE.MathUtils.clamp(1 - (waterDist - 22) / 8, 0, 1)
        tmp.lerp(cSand, s * 0.85)
      }
      // rock on ridge
      if (ridgeDist < 30 && y > 3) {
        const r = THREE.MathUtils.clamp((y - 3) / 4, 0, 1)
        tmp.lerp(cRock, r * 0.8)
      }
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  const grass = useMemo(() => {
    const t = grassTexture(512)
    t.repeat.set(28, 28)
    return t
  }, [])
  const bump = useMemo(() => {
    const t = bumpTexture(512)
    t.repeat.set(28, 28)
    return t
  }, [])

  // Wind sway via onBeforeCompile — subtle vertex displacement that follows
  // the player so distant terrain stays still.
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  // uniforms stored on the material's userData so we mutate via ref (lint-safe)
  useFrame((_, delta) => {
    const mat = matRef.current
    if (!mat) return
    const ud = mat.userData
    if (ud.uTime !== undefined) {
      ud.uTime += delta
      ud.uPlayer.copy(stats.pos)
    }
  })

  return (
    <mesh geometry={geo} receiveShadow={shadows}>
      <meshStandardMaterial
        ref={matRef}
        map={grass}
        bumpMap={bump}
        bumpScale={0.6}
        vertexColors
        roughness={0.95}
        metalness={0}
        onBeforeCompile={(shader) => {
          // store uniforms on userData so useFrame can mutate them via ref
          matRef.current.userData.uTime = 0
          matRef.current.userData.uPlayer = new THREE.Vector3()
          shader.uniforms.uTime = {
            get value() {
              return matRef.current.userData.uTime
            },
            set value(v) {
              matRef.current.userData.uTime = v
            },
          }
          shader.uniforms.uPlayer = {
            get value() {
              return matRef.current.userData.uPlayer
            },
            set value(v) {
              matRef.current.userData.uPlayer = v
            },
          }
          shader.vertexShader = shader.vertexShader
            .replace(
              'void main() {',
              /* glsl */ `
              uniform float uTime;
              uniform vec3 uPlayer;
              void main() {
            `,
            )
            .replace(
              '#include <begin_vertex>',
              /* glsl */ `
              vec3 transformed = vec3(position);
              // wind sway on flat-ish areas near the player (fake grass motion)
              float distToPlayer = distance(position.xz, uPlayer.xz);
              float prox = 1.0 - smoothstep(20.0, 55.0, distToPlayer);
              float wind = sin(uTime * 1.4 + position.x * 0.3 + position.z * 0.25);
              float wind2 = sin(uTime * 2.2 + position.z * 0.4);
              transformed.x += wind * 0.06 * prox;
              transformed.z += wind2 * 0.05 * prox;
            `,
            )
        }}
      />
    </mesh>
  )
}

export function WaterHole() {
  const ref = useRef<THREE.Mesh>(null!)
  const { clock, scene, gl } = useThree()
  const cubecam = useRef<THREE.CubeCamera | null>(null)

  useFrame(() => {
    const t = clock.elapsedTime
    const mesh = ref.current
    if (mesh) {
      mesh.userData.uTime = t
    }
    // update cube reflection occasionally (every 4 frames for perf)
    if (cubecam.current && mesh && Math.floor(t * 60) % 4 === 0) {
      const vis = mesh.visible
      mesh.visible = false
      cubecam.current.update(gl, scene)
      mesh.visible = vis
      if (!mesh.userData.uEnvMap) {
        mesh.userData.uEnvMap = cubecam.current.renderTarget.texture
      }
    }
  })

  return (
    <>
      <cubeCamera
        ref={(el) => {
          if (el && !cubecam.current) {
            cubecam.current = el
          }
        }}
        args={[
          0.1,
          1000,
          new THREE.WebGLCubeRenderTarget(256, {
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
            type: THREE.HalfFloatType,
          }),
        ]}
        position={[70, WATER_LEVEL + 0.5, 70]}
      />
      <mesh
        ref={ref}
        position={[70, WATER_LEVEL + 0.05, 70]}
        rotation={[-Math.PI / 2, 0, 0]}
        userData={{ uTime: 0, uEnvMap: null as THREE.CubeTexture | null }}
      >
        <circleGeometry args={[22, 48]} />
        <shaderMaterial
          uniforms={{
            uTime: {
              get value() {
                return ref.current?.userData.uTime ?? 0
              },
              set value(v) {
                if (ref.current) ref.current.userData.uTime = v
              },
            },
            uEnvMap: {
              get value() {
                return ref.current?.userData.uEnvMap ?? null
              },
              set value(v) {
                if (ref.current) ref.current.userData.uEnvMap = v
              },
            },
          }}
          vertexShader={/* glsl */ `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
              vUv = uv;
              vec4 wp = modelMatrix * vec4(position, 1.0);
              vWorldPos = wp.xyz;
              gl_Position = projectionMatrix * viewMatrix * wp;
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uTime;
            uniform samplerCube uEnvMap;
            varying vec2 vUv;
            varying vec3 vWorldPos;
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p){
              vec2 i = floor(p), f = fract(p);
              float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
              vec2 u = f*f*(3.0-2.0*f);
              return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
            }
            void main() {
              vec2 uv = vUv * 14.0;
              float n1 = noise(uv + uTime * 0.3);
              float n2 = noise(uv * 2.0 - uTime * 0.5);
              vec2 ripple = vec2(n1 - 0.5, n2 - 0.5) * 0.3;
              vec3 viewDir = normalize(cameraPosition - vWorldPos);
              vec3 normal = normalize(vec3(ripple.x, 1.0, ripple.y));
              vec3 refl = reflect(-viewDir, normal);
              vec3 reflColor = textureCube(uEnvMap, refl).rgb;
              vec3 deep = vec3(0.18, 0.32, 0.45);
              vec3 shallow = vec3(0.35, 0.55, 0.68);
              float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
              vec3 water = mix(deep, shallow, 0.4);
              vec3 col = mix(water, reflColor, 0.4 + fresnel * 0.5);
              float spec = pow(max(dot(reflect(-viewDir, normal), normalize(vec3(0.5, 0.8, 0.3))), 0.0), 32.0);
              col += spec * 0.4;
              gl_FragColor = vec4(col, 0.92);
            }
          `}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  )
}

/** A flat dirt clearing at spawn so players start on solid ground. */
export function SpawnClearing() {
  return (
    <mesh
      position={[0, 0.06, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <circleGeometry args={[7, 40]} />
      <meshStandardMaterial color="#b69a5c" roughness={1} />
    </mesh>
  )
}
