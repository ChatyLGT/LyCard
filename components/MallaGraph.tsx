"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MallaEdge, MallaGhost, MallaNode } from "@/lib/mallaData";

// Grafo 3D navegable — "La Malla" (PLAN.md Fase 12-B). Motor propio en
// three.js puro (sin 3d-force-graph todavía, ver Fase 12-G: la librería
// queda decidida para cuando esto necesite escalar a miles de nodos reales;
// a la escala actual, ~25 nodos hardcodeados, este motor a mano alcanza y
// evita sumar una dependencia grande). Física: repulsión entre todos los
// nodos + resorte en cada enlace + jalón hacia un nodo "fantasma" invisible
// por cluster (para agrupar por Programa/Corp sin pelear contra la física).
//
// Nunca corre en el servidor (usa WebGL/window) — siempre se importa vía
// next/dynamic(..., { ssr: false }).

type PhysicsNode = MallaNode & {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  mesh: THREE.Mesh;
  halo: THREE.Sprite;
};

export type MallaGraphProps = {
  nodes: MallaNode[];
  edges: MallaEdge[];
  ghosts?: Record<string, MallaGhost>;
  height?: number;
  camRadius?: number;
  maxRadius?: number;
  repel?: number;
  linkRest?: number;
  fog?: number;
  haloScale?: number;
  className?: string;
  onSelect?: (nodeId: string | null) => void;
};

export default function MallaGraph({
  nodes: nodeDefs,
  edges,
  ghosts = {},
  height = 220,
  camRadius = 200,
  maxRadius = 460,
  repel = 200,
  linkRest = 26,
  fog = 0.008,
  haloScale = 7,
  className,
  onSelect,
}: MallaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes: PhysicsNode[] = nodeDefs.map((def) => {
      const g = ghosts[def.ghost ?? ""] ?? { x: 0, y: 0, z: 0 };
      return {
        ...def,
        x: g.x + (Math.random() - 0.5) * 24,
        y: g.y + (Math.random() - 0.5) * 24,
        z: g.z + (Math.random() - 0.5) * 24,
        vx: 0, vy: 0, vz: 0,
        mesh: null as unknown as THREE.Mesh,
        halo: null as unknown as THREE.Sprite,
      };
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edgePairs = edges
      .map(([a, b]) => [byId.get(a), byId.get(b)] as const)
      .filter((pair): pair is [PhysicsNode, PhysicsNode] => !!pair[0] && !!pair[1]);
    const neighbors = new Map<string, string[]>();
    nodes.forEach((n) => neighbors.set(n.id, []));
    edgePairs.forEach(([a, b]) => {
      neighbors.get(a.id)!.push(b.id);
      neighbors.get(b.id)!.push(a.id);
    });

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0b0a, fog);
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 2000);
    const camTarget = new THREE.Vector3(0, 0, 0);
    let radius = camRadius;
    let theta = 0.5;
    let phi = 1.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const dom = renderer.domElement;
    dom.style.display = "block";
    dom.style.width = "100%";
    dom.style.height = "100%";
    dom.style.touchAction = "none";
    container.appendChild(dom);

    function resize() {
      const w = container!.clientWidth, h = container!.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    const geo = new THREE.SphereGeometry(1, 14, 14);
    nodes.forEach((n) => {
      const color = new THREE.Color(n.color).getHex();
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: n.dim ? 0.55 : 0.95 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(n.size);
      scene.add(mesh);
      n.mesh = mesh;

      const haloMat = new THREE.SpriteMaterial({
        color: new THREE.Color(n.haloColor ?? n.color).getHex(),
        transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.setScalar(n.size * haloScale);
      scene.add(halo);
      n.halo = halo;
    });

    const lineMat = new THREE.LineBasicMaterial({ color: 0xc8a15a, transparent: true, opacity: 0.2 });
    const linePositions = new Float32Array(edgePairs.length * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    function step() {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y, dz = n.z - m.z;
          const d2 = dx * dx + dy * dy + dz * dz + 0.01;
          const d = Math.sqrt(d2);
          const f = repel / d2;
          const ux = dx / d, uy = dy / d, uz = dz / d;
          n.vx += ux * f; n.vy += uy * f; n.vz += uz * f;
          m.vx -= ux * f; m.vy -= uy * f; m.vz -= uz * f;
        }
      }
      edgePairs.forEach(([a, b]) => {
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
        const f = (d - linkRest) * 0.02;
        const ux = dx / d, uy = dy / d, uz = dz / d;
        a.vx += ux * f; a.vy += uy * f; a.vz += uz * f;
        b.vx -= ux * f; b.vy -= uy * f; b.vz -= uz * f;
      });
      nodes.forEach((n) => {
        const g = ghosts[n.ghost ?? ""];
        if (!g) return;
        n.vx += (g.x - n.x) * 0.0028;
        n.vy += (g.y - n.y) * 0.0028;
        n.vz += (g.z - n.z) * 0.0028;
      });
      nodes.forEach((n) => {
        n.vx *= 0.82; n.vy *= 0.82; n.vz *= 0.82;
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
        n.mesh.position.set(n.x, n.y, n.z);
        n.halo.position.set(n.x, n.y, n.z);
      });
      const arr = lineGeo.attributes.position.array as Float32Array;
      edgePairs.forEach(([a, b], idx) => {
        arr[idx * 6 + 0] = a.x; arr[idx * 6 + 1] = a.y; arr[idx * 6 + 2] = a.z;
        arr[idx * 6 + 3] = b.x; arr[idx * 6 + 4] = b.y; arr[idx * 6 + 5] = b.z;
      });
      lineGeo.attributes.position.needsUpdate = true;
    }

    let dragging = false, lastX = 0, lastY = 0, pinchDist = 0, moved = false;
    function pointerDown(x: number, y: number) { dragging = true; lastX = x; lastY = y; moved = false; }
    function pointerMove(x: number, y: number) {
      if (!dragging) return;
      const dx = x - lastX, dy = y - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      theta -= dx * 0.007;
      phi = Math.max(0.35, Math.min(Math.PI - 0.35, phi - dy * 0.007));
      lastX = x; lastY = y;
    }
    function touchDist(t: TouchList) {
      const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    function selectNode(n: PhysicsNode | null) {
      const connected = new Set<string>();
      if (n) { connected.add(n.id); neighbors.get(n.id)!.forEach((id) => connected.add(id)); }
      nodes.forEach((m) => {
        const dim = !!n && !connected.has(m.id);
        (m.mesh.material as THREE.MeshBasicMaterial).opacity = dim ? 0.12 : (m.dim ? 0.55 : 0.95);
        (m.halo.material as THREE.SpriteMaterial).opacity = dim ? 0.04 : 0.18;
      });
      lineMat.opacity = n ? 0.06 : 0.2;
      onSelect?.(n ? n.id : null);
    }
    function pickAt(clientX: number, clientY: number) {
      const rect = dom.getBoundingClientRect();
      mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObjects(nodes.map((n) => n.mesh));
      selectNode(hits.length ? (hits[0].object.userData.nodeId ? byId.get(hits[0].object.userData.nodeId) ?? null : null) : null);
    }
    nodes.forEach((n) => { n.mesh.userData.nodeId = n.id; });

    const onMouseDown = (e: MouseEvent) => pointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => pointerMove(e.clientX, e.clientY);
    const onMouseUp = (e: MouseEvent) => { if (dragging && !moved) pickAt(e.clientX, e.clientY); dragging = false; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); radius = Math.max(50, Math.min(maxRadius, radius + e.deltaY * 0.3)); };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) pointerDown(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) pinchDist = touchDist(e.touches);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) pointerMove(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) {
        const d = touchDist(e.touches);
        radius = Math.max(50, Math.min(maxRadius, radius - (d - pinchDist) * 0.5));
        pinchDist = d;
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!moved && e.changedTouches.length === 1) pickAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      dragging = false;
    };

    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("touchstart", onTouchStart, { passive: true });
    dom.addEventListener("touchmove", onTouchMove, { passive: true });
    dom.addEventListener("touchend", onTouchEnd, { passive: true });

    function updateCamera() {
      camera.position.set(
        camTarget.x + radius * Math.sin(phi) * Math.sin(theta),
        camTarget.y + radius * Math.cos(phi),
        camTarget.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(camTarget);
    }

    resize();
    window.addEventListener("resize", resize);
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let settleFrames = 0;
    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      if (settleFrames < 220) { step(); settleFrames++; }
      updateCamera();
      renderer.render(scene, camera);
    }
    animate();
    const resizeTimeout = setTimeout(resize, 50);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      ro.disconnect();
      dom.removeEventListener("mousedown", onMouseDown);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("touchstart", onTouchStart);
      dom.removeEventListener("touchmove", onTouchMove);
      dom.removeEventListener("touchend", onTouchEnd);
      nodes.forEach((n) => {
        (n.mesh.material as THREE.MeshBasicMaterial).dispose();
        (n.halo.material as THREE.SpriteMaterial).dispose();
      });
      geo.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (dom.parentNode === container) container!.removeChild(dom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} style={{ width: "100%", height, position: "relative" }} />;
}
