-- Migración 012: Ampliar tabla valuations para incluir NOI estabilizado y precio de compra implícito
-- Estos campos se calculan en el backend pero no se estaban guardando en la BD

ALTER TABLE valuations
  ADD COLUMN noi_estabilizado        DECIMAL(18,2) NULL AFTER valor_salida_neto,
  ADD COLUMN precio_compra_implicito DECIMAL(18,2) NULL AFTER noi_estabilizado,
  ADD COLUMN discount_rate           DECIMAL(8,6) NULL AFTER precio_compra_implicito;

-- Comentario: Los valores NULL se actualizarán cuando el usuario recalcule la valoración
