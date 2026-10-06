-- Editor de Modales -- Unificación completa (2026-10-06): un solo
-- Program.modalBlocks (Record<ModalKey, ModalBlock[]>) reemplaza las
-- columnas separadas vaultBlocks/cardInfoBlocks, para poder agregar
-- bloques a cualquier modal (empezando por "info") sin otra migración.

ALTER TABLE "Program" ADD COLUMN "modalBlocks" JSONB NOT NULL DEFAULT '{}';

-- Backfill: lo que ya existía en vaultBlocks/cardInfoBlocks se copia
-- al mapa nuevo bajo su clave de modal ("vault"/"cardInfo"), solo
-- donde había contenido real (array no vacío).
UPDATE "Program"
SET "modalBlocks" =
  (CASE WHEN "vaultBlocks" IS NOT NULL AND jsonb_array_length("vaultBlocks") > 0
        THEN jsonb_build_object('vault', "vaultBlocks")
        ELSE '{}'::jsonb END)
  ||
  (CASE WHEN "cardInfoBlocks" IS NOT NULL AND jsonb_array_length("cardInfoBlocks") > 0
        THEN jsonb_build_object('cardInfo', "cardInfoBlocks")
        ELSE '{}'::jsonb END)
WHERE ("vaultBlocks" IS NOT NULL AND jsonb_array_length("vaultBlocks") > 0)
   OR ("cardInfoBlocks" IS NOT NULL AND jsonb_array_length("cardInfoBlocks") > 0);

ALTER TABLE "Program" DROP COLUMN "vaultBlocks";
ALTER TABLE "Program" DROP COLUMN "cardInfoBlocks";
