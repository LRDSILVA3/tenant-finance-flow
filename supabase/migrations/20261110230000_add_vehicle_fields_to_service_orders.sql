-- Migration: Add vehicle and mechanics specific fields to service_orders table
-- Supports auto shops / mechanics with structured plate, vehicle model, year and mileage (km)

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_year TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_km NUMERIC;

-- Create an index for ultra-fast plate lookups
CREATE INDEX IF NOT EXISTS idx_service_orders_vehicle_plate 
  ON public.service_orders(client_id, vehicle_plate);

COMMENT ON COLUMN public.service_orders.vehicle_plate IS 'Vehicle license plate for automotive mechanics / workshops';
COMMENT ON COLUMN public.service_orders.vehicle_model IS 'Vehicle brand, model, engine version (e.g. Gol 1.6, Civic EXL)';
COMMENT ON COLUMN public.service_orders.vehicle_year IS 'Vehicle manufacturing / model year (e.g. 2018/2019)';
COMMENT ON COLUMN public.service_orders.vehicle_km IS 'Vehicle odometer mileage (km) at time of maintenance';

