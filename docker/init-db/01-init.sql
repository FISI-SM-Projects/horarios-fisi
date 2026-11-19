-- Inicialización de base de datos para pruebas locales
SELECT 'CREATE DATABASE horarios_fisi_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'horarios_fisi_test')\gexec
