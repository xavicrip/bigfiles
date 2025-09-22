# Bigfiles: Generador y Agregador de CSV (Node.js)

Este proyecto genera 1.000.000 (o el número que indiques) de registros de facturas en un CSV mediante streams (sin cargar todo en memoria) y crea automáticamente un segundo CSV agregado por año y mes con: número de ventas, máximo, mínimo, media y desviación típica.

## Requisitos
- Node.js 18+

## Instalación
```bash
npm install
```

## Uso automático (generación + agregado)
Ejecuta todo el proceso con un solo comando:
```bash
npm run start
```
Por defecto genera `invoices.csv` y `invoices_agg.csv` en el directorio actual. 

Puedes personalizarlo con argumentos (ejemplo: 1.000.000 de filas, semilla determinista, nombres de salida):
```bash
node src/main.js -n 1000000 -s 42 -o invoices.csv -a invoices_agg.csv
```

### Opciones de `src/main.js`
- `-n, --count <N>`: número de facturas a generar (por defecto 1000000)
- `-s, --seed <SEED>`: semilla para la aleatoriedad (por defecto fecha actual)
- `-o, --out <FILE>`: fichero CSV de salida con facturas (por defecto invoices.csv)
- `-a, --agg-out <FILE>`: fichero CSV de salida con el agregado (por defecto invoices_agg.csv)

## Uso por partes

### Generar facturas
```bash
node src/generate.js -n 1000000 -o invoices.csv -s 42
```
Campos del CSV: `id,order_id,customer_id,total,fecha` (fecha en ISO UTC).

### Agregar por año/mes
```bash
node src/aggregate.js -i invoices.csv -o invoices_agg.csv
```
Salida: `year,month,num_sales,max,min,mean,stddev`.

## Tests
Ejecuta los tests con:
```bash
npm test
```

## Notas de implementación
- Generación y escritura por streams para manejar ficheros grandes.
- Cálculo de media y desviación típica con el algoritmo online de Welford.
- El proceso completo se orquesta en `src/main.js`.
