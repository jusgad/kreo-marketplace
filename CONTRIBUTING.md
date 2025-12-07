# Contribuyendo a Kreo Marketplace

Antes que nada, ¡gracias por considerar contribuir a Kreo Marketplace! Son personas como tú las que hacen que esta plataforma sea mejor para todos.

## Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Primeros Pasos](#primeros-pasos)
- [Flujo de Trabajo de Desarrollo](#flujo-de-trabajo-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Guías de Commits](#guías-de-commits)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Guías de Testing](#guías-de-testing)
- [Documentación](#documentación)
- [Comunidad](#comunidad)

---

## Código de Conducta

Este proyecto y todos los que participan en él se rigen por nuestro Código de Conducta. Al participar, se espera que respetes este código.

### Nuestro Compromiso

Nos comprometemos a hacer de la participación en nuestro proyecto una experiencia libre de acoso para todos, independientemente de edad, tamaño corporal, discapacidad, etnia, identidad y expresión de género, nivel de experiencia, nacionalidad, apariencia personal, raza, religión o identidad y orientación sexual.

### Nuestros Estándares

**Comportamiento positivo incluye:**

- Usar lenguaje acogedor e inclusivo
- Ser respetuoso con puntos de vista y experiencias diferentes
- Aceptar con gracia críticas constructivas
- Enfocarse en lo que es mejor para la comunidad
- Mostrar empatía hacia otros miembros de la comunidad

**Comportamiento inaceptable incluye:**

- Trolling, comentarios insultantes/despectivos y ataques personales o políticos
- Acoso público o privado
- Publicar información privada de otros sin permiso explícito
- Otra conducta que razonablemente se podría considerar inapropiada en un entorno profesional

---

## Primeros Pasos

### Prerequisitos

Antes de comenzar, asegúrate de tener:

- Node.js >= 18.0.0
- Docker & Docker Compose
- Git
- Un editor de código (recomendamos VS Code)
- Conocimiento básico de TypeScript, React y NestJS

### Fork y Clone

1. Haz fork del repositorio en GitHub
2. Clona tu fork localmente:

```bash
git clone https://github.com/TU_USUARIO/kreo-marketplace.git
cd kreo-marketplace
```

3. Agrega el repositorio upstream:

```bash
git remote add upstream https://github.com/owner-original/kreo-marketplace.git
```

4. Configura el entorno de desarrollo:

```bash
# Copiar variables de entorno
cp .env.example .env

# Instalar dependencias
npm install

# Iniciar infraestructura
docker-compose up -d postgres redis elasticsearch

# Iniciar servidores de desarrollo
npm run dev
```

---

## Flujo de Trabajo de Desarrollo

### Estrategia de Branching

Usamos el modelo Git Flow:

- `main` - Código listo para producción
- `develop` - Rama de integración para features
- `feature/*` - Nuevas características
- `bugfix/*` - Corrección de bugs
- `hotfix/*` - Correcciones urgentes de producción
- `release/*` - Preparación de releases

### Crear una Rama de Feature

```bash
# Sincronizar con upstream
git checkout develop
git pull upstream develop

# Crear rama de feature
git checkout -b feature/tu-nombre-de-feature

# Trabajar en tu feature
# ... hacer cambios ...

# Hacer commit de tu trabajo
git add .
git commit -m "feat: agregar característica increíble"

# Push a tu fork
git push origin feature/tu-nombre-de-feature
```

### Mantener tu Fork Actualizado

```bash
# Obtener cambios de upstream
git fetch upstream

# Hacer merge de develop de upstream en tu develop local
git checkout develop
git merge upstream/develop

# Rebase de tu rama de feature
git checkout feature/tu-nombre-de-feature
git rebase develop
```

---

## Estándares de Código

### TypeScript/JavaScript

Seguimos la Guía de Estilo JavaScript de Airbnb con algunas modificaciones.

**Reglas Generales:**

- Usar TypeScript para todo código nuevo
- Usar nombres significativos para variables y funciones
- Preferir `const` sobre `let`, evitar `var`
- Usar arrow functions para callbacks
- Usar async/await en lugar de callbacks
- Evitar tipos `any`, usar tipado apropiado

**Ejemplo:**

```typescript
// Bueno
const calcularTotal = async (items: CartItem[]): Promise<number> => {
  const subtotales = items.map((item) => item.price * item.quantity);
  return subtotales.reduce((sum, value) => sum + value, 0);
};

// Malo
function calcularTotal(items: any) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price * items[i].quantity;
  }
  return total;
}
```

### Backend NestJS

- Usar DTOs con `class-validator` para validación
- Usar inyección de dependencias
- Seguir principios SOLID
- Usar manejo apropiado de errores

**Ejemplo:**

```typescript
// DTO con validación
import { IsString, IsNumber, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(0)
  base_price: number;
}

// Servicio
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }
}
```

### Frontend React

- Usar componentes funcionales con hooks
- Usar TypeScript para props
- Mantener componentes pequeños y enfocados
- Usar Redux Toolkit para gestión de estado

**Ejemplo:**

```typescript
// Buen componente
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart
}) => {
  const handleClick = () => {
    onAddToCart(product.id);
  };

  return (
    <div className="product-card">
      <h3>{product.title}</h3>
      <p>${product.base_price}</p>
      <button onClick={handleClick}>Agregar al Carrito</button>
    </div>
  );
};
```

### Convenciones de Nombres de Archivos

- **Componentes**: PascalCase (`ProductCard.tsx`)
- **Servicios**: camelCase (`product.service.ts`)
- **Utilidades**: camelCase (`format-currency.ts`)
- **Tipos**: PascalCase (`Product.ts`, `Cart.ts`)
- **Archivos de test**: Igual que el archivo fuente + `.spec.ts` (`product.service.spec.ts`)

---

## Guías de Commits

Seguimos la especificación Conventional Commits.

### Formato de Mensaje de Commit

```
<tipo>(<scope>): <asunto>

<cuerpo>

<footer>
```

### Tipos

- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de estilo de código (formato, sin cambio de código)
- `refactor`: Refactorización de código
- `perf`: Mejoras de rendimiento
- `test`: Agregar o actualizar tests
- `chore`: Tareas de mantenimiento (dependencias, configuración de build)

### Ejemplos

```bash
# Feature
git commit -m "feat(product): agregar funcionalidad de carga masiva"

# Bug fix
git commit -m "fix(cart): resolver problema de ítems duplicados"

# Documentación
git commit -m "docs: actualizar documentación de API para pagos"

# Breaking change
git commit -m "feat(auth)!: migrar a autenticación OAuth2

BREAKING CHANGE: El formato del token JWT ha cambiado.
Los usuarios necesitarán re-autenticarse."
```

### Reglas de Mensajes de Commit

- Usar modo imperativo ("agregar" no "agregado")
- Primera línea máx 72 caracteres
- Referenciar issues en el footer (`Fixes #123`, `Closes #456`)
- Usar el cuerpo para explicar qué y por qué, no cómo

---

## Proceso de Pull Request

### Antes de Enviar

1. **Actualizar tu rama** con el último develop:

```bash
git checkout develop
git pull upstream develop
git checkout tu-rama-de-feature
git rebase develop
```

2. **Ejecutar tests**:

```bash
npm test
npm run test:e2e
```

3. **Ejecutar linter**:

```bash
npm run lint
```

4. **Hacer build del proyecto**:

```bash
npm run build
```

5. **Actualizar documentación** si es necesario

### Crear un Pull Request

1. Hacer push de tu rama a tu fork:

```bash
git push origin feature/tu-nombre-de-feature
```

2. Ir a GitHub y crear un Pull Request

3. Llenar la plantilla de PR:

```markdown
## Descripción
Breve descripción de los cambios

## Tipo de Cambio
- [ ] Corrección de bug
- [ ] Nueva característica
- [ ] Breaking change
- [ ] Actualización de documentación

## Testing
¿Cómo se ha probado esto?

## Checklist
- [ ] Mi código sigue las guías de estilo del proyecto
- [ ] He realizado una auto-revisión
- [ ] He comentado mi código donde es necesario
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan nuevos warnings
- [ ] He agregado tests que prueban que mi fix/feature funciona
- [ ] Los tests unitarios nuevos y existentes pasan localmente
```

### Proceso de Revisión de PR

1. **Checks Automatizados**: El pipeline CI/CD ejecuta tests y linters
2. **Revisión de Código**: Al menos un maintainer revisa tu código
3. **Aprobación**: Maintainer aprueba los cambios
4. **Merge**: Maintainer hace merge del PR

### Atender Comentarios de Revisión

```bash
# Hacer cambios solicitados
git add .
git commit -m "fix: atender comentarios de revisión"
git push origin feature/tu-nombre-de-feature
```

---

## Guías de Testing

### Tests Unitarios

Escribir tests unitarios para todos los servicios y utilidades.

```typescript
// product.service.spec.ts
describe('ProductService', () => {
  let service: ProductService;
  let repository: Repository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe crear un producto', async () => {
    const createDto = { title: 'Producto Test', base_price: 99.99 };
    const mockProduct = { id: '123', ...createDto };

    jest.spyOn(repository, 'create').mockReturnValue(mockProduct as Product);
    jest.spyOn(repository, 'save').mockResolvedValue(mockProduct as Product);

    const result = await service.create(createDto);

    expect(result).toEqual(mockProduct);
    expect(repository.create).toHaveBeenCalledWith(createDto);
  });
});
```

### Tests de Integración

Escribir tests E2E para flujos críticos.

```typescript
// checkout.e2e-spec.ts
describe('Checkout (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login para obtener token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginResponse.body.access_token;
  });

  it('/api/orders/checkout (POST)', async () => {
    return request(app.getHttpServer())
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: 'test@example.com',
        shipping_address: { /* ... */ },
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.order).toBeDefined();
        expect(res.body.client_secret).toBeDefined();
      });
  });
});
```

### Cobertura de Tests

Apuntar a:

- **Tests unitarios**: > 80% de cobertura
- **Tests de integración**: Rutas críticas cubiertas
- **Tests E2E**: Flujos principales de usuario cubiertos

Ejecutar cobertura:

```bash
npm run test:cov
```

---

## Documentación

### Documentación de Código

- Agregar comentarios JSDoc para APIs públicas
- Documentar lógica compleja
- Incluir ejemplos donde sea útil

```typescript
/**
 * Calcula la comisión para un pago de vendedor
 *
 * @param total - El monto total de la orden
 * @param rate - Tasa de comisión como decimal (ej., 0.10 para 10%)
 * @returns El monto de comisión redondeado a 2 decimales
 *
 * @example
 * ```typescript
 * const commission = calculateCommission(100.00, 0.10);
 * // Retorna: 10.00
 * ```
 */
export const calculateCommission = (total: number, rate: number): number => {
  return Math.round(total * rate * 100) / 100;
};
```

### Documentación de API

Actualizar API.md al agregar/modificar endpoints.

### Actualizaciones de README

Actualizar README.md si se agregan nuevas características o cambia la configuración.

---

## Comunidad

### Obtener Ayuda

- **GitHub Discussions**: Hacer preguntas, compartir ideas
- **Discord**: https://discord.gg/kreo-marketplace
- **Stack Overflow**: Etiquetar con `kreo-marketplace`

### Reportar Bugs

Usar GitHub Issues con plantilla de reporte de bugs:

```markdown
**Describe el bug**
Descripción clara del bug

**Para Reproducir**
Pasos para reproducir:
1. Ir a '...'
2. Click en '...'
3. Ver error

**Comportamiento esperado**
Lo que esperabas que sucediera

**Capturas de pantalla**
Si aplica

**Entorno:**
- OS: [ej. macOS 13.0]
- Versión Node: [ej. 18.16.0]
- Navegador: [ej. Chrome 120]

**Contexto adicional**
Cualquier otra información relevante
```

### Solicitudes de Features

Usar GitHub Issues con plantilla de solicitud de feature:

```markdown
**¿Está tu solicitud de feature relacionada con un problema?**
Descripción clara

**Describe la solución que te gustaría**
Lo que quieres que suceda

**Describe alternativas que has considerado**
Otras soluciones consideradas

**Contexto adicional**
Mockups, ejemplos, etc.
```

---

## Reconocimiento

Los contribuidores serán:

- Listados en CONTRIBUTORS.md
- Mencionados en las notas de release
- Acreditados en la documentación del proyecto

---

## Licencia

Al contribuir, aceptas que tus contribuciones serán licenciadas bajo la Licencia MIT.

---

## ¿Preguntas?

No dudes en preguntar! Estamos aquí para ayudar:

- Email: dev@kreo.com
- Discord: https://discord.gg/kreo-marketplace
- GitHub Discussions: Iniciar una nueva discusión

¡Gracias por contribuir a Kreo Marketplace!
