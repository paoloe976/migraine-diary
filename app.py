from flask import Flask, request, jsonify, send_from_directory, redirect, session, url_for
from flask_cors import CORS
import json
import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
import io
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-key-change-this')  # Cambia questa chiave in produzione
CORS(app)

# Permetti HTTP in sviluppo locale
if not os.environ.get('RENDER'):  # Se non siamo su Render.com
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email'
]
FILE_ID = None
ALLOWED_EMAIL = os.environ.get('GOOGLE_USER_EMAIL')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'email' not in session:
            return redirect(url_for('login'))
        if session['email'] != ALLOWED_EMAIL:
            return jsonify({'error': 'Unauthorized user'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login')
def login():
    if 'credentials' not in session:
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        flow.redirect_uri = url_for('oauth2callback', _external=True)
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        session['state'] = state
        return redirect(authorization_url)
    
    return redirect(url_for('index'))

@app.route('/oauth2callback')
def oauth2callback():
    try:
        # Crea un nuovo flow
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        flow.redirect_uri = url_for('oauth2callback', _external=True)
        
        # Usa l'URL corrente per ottenere il token
        authorization_response = request.url
        flow.fetch_token(authorization_response=authorization_response)
        
        credentials = flow.credentials
        session['credentials'] = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        # Ottieni l'email dell'utente
        service = build('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()
        session['email'] = user_info['email']
        
        print(f"User email: {session['email']}")
        print(f"Allowed email: {ALLOWED_EMAIL}")
        
        if session['email'] != ALLOWED_EMAIL:
            print("Email non corrispondente!")
            session.clear()
            return jsonify({'error': 'Unauthorized user'}), 403
        
        print("Login successful!")
        return redirect(url_for('index'))
        
    except Exception as e:
        print(f"Errore durante l'autenticazione: {str(e)}")
        session.clear()
        return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

def get_google_drive_service():
    if 'credentials' not in session:
        return None
        
    creds = Credentials(
        **session['credentials']
    )
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            session['credentials'] = {
                'token': creds.token,
                'refresh_token': creds.refresh_token,
                'token_uri': creds.token_uri,
                'client_id': creds.client_id,
                'client_secret': creds.client_secret,
                'scopes': creds.scopes
            }
    
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
@login_required
def index():
    return send_from_directory('templates', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/get_data', methods=['GET'])
@login_required
def get_data():
    try:
        data = load_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save_data', methods=['POST'])
@login_required
def save_data_route():
    try:
        data = request.get_json()
        save_data(data)
        return jsonify({'message': 'Data saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug_file', methods=['GET'])
@login_required
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
