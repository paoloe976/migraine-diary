from flask import Flask, send_from_directory, request, jsonify
import os
import json

app = Flask(__name__)

# Assicurati che la cartella data esista
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(data_dir, exist_ok=True)

# Percorso del file JSON
data_file = os.path.join(data_dir, 'headache_data.json')

@app.route('/')
def root():
    return send_from_directory('.', 'index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/api/data', methods=['GET'])
def get_data():
    try:
        if os.path.exists(data_file):
            with open(data_file, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        return jsonify({})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/data', methods=['POST'])
def save_data():
    try:
        data = request.get_json()
        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({'message': 'Data saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
