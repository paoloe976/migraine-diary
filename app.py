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

@app.route('/get_data')
def get_data():
    try:
        with open('data/headache_data.json', 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except FileNotFoundError:
        return jsonify({}), 200
    except Exception as e:
        print('Errore nel caricamento dei dati:', str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/save_data', methods=['POST'])
def save_data():
    try:
        data = request.get_json()
        os.makedirs('data', exist_ok=True)  # Crea la cartella data se non esiste
        with open('data/headache_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return jsonify({'message': 'success'}), 200
    except Exception as e:
        print('Errore nel salvataggio dei dati:', str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
