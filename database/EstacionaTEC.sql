/*
  EstacionaTEC — ejecutar en SQL Server Management Studio 22
  Conéctate a tu instancia (localhost o localhost\SQLEXPRESS) y ejecuta todo el script.
*/
IF DB_ID(N'EstacionaTEC') IS NULL
  CREATE DATABASE EstacionaTEC;
GO

USE EstacionaTEC;
GO

IF OBJECT_ID(N'dbo.Ingresos', N'U') IS NOT NULL DROP TABLE dbo.Ingresos;
IF OBJECT_ID(N'dbo.Lugares', N'U') IS NOT NULL DROP TABLE dbo.Lugares;
IF OBJECT_ID(N'dbo.Usuarios', N'U') IS NOT NULL DROP TABLE dbo.Usuarios;
GO

CREATE TABLE dbo.Usuarios (
  Id            INT IDENTITY(1,1) PRIMARY KEY,
  Usuario       NVARCHAR(80)  NOT NULL UNIQUE,
  PasswordHash  NVARCHAR(200) NOT NULL,
  Rol           NVARCHAR(20)  NOT NULL CHECK (Rol IN ('admin','docente','estudiante','guardia')),
  Acceso        NVARCHAR(200) NOT NULL,
  NombrePerfil  NVARCHAR(120) NOT NULL,
  Vehiculo      NVARCHAR(80)  NOT NULL DEFAULT N'—',
  ColorAuto     NVARCHAR(60)  NOT NULL DEFAULT N'—',
  Matricula     NVARCHAR(30)  NOT NULL DEFAULT N'—'
);
GO

CREATE TABLE dbo.Lugares (
  Id                NVARCHAR(10) PRIMARY KEY,
  Lat               FLOAT NOT NULL,
  Lng               FLOAT NOT NULL,
  OcupadoPorId      INT NULL REFERENCES dbo.Usuarios(Id) ON DELETE SET NULL,
  OcupadoPorNombre  NVARCHAR(120) NULL
);
GO

CREATE TABLE dbo.Ingresos (
  Id          INT IDENTITY(1,1) PRIMARY KEY,
  UsuarioId   INT NOT NULL REFERENCES dbo.Usuarios(Id),
  LugarId     NVARCHAR(10) NOT NULL REFERENCES dbo.Lugares(Id),
  UsuarioNombre NVARCHAR(120) NOT NULL,
  RolEtiqueta NVARCHAR(40) NOT NULL,
  FechaHora   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* Usuarios iniciales (contraseña en texto plano solo para desarrollo; la API la guarda igual) */
INSERT INTO dbo.Usuarios (Usuario, PasswordHash, Rol, Acceso, NombrePerfil, Vehiculo, ColorAuto, Matricula) VALUES
(N'admin',   N'admin',   N'admin',      N'Acceso total al sistema', N'Administrador del sistema', N'—', N'—', N'—'),
(N'profesor',N'profesor',N'docente',    N'Docente Tec',             N'Prof. Juan Pérez',          N'Nissan Sentra', N'Gris plata', N'ABC-12-34'),
(N'alumno', N'alumno',  N'estudiante', N'Estudiante activo',       N'María González',            N'Volkswagen Jetta', N'Azul marino', N'XYZ-98-76'),
(N'guardia', N'guardia', N'guardia',    N'Turno matutino',          N'Seguridad Estacionamiento', N'—', N'—', N'—');
GO

/* 12 cajones (3 filas x 4 columnas) — campus Tec */
DECLARE @baseLat FLOAT = 25.651564;
DECLARE @baseLng FLOAT = -100.289882;
DECLARE @paso FLOAT = 0.00012;
DECLARE @i INT = 0;
WHILE @i < 12
BEGIN
  DECLARE @fila INT = @i / 4;
  DECLARE @col INT = @i % 4;
  DECLARE @id NVARCHAR(10) = CONCAT(N'E-', @fila + 1, @col + 1);
  INSERT INTO dbo.Lugares (Id, Lat, Lng, OcupadoPorId, OcupadoPorNombre)
  VALUES (@id, @baseLat + @fila * @paso, @baseLng + @col * @paso, NULL, NULL);
  SET @i = @i + 1;
END
GO

PRINT N'Base EstacionaTEC lista. Usuarios y cajones creados.';
GO
