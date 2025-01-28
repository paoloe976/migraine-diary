from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
import io

app = Flask(__name__)
CORS(app)

SCOPES = ['https://www.googleapis.com/auth/drive.file']
FILE_ID = None  # Verrà impostato la prima volta che carichiamo il file

def get_google_drive_service():
    creds = None
    
    # In produzione, usa le variabili d'ambiente
    if os.environ.get('GOOGLE_CREDENTIALS') and os.environ.get('GOOGLE_TOKEN'):
        creds_info = json.loads(os.environ.get('GOOGLE_CREDENTIALS'))
        token_info = json.loads(os.environ.get('GOOGLE_TOKEN'))
        
        creds = Credentials(
            token=token_info.get('token'),
            refresh_token=token_info.get('refresh_token'),
            token_uri=creds_info.get('token_uri'),
            client_id=creds_info.get('client_id'),
            client_secret=creds_info.get('client_secret'),
            scopes=SCOPES
        )
    # In locale, usa i file
    elif os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # Se non ci sono credenziali valide o sono scadute
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            
            # Se siamo in produzione, aggiorna il token nelle variabili d'ambiente
            if os.environ.get('GOOGLE_TOKEN'):
                token_info = {
                    'token': creds.token,
                    'refresh_token': creds.refresh_token,
                    'token_uri': creds.token_uri,
                    'client_id': creds.client_id,
                    'client_secret': creds.client_secret,
                    'scopes': creds.scopes
                }
                os.environ['GOOGLE_TOKEN'] = json.dumps(token_info)
        else:
            # In locale, fai il login
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=8080)
            with open('token.json', 'w') as token:
                token.write(creds.to_json())

    return build('drive', 'v3', credentials=creds)

def load_data():
    global FILE_ID
    print("=== LOAD DATA ===")
    service = get_google_drive_service()
    print("Service created")
    
    # Se non abbiamo ancora il FILE_ID, cerca il file
    if not FILE_ID:
        print("Searching for file...")
        results = service.files().list(
            q="name='headache_data.json' and trashed=false",
            spaces='drive',
            fields='files(id, name)').execute()
        files = results.get('files', [])
        print(f"Found {len(files)} files")
        
        if not files:
            print("Creating new file...")
            # Il file non esiste, crealo
            file_metadata = {
                'name': 'headache_data.json',
                'parents': ['root']  # Lo mette nella root del Drive
            }
            file_content = json.dumps({})
            fh = io.BytesIO(file_content.encode('utf-8'))
            media = MediaIoBaseUpload(fh, mimetype='application/json', resumable=True)
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            FILE_ID = file.get('id')
            print(f"Created file with ID: {FILE_ID}")
            
            print("Setting permissions...")
            # Rendi il file visibile nel Drive
            service.permissions().create(
                fileId=FILE_ID,
                body={
                    'type': 'user',
                    'role': 'writer',
                    'emailAddress': os.environ.get('GOOGLE_USER_EMAIL', 'your.email@gmail.com')
                }
            ).execute()
            print("Permissions set")
        else:
            FILE_ID = files[0]['id']
            print(f"Using existing file with ID: {FILE_ID}")
    
    print(f"Downloading file {FILE_ID}...")
    # Scarica il file
    request = service.files().get_media(fileId=FILE_ID)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
        print(f"Download {int(status.progress() * 100)}%")
    
    fh.seek(0)
    data = json.loads(fh.read().decode('utf-8'))
    print(f"Data loaded: {data}")
    return data

def save_data(data):
    print("=== SAVE DATA ===")
    print(f"Saving data: {data}")
    service = get_google_drive_service()
    print("Service created")
    
    # Prepara il file da caricare
    fh = io.BytesIO(json.dumps(data).encode('utf-8'))
    media = MediaIoBaseUpload(fh, mimetype='application/json', resumable=True)
    
    print(f"Updating file {FILE_ID}...")
    # Aggiorna il file esistente
    file = service.files().update(fileId=FILE_ID, media_body=media).execute()
    print(f"File updated: {file}")
    
@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/get_data', methods=['GET'])
def get_data():
    try:
        data = load_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save_data', methods=['POST'])
def save_data_route():
    try:
        data = request.get_json()
        save_data(data)
        return jsonify({'message': 'Data saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug_file', methods=['GET'])
def debug_file():
    try:
        service = get_google_drive_service()
        
        # Cerca tutti i file con quel nome
        results = service.files().list(
            q="name='headache_data.json'",
            spaces='drive',
            fields='files(id, name, owners, permissions, webViewLink)'
        ).execute()
        
        files = results.get('files', [])
        
        if not files:
            return jsonify({'message': 'Nessun file trovato'})
            
        file_info = []
        for file in files:
            # Ottieni più dettagli sul file
            file_details = service.files().get(
                fileId=file['id'],
                fields='id, name, owners, permissions, webViewLink, parents'
            ).execute()
            
            file_info.append({
                'id': file_details.get('id'),
                'name': file_details.get('name'),
                'owners': file_details.get('owners'),
                'permissions': file_details.get('permissions'),
                'webViewLink': file_details.get('webViewLink'),
                'parents': file_details.get('parents')
            })
        
        return jsonify(file_info)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
