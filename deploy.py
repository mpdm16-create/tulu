import threading
import http.server
import socketserver
import os
import sys

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8787

os.chdir(SITE_DIR)

# Start local HTTP server
handler = http.server.SimpleHTTPRequestHandler

class QuietHandler(handler):
    def log_message(self, format, *args):
        pass  # Suppress logs

httpd = socketserver.TCPServer(("", PORT), QuietHandler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()

print(f"Servidor local en http://localhost:{PORT}")
print("Creando URL publica con localhost.run...")
print("(Espera unos segundos...)\n")

# Use SSH tunnel via localhost.run
import subprocess
proc = subprocess.Popen(
    ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=60",
     "-R", f"80:localhost:{PORT}", "nokey@localhost.run"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
)

try:
    for line in proc.stdout:
        line = line.strip()
        if "https://" in line:
            url = line.strip()
            # Extract URL
            parts = url.split()
            for p in parts:
                if p.startswith("https://"):
                    url = p
                    break
            print("=" * 55)
            print(f"  TU PAGINA ESTA EN LINEA!")
            print(f"  URL: {url}")
            print("=" * 55)
            print(f"\n  Abre en tu navegador: {url}")
            print(f"\n  Mantén esta ventana abierta para que la URL siga activa.")
            print(f"  Presiona Ctrl+C para detener.\n")
        elif line:
            print(f"  {line}")
except KeyboardInterrupt:
    print("\nDetenido.")
finally:
    proc.terminate()
    httpd.shutdown()
