# Clinical Cloud — Infraestructura como Código (Terraform)

Este directorio contiene la arquitectura completa de Infraestructura como Código (IaC) para **Clinical Cloud** en **AWS (Región: `us-east-2` Ohio)**, estructurada bajo estándares modulares y almacenamiento remoto desacoplado.

---

## 1. Estructura del Directorio

```text
terraform/
├── README.md                      # Esta guía de despliegue y arquitectura
├── .gitignore                     # Exclusión de archivos .tfstate, .terraform/ y secretos
├── bootstrap/                     # Fase 0: Infraestructura del Backend Remoto
│   ├── main.tf                    # S3 Bucket (versioning, AES256, public block) + DynamoDB Table
│   ├── providers.tf               # Proveedor AWS local (sin backend remoto)
│   ├── variables.tf               # Nombres de bucket, tabla y región us-east-2
│   └── outputs.tf                 # ARNs, nombres y bloque HCL de configuración
├── modules/                       # Módulos reutilizables de infraestructura
│   ├── vpc/                       # Multi-AZ VPC, subredes públicas/privadas/aisladas, SGs
│   ├── rds/                       # PostgreSQL 16 (db.t4g.micro, gp3 autoscaling, Secrets Manager)
│   └── compute/                   # HTTP API Gateway v2 + Lambda (Graviton2 arm64 en VPC)
└── environments/                  # Entornos de ejecución
    └── dev/                       # Entorno de Desarrollo
        ├── main.tf                # Orquestación de módulos (VPC, RDS, Compute)
        ├── providers.tf           # Backend "s3" apuntando al bucket/tabla del bootstrap
        ├── variables.tf           # Variables configurables de Dev
        ├── terraform.tfvars.example # Plantilla de variables
        └── outputs.tf             # Endpoints (API Gateway, RDS host, VPC IDs)
```

---

## 2. El Problema del "Huevo y la Gallina" (Chicken-and-Egg)

### ¿Qué es?
Para que Terraform trabaje de forma colaborativa, segura y prevenga colisiones o corrupción concurrente de estado (*state locking*), necesita almacenar su archivo `terraform.tfstate` en un bucket de **Amazon S3** y sincronizar sus bloqueos mediante una tabla de **Amazon DynamoDB**.

Sin embargo, estos recursos en la nube deben ser creados por la misma infraestructura de código. **No podemos usar un backend remoto en S3 antes de que el bucket de S3 exista.**

### La Solución Arquitectónica
Dividimos el despliegue en dos fases claramente aisladas:

1. **Fase Bootstrap (`terraform/bootstrap/`)**: Se ejecuta primero con un **backend local** (su estado se guarda temporalmente en el equipo del administrador o en un repositorio seguro). Este módulo crea el bucket S3 con cifrado y versionamiento y la tabla DynamoDB con modo *On-Demand* (`PAY_PER_REQUEST`).
2. **Fase Entorno (`terraform/environments/dev/`)**: Una vez provisionados el bucket y la tabla, el entorno `dev` se inicializa directamente con el bloque `backend "s3"`. Terraform migra o crea el estado remoto en AWS desde el primer momento.

---

## 3. Guía Paso a Paso de Despliegue

### Requisitos Previos
- **Terraform CLI**: Versión `>= 1.5.0` instalada (`terraform version`).
- **AWS CLI**: Versión 2 configurada con credenciales válidas que posean permisos de IAM para crear recursos S3, DynamoDB, VPC, RDS y Lambda en `us-east-2`:
  ```bash
  aws sts get-caller-identity
  ```

---

### Paso 1: Provisionar el Backend Remoto (Bootstrap)

Navega al directorio de bootstrap:
```bash
cd terraform/bootstrap
```

Inicializa Terraform (utilizará el backend local por defecto):
```bash
terraform init
```

Inspecciona el plan de ejecución:
```bash
terraform plan
```

Aplica los cambios para crear el bucket S3 y la tabla DynamoDB en AWS:
```bash
terraform apply
```

Al finalizar exitosamente, obtendrás los siguientes outputs:
- `s3_bucket_name = "clinical-cloud-tfstate-us-east-2"`
- `dynamodb_table_name = "clinical-cloud-tflocks"`

> **Seguridad**: Ambos recursos tienen la regla `prevent_destroy = true` en su ciclo de vida (`lifecycle`) para prevenir eliminaciones accidentales de estados de infraestructura.

---

### Paso 2: Inicializar y Desplegar el Entorno Dev

Navega al entorno de desarrollo:
```bash
cd ../environments/dev
```

Crea tu archivo de variables locales a partir del ejemplo:
```bash
cp terraform.tfvars.example terraform.tfvars
# Edita terraform.tfvars con la contraseña maestra de PostgreSQL deseada
```

Inicializa Terraform conectándolo al nuevo Backend Remoto:
```bash
terraform init
```
*(Terraform detectará el bloque `backend "s3"` en `providers.tf`, validará el acceso al bucket S3 y registrará el lock en DynamoDB).*

Revisa el plan de ejecución de la infraestructura completa:
```bash
terraform plan
```

Aplica el plan cuando estés listo para desplegar los recursos reales en AWS:
```bash
terraform apply
```

---

## 4. Validación de Sintaxis y Formato

Para formatear recursivamente todos los archivos de Terraform en el proyecto:
```bash
terraform fmt -recursive terraform/
```

Para validar la sintaxis sin necesidad de conexión activa a AWS (offline):
```bash
# Validar Bootstrap:
cd terraform/bootstrap
terraform init -backend=false
terraform validate

# Validar Dev:
cd ../environments/dev
terraform init -backend=false
terraform validate
```

---

## 5. Medidas de Seguridad y Buenas Prácticas

1. **Cifrado en Reposo**: El bucket S3 aplica cifrado del lado del servidor obligatorio con algoritmo `AES256`.
2. **Versionamiento Estricto**: Habilitado en el bucket S3 para permitir auditoría histórica y recuperación ante corrupción accidental de estado.
3. **Bloqueo Público Total**: `block_public_acls`, `block_public_policy`, `ignore_public_acls` y `restrict_public_buckets` están configurados en `true`.
4. **State Locking**: La tabla DynamoDB con hash key `LockID` asegura que dos pipelines de CI/CD o desarrolladores nunca ejecuten modificaciones concurrentes sobre el mismo entorno.
5. **Aislamiento Multi-Entorno**: Los futuros entornos (`staging`, `prod`) utilizarán el mismo bucket y tabla lock pero aislados por su clave de estado:
   - Dev: `dev/terraform.tfstate`
   - Staging: `staging/terraform.tfstate`
   - Prod: `prod/terraform.tfstate`
