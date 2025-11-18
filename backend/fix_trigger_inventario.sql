-- ============================================
-- CORREGIR TRIGGER DE DESCUENTO DE INVENTARIO
-- Problema: Referencias ambiguas a 'cantidad' en procedimientos
-- Solución: Usar m.cantidad y mt.cantidad explícitamente
-- ============================================

-- Solo necesitamos reemplazar la función, no el trigger
CREATE OR REPLACE FUNCTION descontar_inventario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo = 'medicamento' THEN
        UPDATE medicamentos
        SET cantidad = cantidad - NEW.cantidad
        WHERE id = NEW.id_insumo;
        
    ELSIF NEW.tipo = 'material' THEN
        UPDATE mat_triage
        SET cantidad = cantidad - NEW.cantidad
        WHERE id = NEW.id_insumo;
    
    ELSIF NEW.tipo = 'mat_general' THEN
        UPDATE mat_general
        SET cantidad = cantidad - NEW.cantidad
        WHERE id = NEW.id_insumo;
        
    ELSIF NEW.tipo = 'procedimiento' THEN
        -- ✅ CORREGIDO: Descontar insumos del procedimiento con m.cantidad y mt.cantidad explícitos
        UPDATE medicamentos m
        SET cantidad = m.cantidad - (pi.cantidad * NEW.cantidad)
        FROM procedimiento_insumos pi
        WHERE pi.id_procedimiento = NEW.id_insumo
        AND pi.tipo = 'medicamento'
        AND pi.id_insumo = m.id;
        
        UPDATE mat_triage mt
        SET cantidad = mt.cantidad - (pi.cantidad * NEW.cantidad)
        FROM procedimiento_insumos pi
        WHERE pi.id_procedimiento = NEW.id_insumo
        AND pi.tipo = 'material'
        AND pi.id_insumo = mt.id;
        
        UPDATE mat_general mg
        SET cantidad = mg.cantidad - (pi.cantidad * NEW.cantidad)
        FROM procedimiento_insumos pi
        WHERE pi.id_procedimiento = NEW.id_insumo
        AND pi.tipo = 'mat_general'
        AND pi.id_insumo = mg.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esto para confirmar que el trigger está activo:
-- SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = 'consulta_insumos'::regclass;
