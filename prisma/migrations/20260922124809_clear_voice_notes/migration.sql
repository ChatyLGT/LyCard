-- Pedido explícito de Gunnar (2026-09-23): la nota de prueba dio error
-- de transcripción y prefiere arrancar la Skill "Notas de Voz" desde
-- cero en vez de dejar esa nota (y cualquier otra de prueba) dando
-- vueltas. Borra TODAS las Notas de Voz existentes, de cualquier Card —
-- hoy solo hay tráfico real de prueba, no hay usuarios en producción
-- todavía. El resto de la app no depende de que existan filas viejas
-- acá (VoiceNote es hoja, nada más cuelga de ella salvo el propio audio
-- ya subido, que queda huérfano en el storage pero no rompe nada).
DELETE FROM "VoiceNote";
