"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

// Posicionador de fotos para el dashboard (2026-10-04, pedido de Gunnar:
// "en todos los servicios que utilizamos para subir fotos.. dame la
// oportunidad de mover, posicionar, disminuir, aumentar el tamaño de la
// foto.. ahorita puse una para el programa Legacy.. se ve cortada y no
// puedo editar o modificar su posicion o tamaño.. en el dashboard no en
// la tarjeta"). Antes, cada input type="file" mandaba el archivo tal
// cual al servidor y la tarjeta/botón de Oficina recortaba el resultado
// a la fuerza con CSS (objectFit cover/contain), sin ningún control del
// dueño sobre QUÉ parte de la foto queda visible.
//
// Este componente intercepta el archivo ANTES de que el <form> nativo lo
// mande: abre un editor con arrastre (pan) + zoom sobre un marco que
// representa el recorte final, y al confirmar compone esa selección en
// un canvas y la exporta como PNG. Ese PNG reemplaza el archivo original
// en el mismo <input type="file"> (vía DataTransfer), así que el <form
// action={...}> existente sigue funcionando sin tocar ningún server
// action ni el schema -- la foto que llega al servidor YA viene bien
// encuadrada, ninguna tarjeta necesita saber que esto existe.
//
// "fit" define el comportamiento por defecto (zoom=1), igual al CSS que
// reemplaza, para que una foto ya subida se siga viendo IGUAL hasta que
// alguien la reposicione a mano:
//  - "cover"   -- la foto llena el marco sin bordes (como objectFit:cover
//                 en el retrato de la Card). No se puede alejar más allá
//                 de ese punto (dejaría franjas vacías en la tarjeta real).
//  - "contain" -- la foto completa se ve adentro del marco, con espacio
//                 alrededor si no es cuadrada (como objectFit:contain en
//                 el logo). Se puede alejar más para agregar más margen.
type Fit = "cover" | "contain";
type Aspect = "square" | "portrait";

const ASPECT_RATIO: Record<Aspect, number> = { square: 1, portrait: 4 / 5 };
const FRAME_W = 220;
const OUTPUT_SCALE = 2.4;

function frameSize(aspect: Aspect): { w: number; h: number } {
  const ratio = ASPECT_RATIO[aspect];
  return { w: FRAME_W, h: Math.round(FRAME_W / ratio) };
}

function baseScale(frameW: number, frameH: number, natW: number, natH: number, fit: Fit): number {
  const rw = frameW / natW;
  const rh = frameH / natH;
  return fit === "cover" ? Math.max(rw, rh) : Math.min(rw, rh);
}

// Si el eje dibujado es más chico que el marco, queda centrado y fijo
// (no hay de dónde arrastrar); si es más grande, el arrastre queda
// acotado para que la foto nunca se vaya del todo del marco.
function clampAxis(frameSize: number, drawSize: number, offset: number): number {
  if (drawSize <= frameSize) return (frameSize - drawSize) / 2;
  return Math.min(0, Math.max(frameSize - drawSize, offset));
}

const TRIGGER_BTN: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "9px 12px",
  borderRadius: 10,
  background: "#353534",
  color: "#F5F2EB",
  font: "600 10.5px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  cursor: "pointer",
  border: "none",
};

const SECONDARY_BTN: CSSProperties = {
  ...TRIGGER_BTN,
  background: "none",
  border: "1px solid rgba(200,161,90,.35)",
  color: "#C8A15A",
};

export default function PhotoPositioner({
  name,
  label,
  initialUrl,
  aspect,
  fit,
  previewShape,
  previewSize,
  helpText,
}: {
  name: string;
  label: string;
  initialUrl: string | null;
  aspect: Aspect;
  fit: Fit;
  previewShape: "circle" | "rounded";
  previewSize: number;
  helpText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [modalOpen, setModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [natSize, setNatSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const frame = frameSize(aspect);
  const minZoom = fit === "cover" ? 1 : 0.5;

  function openCrop(src: string) {
    setError(null);
    setCropSrc(src);
    setNatSize(null);
    setZoom(1);
    setModalOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) openCrop(URL.createObjectURL(file));
  }

  function handleReposition() {
    if (previewUrl) openCrop(previewUrl);
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatSize({ w, h });
    const scale = baseScale(frame.w, frame.h, w, h, fit);
    setOffsetX(clampAxis(frame.w, w * scale, (frame.w - w * scale) / 2));
    setOffsetY(clampAxis(frame.h, h * scale, (frame.h - h * scale) / 2));
  }

  function handleZoomChange(next: number) {
    if (!natSize) {
      setZoom(next);
      return;
    }
    const oldScale = baseScale(frame.w, frame.h, natSize.w, natSize.h, fit) * zoom;
    const newScale = baseScale(frame.w, frame.h, natSize.w, natSize.h, fit) * next;
    // Mantiene fijo el punto que está en el centro del marco al hacer
    // zoom, en vez de recentrar siempre -- si ya encuadraste una cara
    // arriba, hacer zoom no la saca de foco.
    const cxFrac = oldScale > 0 ? (frame.w / 2 - offsetX) / (natSize.w * oldScale) : 0.5;
    const cyFrac = oldScale > 0 ? (frame.h / 2 - offsetY) / (natSize.h * oldScale) : 0.5;
    const newDrawW = natSize.w * newScale;
    const newDrawH = natSize.h * newScale;
    setZoom(next);
    setOffsetX(clampAxis(frame.w, newDrawW, frame.w / 2 - cxFrac * newDrawW));
    setOffsetY(clampAxis(frame.h, newDrawH, frame.h / 2 - cyFrac * newDrawH));
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!natSize) return;
    dragRef.current = { x: e.clientX, y: e.clientY, offsetX, offsetY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !natSize) return;
    const scale = baseScale(frame.w, frame.h, natSize.w, natSize.h, fit) * zoom;
    const drawW = natSize.w * scale;
    const drawH = natSize.h * scale;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffsetX(clampAxis(frame.w, drawW, dragRef.current.offsetX + dx));
    setOffsetY(clampAxis(frame.h, drawH, dragRef.current.offsetY + dy));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleCancel() {
    if (inputRef.current) inputRef.current.value = "";
    setModalOpen(false);
    setCropSrc(null);
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !natSize) return;
    const scale = baseScale(frame.w, frame.h, natSize.w, natSize.h, fit) * zoom;
    const outW = Math.round(frame.w * OUTPUT_SCALE);
    const outH = Math.round(frame.h * OUTPUT_SCALE);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(
        img,
        offsetX * OUTPUT_SCALE,
        offsetY * OUTPUT_SCALE,
        natSize.w * scale * OUTPUT_SCALE,
        natSize.h * scale * OUTPUT_SCALE
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          setError("No se pudo generar la imagen. Probá de nuevo.");
          return;
        }
        const file = new File([blob], `${name}.png`, { type: "image/png" });
        const dt = new DataTransfer();
        dt.items.add(file);
        if (inputRef.current) inputRef.current.files = dt.files;
        setPreviewUrl(URL.createObjectURL(file));
        setModalOpen(false);
        setCropSrc(null);
      }, "image/png", 0.92);
    } catch {
      setError("No se pudo cargar esta imagen para reposicionar (puede estar bloqueada por CORS) — subí el archivo de nuevo.");
    }
  }

  const previewH = previewShape === "circle" ? previewSize : Math.round(previewSize / ASPECT_RATIO.portrait);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: previewSize,
          height: previewH,
          flex: "none",
          borderRadius: previewShape === "circle" ? 999 : 16,
          overflow: "hidden",
          background: "#0D0D0D",
          boxShadow: "0 8px 24px rgba(0,0,0,.6)",
        }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: fit }} />
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {helpText && <span style={{ font: "400 10.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#8A8680" }}>{helpText}</span>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={TRIGGER_BTN} onClick={() => inputRef.current?.click()}>
            {label}
          </button>
          {previewUrl && (
            <button type="button" style={SECONDARY_BTN} onClick={handleReposition}>
              Reposicionar
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" name={name} accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
      </div>

      {modalOpen && cropSrc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 340,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "center",
              background: "#1A1A1A",
              border: "1px solid rgba(200,161,90,.3)",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#C8A15A" }}>
              Posicionar foto
            </span>
            <div
              data-testid="photo-positioner-frame"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: "relative",
                width: frame.w,
                height: frame.h,
                overflow: "hidden",
                borderRadius: aspect === "square" ? 999 : 16,
                background: "#0D0D0D",
                border: "1px solid rgba(200,161,90,.35)",
                touchAction: "none",
                cursor: "grab",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={cropSrc}
                alt=""
                crossOrigin="anonymous"
                draggable={false}
                onLoad={handleImageLoad}
                style={{
                  position: "absolute",
                  left: offsetX,
                  top: offsetY,
                  width: natSize ? natSize.w * baseScale(frame.w, frame.h, natSize.w, natSize.h, fit) * zoom : frame.w,
                  height: natSize ? natSize.h * baseScale(frame.w, frame.h, natSize.w, natSize.h, fit) * zoom : frame.h,
                  maxWidth: "none",
                  opacity: natSize ? 1 : 0,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </div>
            <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ font: "500 9px 'Plus Jakarta Sans',sans-serif", color: "#8A8680" }}>− </span>
              <input
                type="range"
                min={minZoom}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
                disabled={!natSize}
              />
              <span style={{ font: "500 9px 'Plus Jakarta Sans',sans-serif", color: "#8A8680" }}> +</span>
            </div>
            <span style={{ font: "400 10px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>
              Arrastrá la foto para moverla, y usá el control para acercar o alejar.
            </span>
            {error && <span style={{ font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#e08a8a" }}>{error}</span>}
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button type="button" onClick={handleCancel} style={{ ...SECONDARY_BTN, flex: 1 }}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!natSize}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                  color: "#0D0D0D",
                  font: "700 10.5px 'Plus Jakarta Sans',sans-serif",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  cursor: natSize ? "pointer" : "default",
                  opacity: natSize ? 1 : 0.5,
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
