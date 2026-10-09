# ⚡ THOR GYM - Sistema de Control de Acceso & Gestión de Miembros

Aplicación web moderna y rápida para gimnasios, diseñada con estética deportiva en **Negro Profundo y Amarillo Dorado Mate**, con reconocimiento de socios por código numérico o lector de código de barras/QR, administración de miembros, alertas de vencimiento y filtros avanzados.

---

## 🚀 Cómo Iniciar la Aplicación

Tienes dos opciones muy sencillas:

1. **Doble clic en `Abrir-Gym.bat`**: Abre la aplicación al instante en tu navegador web habitual.
2. **O abrir directamente `index.html`**: Haz doble clic en el archivo `index.html`.

> [!NOTE]
> No requiere instalación de programas adicionales, ni bases de datos complejas. Funciona 100% de forma autónoma y offline en cualquier computadora, tablet o pantalla táctil.

---

## 🎯 Características Principales

### 1. Punto de Reconocimiento y Check-in (Recepción / Kiosco)
- **Ingreso de código ultrarrápido**: Compatible con teclado manual, pantalla táctil (teclado numérico incluido en pantalla) y lectores de códigos de barras o QR USB.
- **Validación instantánea**:
  - 🟢 **Acceso Autorizado**: Si la membresía está vigente (más de 7 días). Emite sonido de bienvenida y muestra foto/avatar, plan y días restantes.
  - 🟡 **Por Vencer (Próximos 7 días)**: Permite el paso pero muestra alerta visual amarilla y sonido de aviso indicándole al socio que debe renovar pronto. Incluye botón directo de renovación.
  - ⛔ **Acceso Denegado (Membresía Vencida)**: Emite sonido de alerta roja y bloquea el acceso informando cuántos días lleva vencida la cuota.
  - ❌ **Código no encontrado**: Avisa si el código no pertenece a ningún miembro y ofrece registrarlo en 1 clic.
- **Historial de lecturas**: Registro cronológico en pantalla de las últimas personas que ingresaron en el turno.

### 2. Directorio de Miembros & Filtros Inteligentes
- **Filtros rápidos por estado**:
  - `Todos`: Directorio general con contador total.
  - `⚠️ Por Vencer (7 días)`: **Filtro especial solicitado** para identificar de inmediato a los clientes a quienes se les está por terminar la membresía (ideal para enviarles recordatorios por WhatsApp o cobrarles en mostrador).
  - `🟢 Activos`: Socios con cuota al día.
  - `⛔ Vencidos`: Socios cuya membresía ya caducó.
- **Buscador en tiempo real**: Busca al instante por nombre, código o teléfono.
- **Ordenamiento**:
  - Próximos a vencer primero (prioriza a los que están por caducar o vencidos).
  - Alfabético por nombre.
  - Más recientes primero.

### 3. Registro y Edición de Nuevos Miembros
- Nombre completo, teléfono, correo y notas de entrenamiento.
- **Código único personalizable** o generación con botón de dado 🎲.
- Selección de plan: Mensual (30d), Trimestral (90d), Semestral (180d), Anual (365d), Pase por Día (1d) o personalizado.
- **Cálculo automático de fecha de expiración**: Al seleccionar el plan y la fecha de inicio, calcula automáticamente la fecha exacta de vencimiento.

### 4. Renovación Rápida en 1 Clic
- Botón **⚡ Renovar** en cada socio.
- Permite extender la membresía fácilmente (+1 mes, +3 meses, +6 meses, +1 año) o seleccionar un día específico del calendario.

### 5. Credencial / Carnet Digital VIP
- Genera una tarjeta de membresía digital con diseño deportivo exclusivo en negro y amarillo, datos del socio y simulación de código de barras.
- Botón para imprimir o guardar como PDF.

### 6. Respaldo y Persistencia
- Los datos se almacenan automáticamente en el almacenamiento local (`localStorage`) del navegador.
- Incluye función de **Exportar Copia de Seguridad (.json)** y **Restaurar Copia de Seguridad**.
- Botón para restablecer a los datos iniciales de prueba en cualquier momento.

---

## 🧪 Códigos de Prueba Precargados

Para que pruebes la app inmediatamente, incluye socios de prueba:
- `1001` - **Carlos Mendoza** (Membresía Activa - quedan 15 días)
- `1002` - **Valeria Gómez** (Membresía Por Vencer - quedan 3 días)
- `1003` - **Rodrigo Salazar** (Membresía Por Vencer - queda 1 día)
- `1004` - **Lucía Fernández** (Membresía Vencida - venció hace 5 días)
- `1005` - **Alejandro Ramos** (Membresía VIP Anual - quedan 305 días)
