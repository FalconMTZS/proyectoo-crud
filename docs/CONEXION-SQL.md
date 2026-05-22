# Conectar la app a tu instancia de SQL Server

Tu servidor en SSMS es **`F41C0N\MSSQLSERVER1`**. La API usa ese nombre en `server/.env`.

## 1. Crear la base en SSMS

Ejecuta todo el script: `database/EstacionaTEC.sql`.

## 2. Configurar `server/.env`

Ajusta solo si tu caso es distinto:

```env
PORT=3000
DB_SERVER=F41C0N\MSSQLSERVER1
DB_DATABASE=EstacionaTEC
DB_TRUSTED_CONNECTION=true
```

- **`DB_TRUSTED_CONNECTION=true`**: misma autenticación **Windows** que en SSMS. La API usa el driver `msnodesqlv8` para eso.
- Si usas **usuario y contraseña SQL** (`sa`, etc.), pon `DB_TRUSTED_CONNECTION=false` y define `DB_USER` y `DB_PASSWORD` (ver `server/.env.example`).

### Si ves: "The requested instance was not available"

En instancias con nombre (`\MSSQLSERVER1`) hace falta el **SQL Server Browser** o el **puerto TCP**:

1. Abre **Administrador de configuración de SQL Server** → **SQL Server Network Configuration** → **Protocols for MSSQLSERVER1** → habilita **TCP/IP** y reinicia el servicio de esa instancia.
2. En **SQL Server Browser** → pon el servicio en **Iniciar** y **Automático** (o averigua el **puerto dinámico** de TCP/IP y úsalo abajo).

Opción sin SQL Browser: en `server/.env` usa máquina + puerto:

```env
DB_SERVER=F41C0N
DB_PORT=1433
```

(Sustituye `1433` por el puerto que ves en las propiedades de TCP/IP de tu instancia.)

## 3. Arrancar la API

```powershell
cd server
npm install
npm run dev
```

Comprueba en el navegador o en Postman: **GET** `http://localhost:3000/api/health`  
Debe responder algo como: `{"ok":true,"database":"EstacionaTEC"}`.

## 4. Arrancar Angular

En otra terminal, desde la raíz del proyecto:

```powershell
npm start
```

Abre `http://localhost:4200`. El proxy envía `/api` a `http://localhost:3000`.

## Postman: ¿sirve?

Sí. Postman es útil para:

| Método | URL | Uso |
|--------|-----|-----|
| GET | `http://localhost:3000/api/health` | ¿La API llega a SQL? |
| POST | `http://localhost:3000/api/auth/login` | Body JSON: `{"usuario":"alumno","password":"alumno"}` |
| GET | `http://localhost:3000/api/cuentas` | Listar usuarios |
| GET | `http://localhost:3000/api/lugares` | Cajones |

Así confirmas la base **antes** de depender del navegador.
