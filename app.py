from flask import Flask, request, jsonify, send_from_directory, redirect, session, url_for, render_template
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
import secrets
import datetime

app = Flask(__name__)
# Use a strong secret key for sessions
app.secret_key = secrets.token_hex(32)  # Generate a secure random key
# Configure session to be more secure and last longer
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # Session lasts 1 hour
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app)

# Permetti HTTP in sviluppo locale
if not os.environ.get('RENDER'):  # Se non siamo su Render.com
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

def get_credentials_path():
    if os.environ.get('GOOGLE_CREDENTIALS'):
        # Su Render.com, crea il file dalle variabili d'ambiente
        credentials = os.environ['GOOGLE_CREDENTIALS']
        credentials_path = 'credentials.json'
        with open(credentials_path, 'w') as f:
            f.write(credentials)
        return credentials_path
    else:
        # In locale, usa il file
        return 'credentials.json'

SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
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
    print("=== Login Route ===")
    print("Session contents:", dict(session))
    
    if 'credentials' in session:
        # Verify if credentials are still valid
        service = get_google_drive_service()
        if service:
            print("Credentials valid, redirecting to index")
            return redirect(url_for('index'))
        else:
            print("Credentials invalid, clearing session")
            session.clear()
    
    try:
        flow = InstalledAppFlow.from_client_secrets_file(get_credentials_path(), SCOPES)
        flow.redirect_uri = url_for('oauth2callback', _external=True)
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'  # Force consent screen to get refresh token
        )
        session['state'] = state
        print("Redirecting to authorization URL")
        return redirect(authorization_url)
    except Exception as e:
        print(f"Error in login route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/oauth2callback')
def oauth2callback():
    try:
        # Crea un nuovo flow
        flow = InstalledAppFlow.from_client_secrets_file(get_credentials_path(), SCOPES)
        flow.redirect_uri = url_for('oauth2callback', _external=True)
        
        # Usa l'URL corrente per ottenere il token
        authorization_response = request.url
        flow.fetch_token(authorization_response=authorization_response)
        
        credentials = flow.credentials
        
        # Debug logging
        print("=== OAuth Callback Debug ===")
        print(f"Token present: {bool(credentials.token)}")
        print(f"Refresh token present: {bool(credentials.refresh_token)}")
        print(f"Token URI present: {bool(credentials.token_uri)}")
        print(f"Client ID present: {bool(credentials.client_id)}")
        print(f"Client secret present: {bool(credentials.client_secret)}")
        print(f"Scopes present: {bool(credentials.scopes)}")
        
        # Ensure all required fields are present
        if not all([credentials.token, credentials.refresh_token, 
                   credentials.token_uri, credentials.client_id, 
                   credentials.client_secret]):
            raise Exception("Missing required OAuth fields")
        
        session['credentials'] = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        # Print session data for debugging
        print("=== Session Credentials Debug ===")
        print("Fields in session:", list(session['credentials'].keys()))
        print("Values present:", {k: bool(v) for k, v in session['credentials'].items()})
        
        # Ottieni l'email dell'utente
        service = build('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()
        
        print("=== User Info Debug ===")
        print("Raw user_info:", user_info)
        print("Available fields:", list(user_info.keys()))
        
        # Try different name fields that Google might provide
        given_name = user_info.get('given_name', '')
        family_name = user_info.get('family_name', '')
        full_name = f"{family_name} {given_name}".strip()
        
        session['email'] = user_info['email']
        session['user_info'] = {
            'name': full_name,
            'email': user_info['email']
        }
        
        print(f"User email: {session['email']}")
        print(f"User name components:")
        print(f"- Given name: {given_name}")
        print(f"- Family name: {family_name}")
        print(f"- Full name: {full_name}")
        print(f"Stored in session: {session['user_info']['name']}")
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
        print("No credentials in session")
        return None
        
    try:
        print("=== Session Debug ===")
        print("Session credentials:", session.get('credentials'))
        
        creds_data = session['credentials']
        # Ensure all required fields are present
        required_fields = ['token', 'refresh_token', 'token_uri', 'client_id', 'client_secret']
        for field in required_fields:
            if not creds_data.get(field):
                print(f"Missing required field: {field}")
                return None
                
        creds = Credentials(
            token=creds_data['token'],
            refresh_token=creds_data['refresh_token'],
            token_uri=creds_data['token_uri'],
            client_id=creds_data['client_id'],
            client_secret=creds_data['client_secret'],
            scopes=creds_data['scopes']
        )
        
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                print("Refreshing credentials...")
                creds.refresh(Request())
                session['credentials'] = {
                    'token': creds.token,
                    'refresh_token': creds.refresh_token,
                    'token_uri': creds.token_uri,
                    'client_id': creds.client_id,
                    'client_secret': creds.client_secret,
                    'scopes': creds.scopes
                }
                session.modified = True
        
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        print(f"Error in get_google_drive_service: {str(e)}")
        return None

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
                    'emailAddress': os.environ.get('GOOGLE_USER_EMAIL')
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

def save_midas_to_drive(midas_data):
    """Save MIDAS questionnaire to a new file on Google Drive."""
    print("=== SAVE MIDAS DATA ===")
    service = get_google_drive_service()
    if not service:
        raise Exception("Impossibile connettersi a Google Drive")

    # Create timestamp for filename
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"midas_{timestamp}.json"
    
    print(f"Creating new MIDAS file: {filename}")
    
    # Prepare file metadata
    file_metadata = {
        'name': filename,
        'parents': ['root']  # Put in Drive root
    }
    
    # Prepare file content
    file_content = json.dumps(midas_data, indent=2, ensure_ascii=False)
    fh = io.BytesIO(file_content.encode('utf-8'))
    media = MediaIoBaseUpload(fh, mimetype='application/json', resumable=True)
    
    # Create the file
    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()
    
    file_id = file.get('id')
    print(f"Created MIDAS file with ID: {file_id}")
    
    # Set file permissions
    service.permissions().create(
        fileId=file_id,
        body={
            'type': 'user',
            'role': 'writer',
            'emailAddress': os.environ.get('GOOGLE_USER_EMAIL')
        }
    ).execute()
    print("Permissions set")
    
    return file_id

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

@app.route('/midas')
@login_required
def midas():
    """Show MIDAS questionnaire."""
    # Get user info from session
    user_info = session.get('user_info', {})
    user_name = user_info.get('name', '')
    
    # Get today's date in YYYY-MM-DD format
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    return render_template('midas.html', user_name=user_name, today=today)

@app.route('/save_midas', methods=['POST'])
@login_required
def save_midas():
    """Save the MIDAS questionnaire PDF to Google Drive."""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'Nessun file ricevuto'
            }), 400
            
        file = request.files['file']
        if not file:
            return jsonify({
                'success': False,
                'message': 'File vuoto'
            }), 400
            
        # Get Google Drive service
        service = get_google_drive_service()
        if not service:
            return jsonify({
                'success': False,
                'message': 'Impossibile connettersi a Google Drive'
            }), 500
            
        # Create file metadata
        file_metadata = {
            'name': file.filename,
            'parents': ['root'],  # Save in root folder
            'mimeType': 'application/pdf'
        }
        
        # Create media
        media = MediaIoBaseUpload(
            file,
            mimetype='application/pdf',
            resumable=True
        )
        
        # Create the file
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        file_id = file.get('id')
        
        # Set file permissions
        service.permissions().create(
            fileId=file_id,
            body={
                'type': 'user',
                'role': 'writer',
                'emailAddress': os.environ.get('GOOGLE_USER_EMAIL')
            }
        ).execute()
        
        return jsonify({
            'success': True,
            'message': 'PDF salvato con successo',
            'file_id': file_id
        })
        
    except Exception as e:
        print(f"Errore durante il salvataggio del PDF MIDAS: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Errore durante il salvataggio del questionario: {str(e)}'
        }), 400

if __name__ == '__main__':
    app.run(debug=True)
