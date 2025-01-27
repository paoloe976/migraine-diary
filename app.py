from flask import Flask, send_from_directory, jsonify, request
import json
import os

app = Flask(__name__)

# Percorso del file JSON per i dati
DATA_FILE = 'data/headache_data.json'

def ensure_data_dir():
    """Assicura che la directory data esista"""
    os.makedirs('data', exist_ok=True)

def load_data():
    """Carica i dati dal file JSON"""
    ensure_data_dir()
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Errore nel caricamento dei dati: {e}")
        return {}

def save_data(data):
    """Salva i dati nel file JSON"""
    ensure_data_dir()
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Errore nel salvataggio dei dati: {e}")
        return False

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/data', methods=['GET'])
def get_data():
    """Restituisce tutti i dati"""
    return jsonify(load_data())

@app.route('/data', methods=['POST'])
def save_all_data():
    """Salva tutti i dati"""
    data = request.json
    if save_data(data):
        return jsonify({"message": "Dati salvati con successo"})
    return jsonify({"error": "Errore nel salvataggio dei dati"}), 500

if __name__ == '__main__':
    app.run(debug=True)
