import csv
from datetime import datetime

import requests
import serial

# ====================================================
# CONFIGURACIÓN GENERAL
# ====================================================

PUERTO_SERIAL = "COM5"
BAUD_RATE = 9600

ID_NODO = "Nodo_01_Agua"

ARCHIVO_CSV = "historico_mediciones.csv"

API_URL = "https://iot.julcesar.xyz/api/measurements"

ENCABEZADOS = [
    "Fecha_Hora",
    "ID_Nodo",
    "Temperatura_C",
    "pH",
    "Turbidez_NTU",
    "TDS_ppm",
    "Nivel_cm",
]


# ====================================================
# CREAR CSV SI NO EXISTE
# ====================================================

try:
    with open(ARCHIVO_CSV, mode="x", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(ENCABEZADOS)

except FileExistsError:
    pass


# ====================================================
# ENVIAR DATOS A LA API
# ====================================================


def enviar_api(temp, ph, turb, tds, nivel):
    datos = {
        "node_id": ID_NODO,
        "temperature": temp,
        "ph": ph,
        "turbidity": turb,
        "tds": tds,
        "level": nivel,
    }

    try:
        response = requests.post(API_URL, json=datos, timeout=5)

        response.raise_for_status()

        print("   └─► API: medición enviada correctamente")

    except requests.exceptions.RequestException as e:
        print(f"   └─► API ERROR: {e}")


# ====================================================
# GUARDAR DATOS EN CSV
# ====================================================


def guardar_csv(fecha_hora, temp, ph, turb, tds, nivel):
    fila = [fecha_hora, ID_NODO, temp, ph, turb, tds, nivel]

    with open(ARCHIVO_CSV, mode="a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(fila)


# ====================================================
# PARSEAR LÍNEA DEL ARDUINO
# ====================================================


def parsear_linea(linea):
    # Ejemplo esperado:
    # Temp: 30.9 C | pH: 3.67 | Turb: 10.0 NTU |
    # TDS: 73 ppm | Nivel: 0.0 cm

    partes = linea.split("|")

    if len(partes) < 5:
        return None

    try:
        temp = float(partes[0].replace("Temp:", "").replace("C", "").strip())

        ph = float(partes[1].replace("pH:", "").strip())

        turb = float(partes[2].replace("Turb:", "").replace("NTU", "").strip())

        tds = float(partes[3].replace("TDS:", "").replace("ppm", "").strip())

        nivel = float(partes[4].replace("Nivel:", "").replace("cm", "").strip())

        return temp, ph, turb, tds, nivel

    except ValueError:
        return None


# ====================================================
# PROGRAMA PRINCIPAL
# ====================================================

print(f"Escuchando en {PUERTO_SERIAL} a {BAUD_RATE} baudios...")

ser = None

try:
    ser = serial.Serial(PUERTO_SERIAL, BAUD_RATE, timeout=2)

    while True:
        linea = ser.readline().decode("utf-8", errors="ignore").strip()

        if not linea:
            continue

        if "Temp:" not in linea:
            continue

        datos = parsear_linea(linea)

        if datos is None:
            print(f"Línea inválida: {linea}")
            continue

        temp, ph, turb, tds, nivel = datos

        fecha_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        guardar_csv(fecha_hora, temp, ph, turb, tds, nivel)

        print(
            f"[{fecha_hora}] "
            f"[{ID_NODO}] "
            f"Temp: {temp} °C | "
            f"pH: {ph} | "
            f"Turb: {turb} NTU | "
            f"TDS: {tds} ppm | "
            f"Nivel: {nivel} cm"
        )

        enviar_api(temp, ph, turb, tds, nivel)

except KeyboardInterrupt:
    print("\nPrograma detenido por el usuario.")

except serial.SerialException as e:
    print(f"\nError Serial: {e}")

except Exception as e:
    print(f"\nError inesperado: {e}")

finally:
    if ser is not None and ser.is_open:
        ser.close()
        print("Puerto serial cerrado.")
