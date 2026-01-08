# Manual de Vendedor - Kreo Marketplace
## Guía Completa para Vendedores

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Registro como Vendedor](#registro-como-vendedor)
3. [Panel de Control](#panel-de-control)
4. [Gestión de Productos](#gestión-de-productos)
5. [Gestión de Inventario](#gestión-de-inventario)
6. [Gestión de Pedidos](#gestión-de-pedidos)
7. [Envíos y Logística](#envíos-y-logística)
8. [Pagos y Comisiones](#pagos-y-comisiones)
9. [Análisis y Reportes](#análisis-y-reportes)
10. [Atención al Cliente](#atención-al-cliente)
11. [Mejores Prácticas](#mejores-prácticas)
12. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

Bienvenido al **Portal de Vendedores de Kreo Marketplace**. Esta plataforma te permite vender tus productos a millones de clientes potenciales mientras nosotros nos encargamos de la infraestructura técnica y los pagos.

### Beneficios de Vender en Kreo

- **Acceso a millones de clientes**: Sin necesidad de crear tu propia tienda online
- **Pagos automatizados**: Recibe tus ganancias directamente en tu cuenta bancaria
- **Sin costos iniciales**: Solo pagas comisión sobre las ventas realizadas
- **Herramientas profesionales**: Panel de control, análisis y reportes
- **Soporte completo**: Equipo de soporte dedicado para vendedores

### Comisión de la Plataforma

Kreo cobra una **comisión del 10%** sobre cada venta realizada. Esta comisión cubre:
- Infraestructura tecnológica
- Procesamiento de pagos
- Marketing y promoción
- Soporte al cliente
- Seguridad y protección antifraude

---

## Registro como Vendedor

### Paso 1: Crear Cuenta de Usuario

1. Visita el Portal de Vendedores: `http://localhost:5174`
2. Haz clic en **"Registrarse como Vendedor"**
3. Completa el formulario:
   ```
   - Correo electrónico
   - Contraseña
   - Nombre
   - Apellido
   ```

### Paso 2: Información de la Tienda

Proporciona los datos de tu tienda:

**Información Básica**:
```
- Nombre de la tienda
- URL personalizada (ej: kreo.com/tienda/tu-tienda)
- Descripción de la tienda
- Logo (formato PNG o JPG, máx. 2MB)
- Banner (1200x400px recomendado)
```

**Categoría Principal**:
- Selecciona la categoría que mejor describe tus productos

### Paso 3: Verificación de Identidad (KYC)

Para cumplir con regulaciones y prevenir fraude, necesitamos verificar tu identidad:

**Información Personal**:
```
- Nombre legal completo
- Fecha de nacimiento
- Dirección completa
- Número de identificación fiscal
```

**Información de Negocio** (si aplica):
```
- Nombre legal del negocio
- Tipo de negocio (individual, LLC, corporación)
- Número de registro empresarial
- Dirección del negocio
```

**Documentos Requeridos**:
- Identificación oficial con foto (INE, Pasaporte)
- Comprobante de domicilio (máx. 3 meses)
- RFC o Tax ID
- Registro empresarial (si aplica)

### Paso 4: Configuración de Pagos con Stripe Connect

Para recibir tus ganancias, conecta tu cuenta bancaria:

1. Haz clic en **"Conectar con Stripe"**
2. Serás redirigido a Stripe
3. Completa el formulario de Stripe:
   - Información bancaria
   - Verificación de identidad
   - Aceptar términos y condiciones

4. Una vez aprobado, verás **"Cuenta Conectada"**

**Importante**:
- El proceso de verificación puede tomar 24-48 horas
- Stripe es nuestro procesador de pagos seguro y confiable
- Tus datos bancarios nunca son compartidos con Kreo

### Paso 5: Políticas de la Tienda

Define tus políticas:

**Política de Envío**:
```
- Tiempo de procesamiento (1-3 días recomendado)
- Métodos de envío disponibles
- Zonas de envío
- Costos de envío
```

**Política de Devolución**:
```
- Periodo de devolución (30 días recomendado)
- Condiciones de devolución
- Quién paga el envío de devolución
- Productos no retornables
```

**Política de Garantía**:
```
- Duración de la garantía
- Qué cubre la garantía
- Proceso para hacer válida la garantía
```

---

## Panel de Control

### Descripción General

Al iniciar sesión, verás tu panel de control con:

**Métricas Principales**:
- **Ventas del día**: Total de ventas hoy
- **Ventas del mes**: Total del mes actual
- **Pedidos pendientes**: Pedidos que requieren acción
- **Productos activos**: Cantidad de productos en venta
- **Calificación promedio**: Tu calificación como vendedor

**Gráficas**:
- Ventas de los últimos 30 días
- Productos más vendidos
- Tráfico a tus productos

**Actividad Reciente**:
- Nuevos pedidos
- Reseñas recientes
- Mensajes de clientes
- Alertas de inventario

### Navegación

El menú lateral incluye:
- **Dashboard**: Vista general
- **Productos**: Gestión de catálogo
- **Pedidos**: Gestión de ventas
- **Inventario**: Control de stock
- **Análisis**: Reportes detallados
- **Pagos**: Historial de pagos
- **Mensajes**: Comunicación con clientes
- **Configuración**: Ajustes de la tienda

---

## Gestión de Productos

### Agregar Nuevo Producto

1. Ve a **"Productos" → "Agregar Producto"**

2. **Información Básica**:
   ```
   - Título del producto (claro y descriptivo)
   - Descripción detallada
   - Categoría
   - Etiquetas (para mejorar búsquedas)
   ```

3. **Precio**:
   ```
   - Precio base
   - Precio comparativo (precio antes de descuento)
   - Costo por artículo (para tus cálculos)
   ```

4. **Imágenes**:
   - Sube al menos 3 imágenes de alta calidad
   - Primera imagen será la principal
   - Formatos: JPG, PNG (máx. 5MB cada una)
   - Resolución recomendada: 1200x1200px

5. **Inventario**:
   ```
   - SKU (código único del producto)
   - Código de barras (opcional)
   - Cantidad disponible
   - ¿Permitir pedidos sin stock? (backorder)
   ```

6. **Dimensiones y Peso**:
   ```
   - Peso (para calcular envío)
   - Largo, ancho, alto
   - Unidad de medida (cm, in)
   ```

7. **Variantes** (opcional):
   - Si tu producto tiene variantes (tallas, colores)
   - Define las opciones (ej: Talla: S, M, L, XL)
   - Asigna precio y stock para cada variante

8. **SEO** (opcional):
   ```
   - Meta título
   - Meta descripción
   - URL personalizada
   ```

9. Haz clic en **"Guardar como Borrador"** o **"Publicar"**

### Editar Productos

1. Ve a **"Productos"**
2. Encuentra el producto en la lista
3. Haz clic en **"Editar"**
4. Modifica los campos necesarios
5. Haz clic en **"Actualizar"**

### Carga Masiva de Productos

Para agregar muchos productos a la vez:

1. Ve a **"Productos" → "Carga Masiva"**

2. **Descarga la plantilla CSV**:
   - Haz clic en **"Descargar Plantilla"**
   - Abre el archivo en Excel o Google Sheets

3. **Completa la plantilla**:
   ```csv
   title,description,base_price,category,sku,inventory_quantity,weight,tags
   "Laptop HP 15","Laptop con procesador i5",599.99,electronics,LAP-HP-001,10,2.5,"laptop,hp,computadora"
   "Mouse Logitech","Mouse inalámbrico",29.99,electronics,MOU-LOG-001,50,0.2,"mouse,logitech,accesorios"
   ```

4. **Sube el archivo**:
   - Haz clic en **"Seleccionar Archivo"**
   - Elige tu archivo CSV
   - Haz clic en **"Cargar Productos"**

5. **Revisa los resultados**:
   - Productos creados exitosamente
   - Errores (si los hay)
   - Descarga el reporte de errores si es necesario

### Estados de Productos

- **Borrador**: No visible para clientes
- **Activo**: Disponible para compra
- **Agotado**: Sin stock pero visible
- **Archivado**: Oculto pero no eliminado

### Eliminar Productos

1. Ve a **"Productos"**
2. Selecciona el/los producto(s)
3. Haz clic en **"Eliminar"**
4. Confirma la acción

**Nota**: Los productos con pedidos activos no se pueden eliminar, solo archivar.

---

## Gestión de Inventario

### Ver Inventario

1. Ve a **"Inventario"**
2. Verás lista de todos tus productos con:
   - Nombre del producto
   - SKU
   - Stock actual
   - Stock reservado (en pedidos pendientes)
   - Stock disponible

### Actualizar Stock

**Método Manual**:
1. Encuentra el producto
2. Haz clic en el número de stock
3. Ingresa la nueva cantidad
4. Haz clic en **"Guardar"**

**Método de Ajuste**:
1. Haz clic en **"Ajustar Stock"**
2. Selecciona el tipo de ajuste:
   - **Agregar**: Recibiste más inventario
   - **Restar**: Producto dañado, perdido, etc.
   - **Establecer**: Definir cantidad exacta

3. Ingresa la cantidad
4. Agrega nota (opcional)
5. Haz clic en **"Confirmar"**

### Alertas de Stock Bajo

1. Ve a **"Configuración" → "Inventario"**
2. Configura:
   - **Umbral de stock bajo**: Ej: 10 unidades
   - **Recibir alertas por email**: Sí/No

3. Cuando el stock llegue al umbral, recibirás notificación

### Historial de Movimientos

Ve a **"Inventario" → "Historial"** para ver:
- Todas las modificaciones de stock
- Fecha y hora
- Usuario que realizó el cambio
- Motivo del ajuste

---

## Gestión de Pedidos

### Ver Pedidos

1. Ve a **"Pedidos"**
2. Verás todos los pedidos que incluyen tus productos

**Información Mostrada**:
- Número de sub-pedido
- Fecha
- Cliente
- Productos
- Total
- Estado

### Filtrar Pedidos

Filtra por:
- **Estado**: Pendiente, Procesando, Enviado, Entregado
- **Fecha**: Hoy, Última semana, Último mes, Personalizado
- **Cliente**: Buscar por nombre o email

### Detalles del Pedido

Al hacer clic en un pedido, verás:

**Información del Cliente**:
- Nombre completo
- Email
- Teléfono

**Dirección de Envío**:
- Dirección completa
- Instrucciones especiales

**Productos Ordenados**:
- Lista de productos
- Cantidad de cada uno
- Precio unitario
- Subtotal

**Resumen Financiero**:
- Subtotal de productos
- Costo de envío
- Total del pedido
- Comisión de Kreo (10%)
- **Tu ganancia neta**

### Procesar Pedido

1. **Revisar el pedido**:
   - Verifica que tienes el producto en stock
   - Confirma la dirección de envío

2. **Marcar como "Procesando"**:
   - Haz clic en **"Iniciar Preparación"**
   - Esto notifica al cliente

3. **Preparar el paquete**:
   - Empaca los productos de forma segura
   - Incluye factura o recibo
   - Agrega materiales de protección

4. **Generar etiqueta de envío**:
   - Haz clic en **"Crear Envío"**
   - Selecciona el método de envío
   - Confirma peso y dimensiones
   - Descarga e imprime la etiqueta

5. **Marcar como "Enviado"**:
   - Ingresa el número de rastreo
   - Selecciona la compañía (FedEx, UPS, etc.)
   - Haz clic en **"Marcar como Enviado"**
   - El cliente recibirá notificación automática

### Cancelar Pedido

Solo puedes cancelar pedidos que no han sido enviados:

1. Abre el pedido
2. Haz clic en **"Cancelar Pedido"**
3. Selecciona el motivo:
   - Sin stock
   - Error de precio
   - Solicitud del cliente
   - Otro

4. Confirma la cancelación
5. El reembolso se procesará automáticamente

### Gestión de Devoluciones

Cuando un cliente solicita devolución:

1. Recibirás notificación
2. Ve a **"Pedidos" → "Devoluciones"**
3. Revisa la solicitud:
   - Motivo
   - Fotos adjuntas
   - Comentarios del cliente

4. **Aprobar o Rechazar**:

   **Si Apruebas**:
   - Proporciona instrucciones de devolución
   - Decide quién paga el envío
   - Espera a recibir el producto
   - Inspecciona el producto
   - Emite reembolso completo o parcial

   **Si Rechazas**:
   - Proporciona razón detallada
   - El cliente puede apelar

5. Una vez procesado el reembolso:
   - Se restará de tus futuros pagos
   - La comisión también se reembolsará

---

## Envíos y Logística

### Configurar Zonas de Envío

1. Ve a **"Configuración" → "Envío"**

2. **Crear Zona de Envío**:
   - Nombre (ej: "México", "USA", "Resto del Mundo")
   - Selecciona países incluidos

3. **Definir Tarifas**:
   Para cada zona, crea tarifas:

   **Tarifa Plana**:
   ```
   - Nombre: "Envío Estándar"
   - Precio: $5.00
   - Tiempo estimado: 3-5 días
   ```

   **Por Peso**:
   ```
   - 0-1 kg: $5.00
   - 1-5 kg: $10.00
   - 5-10 kg: $15.00
   ```

   **Por Valor del Pedido**:
   ```
   - $0-$50: $5.00
   - $50-$100: $3.00
   - Más de $100: Gratis
   ```

### Integración con Shippo

Kreo se integra con Shippo para facilitar el envío:

**Beneficios**:
- Comparar tarifas de múltiples transportistas
- Generar etiquetas de envío
- Rastreo automático
- Tarifas preferenciales

**Configuración**:
1. Ve a **"Configuración" → "Integraciones"**
2. Haz clic en **"Conectar Shippo"**
3. Ingresa tu API Key de Shippo
4. Selecciona transportistas preferidos

### Generar Etiqueta de Envío

1. Abre el pedido
2. Haz clic en **"Crear Envío"**
3. **Selecciona el servicio**:
   - Se mostrarán opciones de FedEx, UPS, USPS, etc.
   - Con precio y tiempo estimado

4. **Confirma detalles**:
   - Peso del paquete
   - Dimensiones
   - Seguro (opcional)

5. **Genera la etiqueta**:
   - Haz clic en **"Comprar Etiqueta"**
   - Descarga e imprime
   - Pega en el paquete

6. El número de rastreo se agrega automáticamente

### Empacar Pedidos

**Mejores Prácticas**:
- Usa cajas resistentes del tamaño adecuado
- Agrega material de relleno (papel burbuja, cacahuates)
- Protege productos frágiles individualmente
- Sella bien la caja con cinta resistente
- Incluye recibo o factura
- Agrega tarjeta de agradecimiento (opcional)

---

## Pagos y Comisiones

### Cómo Funcionan los Pagos

1. **Cliente realiza compra**:
   - Pago procesado por Stripe
   - Monto total se retiene temporalmente

2. **Procesas el pedido**:
   - Cuando marcas como "Enviado"
   - El pago se libera

3. **Cálculo de tu ganancia**:
   ```
   Precio del producto:        $100.00
   + Envío cobrado:              $10.00
   = Total del sub-pedido:      $110.00
   - Comisión Kreo (10%):        $11.00
   - Tarifa Stripe (2.9% + $0.30): $3.49
   = Tu ganancia neta:           $95.51
   ```

4. **Transferencia a tu cuenta**:
   - Se transfiere automáticamente vía Stripe
   - Generalmente en 2-3 días hábiles
   - Directamente a tu cuenta bancaria

### Ver Historial de Pagos

1. Ve a **"Pagos"**
2. Verás lista de todos los pagos:
   - Fecha
   - Sub-pedido relacionado
   - Monto bruto
   - Comisión
   - Monto neto
   - Estado (Pendiente, Pagado, Fallido)

### Descargar Reportes

Para fines contables:

1. Ve a **"Pagos" → "Reportes"**
2. Selecciona el periodo:
   - Este mes
   - Último mes
   - Personalizado

3. Haz clic en **"Generar Reporte"**
4. Descarga en formato:
   - PDF (para imprimir)
   - CSV (para importar en Excel)

### Disputas y Contracargos

Si un cliente disputa un cargo:

1. Recibirás notificación inmediata
2. Ve a **"Pagos" → "Disputas"**
3. Revisa los detalles
4. **Responde en 7 días**:
   - Proporciona evidencia:
     - Comprobante de envío
     - Número de rastreo
     - Firma de entrega
     - Comunicaciones con el cliente

5. Stripe revisará y tomará decisión
6. Si pierdes:
   - El monto se reembolsa al cliente
   - Cargo adicional de $15 por disputa

**Prevenir Disputas**:
- Comunícate claramente con clientes
- Proporciona rastreo preciso
- Responde rápido a mensajes
- Describe productos con precisión

---

## Análisis y Reportes

### Dashboard de Análisis

Ve a **"Análisis"** para ver:

**Ventas**:
- Total de ventas (día, semana, mes, año)
- Gráfica de tendencias
- Comparación con periodo anterior

**Productos**:
- Más vendidos
- Menos vendidos
- Productos con mayor ingreso
- Productos sin vender

**Clientes**:
- Nuevos clientes
- Clientes recurrentes
- Valor promedio del pedido
- Tasa de retención

**Tráfico**:
- Vistas de productos
- Tasa de conversión
- Productos más vistos
- Fuentes de tráfico

### Reportes Personalizados

1. Ve a **"Análisis" → "Reportes Personalizados"**
2. Selecciona métricas:
   - Ventas por categoría
   - Ventas por ubicación
   - Rendimiento por producto
   - Análisis de inventario

3. Define periodo
4. Haz clic en **"Generar Reporte"**
5. Descarga o guarda

### Exportar Datos

Para análisis avanzado:

1. Ve a **"Análisis" → "Exportar Datos"**
2. Selecciona tipo de datos:
   - Pedidos
   - Productos
   - Clientes
   - Pagos

3. Define filtros y periodo
4. Descarga en formato CSV
5. Importa en Excel, Google Sheets, etc.

---

## Atención al Cliente

### Centro de Mensajes

1. Ve a **"Mensajes"**
2. Verás lista de conversaciones

**Tipos de Mensajes**:
- Preguntas sobre productos
- Consultas sobre pedidos
- Solicitudes de devolución
- Quejas o problemas

### Responder Mensajes

1. Haz clic en la conversación
2. Lee el mensaje completo
3. **Escribe tu respuesta**:
   - Sé profesional y cortés
   - Responde todas las preguntas
   - Proporciona información clara

4. Haz clic en **"Enviar"**

**Tiempo de Respuesta**:
- Objetivo: Menos de 24 horas
- Afecta tu calificación como vendedor
- Clientes valoran respuestas rápidas

### Plantillas de Respuesta

Para preguntas frecuentes:

1. Ve a **"Mensajes" → "Plantillas"**
2. Crea plantilla:
   ```
   Nombre: "Tiempo de envío"
   Mensaje: "Gracias por tu pregunta. El envío estándar
   toma 3-5 días hábiles. Si necesitas envío express,
   está disponible al momento del pago."
   ```

3. Al responder, selecciona la plantilla
4. Personaliza si es necesario

### Gestionar Reseñas

**Ver Reseñas**:
1. Ve a **"Reseñas"**
2. Verás todas las reseñas de tus productos

**Responder Reseñas**:
- **Reseñas Positivas**:
  ```
  "¡Gracias por tu compra y por tomarte el tiempo de
  dejarnos una reseña! Nos alegra que estés satisfecho."
  ```

- **Reseñas Negativas**:
  ```
  "Lamentamos que tu experiencia no haya sido positiva.
  Nos gustaría resolver esto. Por favor contáctanos
  directamente para ayudarte."
  ```

**Importante**:
- Responde de forma profesional siempre
- No seas defensivo con críticas
- Ofrece soluciones
- Toma feedback para mejorar

---

## Mejores Prácticas

### Fotografía de Productos

**Consejos**:
- Usa buena iluminación natural o softbox
- Fondo blanco o neutral
- Múltiples ángulos (frente, atrás, lateral, detalles)
- Incluye fotos de escala o uso
- Resolución mínima: 1200x1200px
- Sin marcas de agua excesivas

### Descripciones Efectivas

**Estructura Recomendada**:

1. **Título atractivo** (50-70 caracteres)
   ```
   Laptop HP 15.6" - Intel i5 10ma Gen, 8GB RAM, 256GB SSD
   ```

2. **Descripción breve** (primer párrafo)
   ```
   Laptop ideal para trabajo y estudio con procesador
   Intel de última generación y pantalla Full HD.
   ```

3. **Características principales** (bullets)
   ```
   • Procesador Intel Core i5-10210U
   • 8GB RAM DDR4 (expandible a 16GB)
   • Disco SSD de 256GB
   • Pantalla 15.6" Full HD (1920x1080)
   • Windows 11 Pro incluido
   • Batería de hasta 8 horas
   ```

4. **Especificaciones técnicas**
   - Tabla con todos los detalles

5. **Información adicional**
   - Garantía
   - Qué incluye la caja
   - Políticas de devolución

### Precios Competitivos

**Investigación de Mercado**:
1. Busca productos similares
2. Compara precios
3. Considera:
   - Calidad de tu producto
   - Costos (producto + envío + comisión)
   - Margen de ganancia deseado

**Estrategias de Precio**:
- **Precio de Penetración**: Más bajo para ganar mercado
- **Precio Premium**: Más alto por calidad superior
- **Precio Competitivo**: Similar al mercado

### Promociones y Descuentos

1. Ve a **"Marketing" → "Descuentos"**
2. Crea código de descuento:
   ```
   Código: BIENVENIDA10
   Tipo: Porcentaje
   Valor: 10%
   Uso mínimo: $50
   Límite: 100 usos
   Vigencia: 1 mes
   ```

3. Comparte el código en:
   - Redes sociales
   - Email a clientes
   - Banner en tu tienda

### Servicio al Cliente Excepcional

**Claves del Éxito**:
- ✅ Responde rápido (meta: <24 horas)
- ✅ Sé profesional y amable
- ✅ Resuelve problemas proactivamente
- ✅ Envía actualizaciones sin que las pidan
- ✅ Empaca productos con cuidado
- ✅ Incluye nota de agradecimiento
- ✅ Haz seguimiento post-venta

### Cumplimiento y Legalidad

**Responsabilidades**:
- ✅ Descripción honesta de productos
- ✅ Imágenes reales del producto
- ✅ Cumplir tiempos de envío prometidos
- ✅ Emitir facturas (si aplica en tu país)
- ✅ Pagar impuestos correspondientes
- ✅ Respetar propiedad intelectual
- ✅ No vender productos prohibidos

**Productos Prohibidos**:
- Réplicas o falsificaciones
- Armas y municiones
- Drogas o sustancias ilegales
- Material pornográfico
- Productos robados
- Animales vivos

---

## Preguntas Frecuentes

### Cuenta y Configuración

**¿Cuánto cuesta vender en Kreo?**
No hay costo de registro. Solo pagas 10% de comisión sobre ventas realizadas.

**¿Cuánto tiempo toma la verificación?**
Generalmente 24-48 horas hábiles.

**¿Puedo tener varias tiendas?**
No, una cuenta de vendedor por persona/negocio.

**¿Cómo cambio mi información bancaria?**
Ve a Configuración → Pagos → Editar Cuenta Stripe.

### Productos

**¿Cuántos productos puedo listar?**
Ilimitados.

**¿Puedo vender productos digitales?**
Actualmente solo productos físicos. Productos digitales próximamente.

**¿Cómo destacar mis productos?**
- Fotos de calidad
- Descripciones detalladas
- Precios competitivos
- Buenas reseñas
- Promociones (próximamente: publicidad pagada)

### Pedidos y Envíos

**¿Qué pasa si no puedo cumplir un pedido?**
Cancélalo inmediatamente para que el cliente reciba su reembolso.

**¿Puedo usar mi propia cuenta de transportista?**
Sí, puedes ingresar manualmente el número de rastreo.

**¿Qué pasa si un paquete se pierde?**
- Si compraste seguro con Shippo, puedes reclamar
- Si no, eres responsable del reembolso
- Considera siempre comprar seguro en envíos de alto valor

### Pagos

**¿Cuándo recibo mi dinero?**
2-3 días después de marcar el pedido como "Enviado".

**¿Hay un pago mínimo?**
No, se transfiere cada pago automáticamente.

**¿Qué pasa con los impuestos?**
Eres responsable de declarar tus ingresos según las leyes de tu país.

**¿Puedo recibir pagos en otra moneda?**
Depende de tu país y configuración de Stripe.

### Problemas

**Un cliente quiere devolver un producto sin motivo**
Revisa tu política de devolución. Si ofreces "devolución sin preguntas", debes aceptarla.

**Recibí una reseña injusta**
Responde profesionalmente. Si viola políticas, reporta a soporte@kreo.com.

**Mi cuenta fue suspendida**
Contacta a support@kreo.com con tu ID de vendedor para más información.

---

## Soporte para Vendedores

### Centro de Ayuda

- Documentación completa
- Videos tutoriales
- Guías paso a paso

### Contacto

**Email**:
- vendor-support@kreo.com
- Tiempo de respuesta: 24 horas

**Chat en Vivo**:
- Lunes a Viernes: 9:00 - 18:00
- Desde el portal de vendedores

**Teléfono**:
- +52 (55) 1234-5678
- Lunes a Viernes: 9:00 - 18:00

### Recursos Adicionales

**Blog para Vendedores**:
- blog.kreo.com/vendedores
- Tips, tendencias y mejores prácticas

**Comunidad de Vendedores**:
- community.kreo.com
- Comparte experiencias con otros vendedores

**Webinars Mensuales**:
- Regístrate en el portal
- Aprende nuevas estrategias

---

## Roadmap para Vendedores

**Próximamente**:

- **Q1 2025**:
  - Publicidad pagada para productos
  - Programa de vendedor destacado
  - App móvil para vendedores

- **Q2 2025**:
  - Productos digitales
  - Subscripciones y productos recurrentes
  - Análisis avanzado con IA

- **Q3 2025**:
  - Fulfillment por Kreo
  - Herramientas de email marketing
  - Programa de afiliados

---

## Términos y Condiciones

Al vender en Kreo, aceptas:

1. Comisión del 10% sobre ventas
2. Cumplir con tiempos de envío comprometidos
3. Proporcionar descripciones honestas
4. Responder a clientes en tiempo razonable
5. Procesar devoluciones según tu política
6. No vender productos prohibidos
7. Respetar propiedad intelectual
8. Mantener información de contacto actualizada

---

**¡Éxito en tus Ventas!**

Estamos emocionados de tenerte como vendedor en Kreo Marketplace. Si tienes preguntas o necesitas ayuda, nuestro equipo está aquí para apoyarte.

📧 vendor-support@kreo.com
📱 +52 (55) 1234-5678
🌐 vendor.kreo.com

---

*Última actualización: Diciembre 2024*
*Versión: 1.0.0*
