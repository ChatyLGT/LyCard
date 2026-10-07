ALTER TABLE "Program" ADD COLUMN "isRoot" BOOLEAN NOT NULL DEFAULT false;

-- La única raíz real hoy es "legacy" -- la marcamos de una vez para que
-- el código deje de depender de slug === "legacy" hardcodeado.
UPDATE "Program" SET "isRoot" = true WHERE "slug" = 'legacy';

-- Garantía a nivel DB de que nunca puede existir una segunda raíz, sea
-- por bug de código o por alguien tocando la base a mano. Índice único
-- parcial sobre una expresión constante filtrada por isRoot = true: solo
-- puede haber una fila que matchee el filtro.
CREATE UNIQUE INDEX "Program_isRoot_unique" ON "Program" ((true)) WHERE "isRoot" = true;
