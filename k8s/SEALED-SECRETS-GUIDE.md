# GUÍA DE SEALED SECRETS PARA KUBERNETES

**Problema**: Los secrets en `k8s/base/secrets.yaml` contienen valores sensibles que NO deben estar en Git.

**Solución**: Usar **Sealed Secrets** de Bitnami para encriptar secrets de forma segura.

---

## ¿POR QUÉ SEALED SECRETS?

❌ **NUNCA hacer esto**:
```yaml
# secrets.yaml - INSEGURO! No commitear esto
apiVersion: v1
kind: Secret
data:
  JWT_SECRET: bXlfc3VwZXJfc2VjcmV0X2tleQ==  # Base64, fácil de decodificar
```

✅ **Hacer esto instead**:
```yaml
# sealed-secret.yaml - SEGURO! Se puede commitear
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
spec:
  encryptedData:
    JWT_SECRET: AgBh8F7X2... # Encriptado con clave pública
```

---

## INSTALACIÓN DE SEALED SECRETS

### 1. Instalar el controlador en Kubernetes

```bash
# Opción A: Usando kubectl
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Opción B: Usando Helm
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system
```

### 2. Instalar kubeseal CLI

```bash
# macOS
brew install kubeseal

# Linux
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-0.24.0-linux-amd64.tar.gz
tar -xvzf kubeseal-0.24.0-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal

# Windows (con Scoop)
scoop install kubeseal
```

### 3. Verificar instalación

```bash
kubeseal --version
# Debería mostrar: kubeseal version: 0.24.0
```

---

## CREACIÓN DE SEALED SECRETS

### Paso 1: Generar secretsreales (NO commitear)

```bash
# Generar valores seguros
export JWT_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export STRIPE_SECRET_KEY="sk_live_XXXXXXXXXXXXXXXX"
export STRIPE_WEBHOOK_SECRET="whsec_XXXXXXXXXXXXX"

# Ver los valores generados
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
```

### Paso 2: Crear archivo temporal de secret (NO commitear)

```bash
# Crear secret temporal
kubectl create secret generic kreo-secrets \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  --from-literal=STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  --dry-run=client -o yaml > /tmp/temp-secret.yaml
```

### Paso 3: Sellar el secret

```bash
# Sellar usando la clave pública del cluster
kubeseal --format=yaml \
  < /tmp/temp-secret.yaml \
  > k8s/base/sealed-secrets.yaml

# Eliminar archivo temporal
rm /tmp/temp-secret.yaml
```

### Paso 4: Aplicar al cluster

```bash
# Este archivo SÍ se puede commitear
kubectl apply -f k8s/base/sealed-secrets.yaml

# El controlador lo desencriptará automáticamente
kubectl get secrets kreo-secrets
# NAME            TYPE     DATA   AGE
# kreo-secrets    Opaque   5      10s
```

---

## ROTACIÓN DE SECRETS

### Actualizar un secret existente

```bash
# 1. Generar nuevo valor
export NEW_JWT_SECRET=$(openssl rand -base64 32)

# 2. Crear nuevo sealed secret (reemplazará el anterior)
kubectl create secret generic kreo-secrets \
  --from-literal=JWT_SECRET="$NEW_JWT_SECRET" \
  --dry-run=client -o yaml | \
  kubeseal --format=yaml --merge-into k8s/base/sealed-secrets.yaml

# 3. Aplicar cambios
kubectl apply -f k8s/base/sealed-secrets.yaml

# 4. Reiniciar pods para que tomen el nuevo secret
kubectl rollout restart deployment/auth-service
```

---

## ESTRUCTURA RECOMENDADA

```
k8s/
├── base/
│   ├── sealed-secrets.yaml          ✅ COMMITEAR - Encriptado
│   └── secrets.yaml.template        ✅ COMMITEAR - Template con placeholders
├── overlays/
│   ├── development/
│   │   └── sealed-secrets.yaml      ✅ COMMITEAR - Secrets de dev
│   ├── staging/
│   │   └── sealed-secrets.yaml      ✅ COMMITEAR - Secrets de staging
│   └── production/
│       └── sealed-secrets.yaml      ✅ COMMITEAR - Secrets de prod
└── SEALED-SECRETS-GUIDE.md          ✅ COMMITEAR - Esta guía
```

---

## SCRIPT AUTOMATIZADO

Crear `scripts/create-sealed-secrets.sh`:

```bash
#!/bin/bash
set -e

# Colores para output
RED='\033[0:31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Generador de Sealed Secrets para Kreo Marketplace${NC}\n"

# Validar que kubeseal esté instalado
if ! command -v kubeseal &> /dev/null; then
    echo -e "${RED}❌ kubeseal no está instalado. Instálalo primero.${NC}"
    exit 1
fi

# Ambiente (development, staging, production)
ENVIRONMENT=${1:-development}
echo "Ambiente: $ENVIRONMENT"

# Generar secrets seguros
echo -e "\n📝 Generando secrets aleatorios..."
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Solicitar Stripe keys (solo en staging/production)
if [ "$ENVIRONMENT" != "development" ]; then
    echo -e "\n💳 Ingresa tus credenciales de Stripe:"
    read -p "STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
    read -p "STRIPE_WEBHOOK_SECRET: " STRIPE_WEBHOOK_SECRET
else
    STRIPE_SECRET_KEY="sk_test_DEVELOPMENT_KEY"
    STRIPE_WEBHOOK_SECRET="whsec_DEVELOPMENT_WEBHOOK"
fi

# Crear secret temporal
echo -e "\n🔨 Creando secret..."
kubectl create secret generic kreo-secrets \
  --namespace=default \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  --from-literal=STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  --dry-run=client -o yaml > /tmp/temp-secret.yaml

# Sellar
echo -e "\n🔒 Sellando secret..."
kubeseal --format=yaml \
  < /tmp/temp-secret.yaml \
  > k8s/overlays/$ENVIRONMENT/sealed-secrets.yaml

# Limpiar
rm /tmp/temp-secret.yaml

echo -e "\n${GREEN}✅ Sealed secret creado en: k8s/overlays/$ENVIRONMENT/sealed-secrets.yaml${NC}"
echo -e "${GREEN}✅ Este archivo PUEDE ser commiteado a Git de forma segura${NC}\n"

# Mostrar ejemplo de aplicación
echo "Para aplicar al cluster:"
echo "  kubectl apply -f k8s/overlays/$ENVIRONMENT/sealed-secrets.yaml"
```

Hacer ejecutable:
```bash
chmod +x scripts/create-sealed-secrets.sh
```

Usar:
```bash
# Desarrollo
./scripts/create-sealed-secrets.sh development

# Producción
./scripts/create-sealed-secrets.sh production
```

---

## SEGURIDAD Y MEJORES PRÁCTICAS

### ✅ SÍ HACER:

1. **Commitear sealed secrets a Git**
   ```bash
   git add k8s/overlays/*/sealed-secrets.yaml
   git commit -m "Add sealed secrets for all environments"
   ```

2. **Rotar secrets regularmente**
   ```bash
   # Cada 90 días mínimo
   ./scripts/create-sealed-secrets.sh production
   ```

3. **Diferentes secrets por ambiente**
   - Nunca usar los mismos valores en dev y prod
   - Cada ambiente debe tener su propio sealed secret

4. **Backup de secrets**
   ```bash
   # Exportar secret actual (guardar en lugar seguro, NO en Git)
   kubectl get secret kreo-secrets -o yaml > backup-secrets-$(date +%Y%m%d).yaml
   ```

### ❌ NO HACER:

1. **NUNCA commitear secrets.yaml sin sellar**
   ```bash
   # Agregar a .gitignore
   echo "k8s/**/secrets.yaml" >> .gitignore
   echo "!k8s/**/sealed-secrets.yaml" >> .gitignore
   ```

2. **NUNCA usar CHANGEME en producción**
   - Validar antes de deploy:
   ```bash
   if grep -q "CHANGEME" k8s/**/*.yaml; then
     echo "❌ ERROR: Secrets contains CHANGEME"
     exit 1
   fi
   ```

3. **NUNCA compartir sealed secrets entre clusters**
   - Cada cluster tiene su propia clave de encriptación
   - Sealed secrets de un cluster NO funcionan en otro

---

## TROUBLESHOOTING

### Problema: "no key could decrypt secret"

```bash
# El sealed secret fue creado para otro cluster
# Solución: Generar nuevo sealed secret para este cluster
./scripts/create-sealed-secrets.sh production
```

### Problema: "controller not found"

```bash
# El controlador no está instalado
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
```

### Problema: Secret no se actualiza en pods

```bash
# Reiniciar deployments
kubectl rollout restart deployment -n default
```

---

## RECURSOS ADICIONALES

- [Sealed Secrets GitHub](https://github.com/bitnami-labs/sealed-secrets)
- [Documentación oficial](https://sealed-secrets.netlify.app/)
- [Best practices](https://learn.hashicorp.com/tutorials/vault/kubernetes-sidecar)

---

## CHECKLIST DE DEPLOYMENT

Antes de hacer deploy a producción:

- [ ] Sealed Secrets controlador instalado en K8s
- [ ] kubeseal CLI instalado localmente
- [ ] Secrets generados con `openssl rand -base64 32`
- [ ] STRIPE_SECRET_KEY es key de producción (sk_live_...)
- [ ] Sealed secrets creados para el ambiente correcto
- [ ] Archivo secrets.yaml (sin sellar) NO está en Git
- [ ] `.gitignore` configurado correctamente
- [ ] Sealed secrets aplicados al cluster
- [ ] Deployments reiniciados
- [ ] Secrets funcionando (verificar logs de pods)
- [ ] Backup de secrets guardado en lugar seguro
