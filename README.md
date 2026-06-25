# MediChain

Aplicación descentralizada (dApp) para la gestión de la historia clínica digital de un paciente. Permite que pacientes, médicos, laboratorios e instituciones interactúen sobre una base de confianza verificable en blockchain, manteniendo los datos sensibles (archivos, diagnósticos, texto de recetas) fuera de la cadena por motivos de privacidad y costo.

La integridad de cada documento queda anclada on-chain mediante su hash, mientras que el archivo en sí se almacena off-chain en la base de datos. El estado de los usuarios, los permisos de acceso y el ciclo de vida de las recetas viven en los smart contracts, que son la fuente de verdad del sistema.

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnologico)
- [Contratos desplegados (Sepolia)](#contratos-desplegados-sepolia)
- [Requisitos previos](#requisitos-previos)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Puesta en marcha local](#puesta-en-marcha-local)
  - [1. Contratos](#1-contratos)
  - [2. Base de datos](#2-base-de-datos)
  - [3. Backend](#3-backend)
  - [4. Frontend](#4-frontend)
- [Testing](#testing)
- [Despliegue y verificacion de contratos](#despliegue-y-verificacion-de-contratos)
- [Modelo de roles y flujos principales](#modelo-de-roles-y-flujos-principales)
- [API del backend](#api-del-backend)
- [Variables de entorno](#variables-de-entorno)

## Arquitectura

El sistema se compone de tres capas:

- **Capa on-chain (`contracts/`):** smart contracts en Solidity que definen los usuarios, los documentos médicos, los permisos de acceso y las recetas. Son la fuente de verdad sobre quién puede hacer qué.
- **Capa de backend (`web/back/`):** API REST en NestJS con persistencia off-chain en PostgreSQL (vía Prisma). Guarda lo que no debe o no conviene vivir en la cadena: archivos, metadata privada, diagnósticos, texto de recetas y firmas EIP-712 pendientes. Maneja la autenticación por firma de wallet.
- **Capa de frontend (`web/front/`):** SPA en React + Vite que se conecta a MetaMask y se comunica con los contratos mediante Ethers.js y con el backend mediante su API REST.

```
Usuario (MetaMask)
        |
        v
  Frontend (React + Vite + Ethers.js)
    |                         |
    | lecturas/escrituras     | datos off-chain
    | on-chain                | (archivos, metadata)
    v                         v
 Smart Contracts          Backend (NestJS)
 (Sepolia)                     |
                               v
                          PostgreSQL (Prisma)
```

### Contratos

- **`UserRegistry`** — Registro de usuarios y roles (paciente, médico, laboratorio, institución). Los pacientes se autoaprueban; los profesionales quedan en estado `PENDING` hasta que el admin los aprueba. Hereda de `Ownable` (OpenZeppelin).
- **`MedicalDocumentRegistry`** — Registro de documentos médicos. Ancla el hash del archivo on-chain con una referencia off-chain. Soporta registro directo por un emisor verificado, registro de documentos firmados off-chain por un médico (EIP-712, para que el médico no pague gas), subida propia del paciente, revocación y verificación de integridad. Usa `EIP712` y `ECDSA` de OpenZeppelin.
- **`PermissionManager`** — Gestión de permisos de acceso a documentos. El paciente otorga o revoca acceso global o por documento a una dirección concreta.
- **`PrescriptionManager`** — Ciclo de vida de las recetas: el paciente la solicita, el médico la acepta/rechaza y la emite, registrando automáticamente el documento resultante en el `MedicalDocumentRegistry`.

Los cuatro contratos contienen lógica de negocio propia y custom; OpenZeppelin se usa para los componentes estándar (control de acceso y criptografía de firmas).

## Stack tecnológico

| Capa      | Tecnologías                                                        |
|-----------|--------------------------------------------------------------------|
| On-chain  | Solidity 0.8.28, Hardhat, OpenZeppelin, Ethers.js                  |
| Backend   | NestJS 10, Prisma 6, PostgreSQL, JWT (auth por firma de wallet)    |
| Frontend  | React 19, Vite 6, React Router 7, Ethers.js 6                      |
| Red       | Ethereum Sepolia (testnet)                                         |

## Contratos desplegados (Sepolia)

Chain ID: `11155111`

| Contrato              | Dirección                                    |
|-----------------------|----------------------------------------------|
| UserRegistry          | `0x41f47C76E225bE9f24059099d79a3962c287a000` |
| MedicalDocumentRegistry | `0x9CFcfF7fac902802699937eACdcA62b7d5EcC8bc` |
| PermissionManager     | `0xafF859acC4C97bF8EB3d94061Fafa988E20Bd75C` |
| PrescriptionManager   | `0xa56131474101dBf764d59DB99fA4EC9fB27e12aA` |

## Requisitos previos

- Node.js 20+ (probado con v22)
- npm
- Docker y Docker Compose (para la base de datos local)
- MetaMask en el navegador, configurada en la red Sepolia con algo de ETH de testnet

## Estructura del repositorio

```
.
├── contracts/            # Smart contracts (Hardhat)
│   ├── contracts/        # Código Solidity
│   │   ├── registry/     # UserRegistry, MedicalDocumentRegistry
│   │   └── manager/      # PermissionManager, PrescriptionManager
│   ├── test/             # Tests de los contratos
│   └── scripts/          # deploy.ts, demo.ts, deployed.json
├── web/
│   ├── back/             # API NestJS + Prisma
│   └── front/            # SPA React + Vite
└── docker-compose.yml    # PostgreSQL para desarrollo local
```

## Puesta en marcha local

Cloná el repositorio y seguí los pasos en orden. Cada capa tiene su propio archivo `.env` que se crea a partir del `.env.example` correspondiente.

```bash
git clone <url-del-repo>
cd tp2-bc
```

### 1. Contratos

```bash
cd contracts
npm install
cp .env.example .env      
npm run compile
```

Los contratos ya están desplegados en Sepolia (ver tabla de arriba), así que para correr la app localmente no hace falta volver a desplegar. Si querés desplegar tu propia instancia, ver [Despliegue y verificacion de contratos](#despliegue-y-verificacion-de-contratos).

### 2. Base de datos

Desde la raíz del repositorio, levantá PostgreSQL con Docker:

```bash
docker compose up -d
```

Esto expone PostgreSQL en `localhost:5433` con usuario, contraseña y base `medichain`.

### 3. Backend

```bash
cd web/back
npm install
cp .env.example .env      
npm run db:generate       
npm run db:migrate        
npm run dev               
```

La API queda corriendo en `http://localhost:3001` con prefijo global `/api`.

### 4. Frontend

```bash
cd web/front
npm install
cp .env.example .env       
npm run dev
```

El frontend queda disponible en `http://localhost:5173`. Para usar los contratos ya desplegados, completá el `.env` con las direcciones de la tabla de [Contratos desplegados](#contratos-desplegados-sepolia) y un `VITE_RPC_URL` de Sepolia (por ejemplo de Alchemy o Infura).

## Testing

Los smart contracts cuentan con una suite de tests completa (114 tests) que cubre cada contrato y sus casos de error.

```bash
cd contracts
npm test
```

## Despliegue y verificacion de contratos

Para desplegar en Sepolia necesitás completar en `contracts/.env`:

- `SEPOLIA_RPC_URL` — endpoint RPC de Sepolia (Alchemy, Infura, etc.)
- `PRIVATE_KEY` — clave privada de la wallet que despliega (sin el prefijo `0x`)

Desplegar:

```bash
cd contracts
npm run deploy:sepolia
```

El script despliega los cuatro contratos, conecta el `PrescriptionManager` como `authorizedCaller` del `MedicalDocumentRegistry`, guarda las direcciones en `scripts/deployed.json` e imprime los comandos de verificación.

Verificar en Etherscan (requiere `ETHERSCAN_API_KEY` en el `.env`):

```bash
npx hardhat verify --network sepolia <userRegistry>
npx hardhat verify --network sepolia <docRegistry> <userRegistry>
npx hardhat verify --network sepolia <permissionManager> <docRegistry> <userRegistry>
npx hardhat verify --network sepolia <prescriptionManager> <userRegistry> <docRegistry>
```

## Despliegue en produccion (Railway + Vercel)

La arquitectura de hosting es:

- **Backend (NestJS) + PostgreSQL:** Railway. El backend corre como un servidor Node normal (sin límite de tamaño de request), por lo que la subida de archivos funciona sin cambios.
- **Frontend (Vite):** Vercel.

Los contratos ya están desplegados en Sepolia, así que esa capa no requiere acción.

### 1. Backend y base de datos en Railway

1. Crear un proyecto en Railway y agregar un servicio **PostgreSQL** (Railway expone su cadena de conexión como `DATABASE_URL`).
2. Agregar un servicio desde el repositorio de GitHub y configurar como **Root Directory** la carpeta `web/back`. Railway detecta el `railway.json`, que define:
   - Build: `npm run build`
   - Start: `npx prisma migrate deploy && node dist/main` (aplica las migraciones y arranca la API)
3. Configurar las variables de entorno del servicio:
   - `DATABASE_URL` — referenciar la del servicio de PostgreSQL (Railway permite enlazarla con `${{Postgres.DATABASE_URL}}`).
   - `JWT_SECRET` — un secreto fuerte para firmar los JWT.
   - `FRONT_URL` — el dominio de producción de Vercel (se completa después del paso 2). Acepta varios separados por coma.
   - `PORT` — Railway lo inyecta automáticamente; no hace falta setearlo.
4. Una vez desplegado, Railway te da una URL pública (ej: `https://medichain-back.up.railway.app`). Esa es la base de la API.

### 2. Frontend en Vercel

1. Importar el repositorio en Vercel y configurar como **Root Directory** la carpeta `web/front`. Vercel detecta Vite y usa el `vercel.json` incluido (build `npm run build`, output `dist`, y un rewrite para que el ruteo de la SPA funcione al recargar).
2. Configurar las variables de entorno del proyecto (mismas claves `VITE_*` que en local):
   - `VITE_API_URL` — la URL pública del backend en Railway, **sin** `/api` al final (ej: `https://medichain-back.up.railway.app`).
   - `VITE_CHAIN_ID`, `VITE_RPC_URL` y las cuatro direcciones de contratos (`VITE_USER_REGISTRY_ADDRESS`, `VITE_DOCUMENT_REGISTRY_ADDRESS`, `VITE_PERMISSION_MANAGER_ADDRESS`, `VITE_PRESCRIPTION_MANAGER_ADDRESS`), más `VITE_ADMIN_ADDRESS`.
3. Deployar. Vercel te da un dominio (ej: `https://medichain.vercel.app`).

### 3. Conectar las dos puntas

1. Copiar el dominio de Vercel y setearlo como `FRONT_URL` en Railway (para que el CORS del backend lo acepte). Si querés permitir también las URLs de preview de Vercel, agregalas separadas por coma.
2. Redeployar el backend para que tome el nuevo `FRONT_URL`.

> Nota sobre `VITE_API_URL`: el frontend arma las rutas como `VITE_API_URL` + `/api/...`. Por eso la variable debe ser la raíz del backend, sin incluir `/api`.

## Modelo de roles y flujos principales

**Roles:** Paciente, Médico, Laboratorio, Institución y Administrador (el owner de los contratos).

- **Paciente** — Se registra y queda aprobado automáticamente. Puede subir sus propios documentos, solicitar recetas a médicos verificados, registrar on-chain documentos firmados por un médico, y otorgar o revocar acceso a sus documentos.
- **Médico / Laboratorio / Institución** — Se registran como profesionales y quedan pendientes hasta que el admin los aprueba. Una vez aprobados pueden emitir documentos verificados, firmar estudios off-chain (EIP-712) y gestionar recetas.
- **Administrador** — Aprueba, rechaza o revoca a los profesionales.

**Flujo de firma sin gas (EIP-712):** un médico firma un documento off-chain (no paga gas), el backend guarda el archivo y la firma, y el paciente registra el documento on-chain cuando lo desea, pagando él la transacción.

**Flujo de recetas:** el paciente solicita una receta a un médico verificado → el médico la acepta o rechaza → al emitirla, el `PrescriptionManager` registra automáticamente el documento en el historial del paciente.

## API del backend

Todas las rutas tienen el prefijo `/api`. La autenticación se hace por firma de wallet: el front pide un nonce, el usuario lo firma con MetaMask y el backend devuelve un JWT.

| Módulo            | Endpoints principales                                                        |
|-------------------|------------------------------------------------------------------------------|
| `auth`            | `GET /auth/nonce/:wallet`, `POST /auth/verify`, `GET /auth/me`, `PUT /auth/profile`, `GET /auth/users`, `GET /auth/profile/:wallet` |
| `documents`       | `GET /documents`, `GET /documents/:id`, `GET /documents/:id/file`, `POST /documents`, `PUT /documents/:id/diagnosis` |
| `signed-documents`| `POST /signed-documents`, `GET /signed-documents`, `GET /signed-documents/:id/file`, `POST /signed-documents/:id/register` |
| `prescriptions`   | `POST /prescriptions`, `GET /prescriptions`                                  |
| `permissions`     | `GET /permissions/:patientAddress`, `GET /permissions/shared`, `POST /permissions`, `DELETE /permissions`, `POST /permissions/doctor`, `DELETE /permissions/doctor` |
| `laboratory`      | `GET /laboratory/studies`, `POST /laboratory/studies`                        |
| `upload`          | `POST /upload`                                                               |

## Variables de entorno

**`contracts/.env`**

| Variable           | Descripción                                  |
|--------------------|----------------------------------------------|
| `SEPOLIA_RPC_URL`  | Endpoint RPC de Sepolia                       |
| `PRIVATE_KEY`      | Clave privada de la wallet que despliega      |
| `ETHERSCAN_API_KEY`| API key para verificar contratos             |

**`web/back/.env`**

| Variable        | Descripción                                  |
|-----------------|----------------------------------------------|
| `DATABASE_URL`  | Cadena de conexión a PostgreSQL              |
| `JWT_SECRET`    | Secreto para firmar los JWT                   |
| `FRONT_URL`     | Origen permitido por CORS                      |
| `PORT`          | Puerto de la API (por defecto 3001)           |

**`web/front/.env`**

| Variable                            | Descripción                              |
|-------------------------------------|------------------------------------------|
| `VITE_CHAIN_ID`                     | Chain ID de la red (11155111 = Sepolia)  |
| `VITE_RPC_URL`                      | Endpoint RPC de Sepolia                   |
| `VITE_USER_REGISTRY_ADDRESS`        | Dirección del contrato UserRegistry       |
| `VITE_DOCUMENT_REGISTRY_ADDRESS`    | Dirección del contrato MedicalDocumentRegistry |
| `VITE_PERMISSION_MANAGER_ADDRESS`   | Dirección del contrato PermissionManager  |
| `VITE_PRESCRIPTION_MANAGER_ADDRESS` | Dirección del contrato PrescriptionManager |
| `VITE_API_URL`                      | URL base del backend                      |
| `VITE_ADMIN_ADDRESS`                | Dirección del administrador               |

> Nota: ningún archivo `.env` debe subirse al repositorio. Usá siempre los `.env.example` como plantilla y mantené las claves reales fuera del control de versiones.
