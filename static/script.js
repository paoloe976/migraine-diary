let currentMonthIndex = 0;
let monthsData = new Map(); // Mappa di mesi -> array di dati

// Funzione per estrarre la data da una stringa in formato ISO
function parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
    return new Date(year, month - 1, day);
}

// Funzione per ottenere la chiave del mese (YYYY-MM)
function getMonthKey(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Funzione per convertire una data dal formato italiano (DD/MM/YYYY) a ISO (YYYY-MM-DD)
function convertToISODate(italianDate) {
    const [day, month, year] = italianDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Mappa per la normalizzazione della sede
const locationMap = {
    'o': 'Occipitale',
    'occipitale': 'Occipitale',
    'p': 'Parietale',
    'parietale': 'Parietale',
    'f': 'Frontale',
    'frontale': 'Frontale',
    't': 'Temporale',
    'temporale': 'Temporale',
    'u': 'Unilaterale',
    'unilaterale': 'Unilaterale',
    'd': 'Diffusa',
    'diffusa': 'Diffusa'
};

// Funzione per normalizzare la sede
function normalizeLocation(location) {
    if (!location) return '';
    const normalized = locationMap[location.toLowerCase()];
    return normalized || '';
}

// Funzione per processare una riga CSV
function processCSVRow(row) {
    // Estrai i valori dalla riga
    const date = row.data;
    const intensity = row.intensita?.toString() || '';
    const location = normalizeLocation(row.sede);
    const medication = row.farmaco || '';
    const notes = row.note || '';

    // Converti la data se necessario
    const isoDate = isISODate(date) ? date : convertToISODate(date);

    // Crea l'oggetto entry
    return {
        date: isoDate,
        intensity,
        location,
        medication,
        notes
    };
}

// Funzione per caricare tutti i file
async function loadAllFiles(files) {
    console.log('Files ricevuti:', files);
    const allData = new Map(monthsData); // Inizia con i dati esistenti
    console.log('Dati esistenti:', [...monthsData.entries()]);
    
    // Leggi tutti i file
    const filePromises = Array.from(files)
        .filter(file => file.name.endsWith('.csv'))
        .map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                console.log(`Contenuto file ${file.name}:`, e.target.result.substring(0, 200));
                resolve({ content: e.target.result, filename: file.name });
            };
            reader.onerror = reject;
            reader.readAsText(file);
        }));

    try {
        const contents = await Promise.all(filePromises);
        let newEntriesCount = 0;
        let updatedEntriesCount = 0;
        
        // Processa tutti i contenuti
        contents.forEach(({content, filename}) => {
            console.log(`Processando file: ${filename}`);
            const lines = content.split('\n');
            console.log(`Numero di linee nel file: ${lines.length}`);
            const fileEntries = new Map();

            // Prima raccogli tutte le entry valide dal file
            lines.forEach((line, index) => {
                if (line.trim()) {
                    const [date, intensity, location, medication, notes] = line.split(',');
                    console.log(`Linea ${index}:`, { date, intensity, location, medication, notes });
                    
                    // Verifica se la data è nel formato italiano (DD/MM/YYYY)
                    if (date && date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                        const isoDate = convertToISODate(date);
                        console.log(`Data convertita da ${date} a ${isoDate}`);
                        const parsedDate = parseDate(isoDate);
                        const monthKey = getMonthKey(parsedDate);
                        console.log(`Data valida trovata: ${isoDate}, chiave mese: ${monthKey}`);
                        
                        if (!fileEntries.has(monthKey)) {
                            fileEntries.set(monthKey, new Map());
                        }
                        
                        fileEntries.get(monthKey).set(isoDate, {
                            date: isoDate,
                            intensity: intensity ? intensity.trim() : '',
                            location: normalizeLocation(location ? location.trim() : ''),
                            medication: medication ? medication.trim() : '',
                            notes: notes ? notes.trim() : ''
                        });
                    } else {
                        console.log(`Data non valida o in formato non riconosciuto: ${date}`);
                    }
                }
            });

            console.log('Entry raccolte:', [...fileEntries.entries()]);

            // Poi aggiorna solo le entry che sono nel file
            for (const [monthKey, monthEntries] of fileEntries) {
                if (!allData.has(monthKey)) {
                    allData.set(monthKey, []);
                    console.log(`Creato nuovo mese: ${monthKey}`);
                }
                
                const existingEntries = allData.get(monthKey);
                
                // Per ogni entry nel file
                for (const [date, newEntry] of monthEntries) {
                    const existingIndex = existingEntries.findIndex(entry => entry.date === date);
                    
                    if (existingIndex === -1) {
                        // Nuova entry
                        existingEntries.push(newEntry);
                        newEntriesCount++;
                        console.log(`Aggiunta nuova entry per ${date}:`, newEntry);
                    } else {
                        // Aggiorna entry esistente
                        console.log(`Aggiornamento entry per ${date}:`, newEntry);
                        existingEntries[existingIndex] = newEntry;
                        updatedEntriesCount++;
                    }
                }
            }
        });

        // Ordina i mesi e le entries all'interno di ogni mese
        monthsData = new Map([...allData.entries()].sort().map(([key, entries]) => {
            return [key, entries.sort((a, b) => a.date.localeCompare(b.date))];
        }));
        
        console.log('Dati finali:', [...monthsData.entries()]);
        
        // Salva immediatamente i dati nel file JSON
        await saveAllData();
        
        // Se ci sono dati, mostra il primo mese
        if (monthsData.size > 0) {
            currentMonthIndex = 0;
            const months = Array.from(monthsData.keys());
            displayMonth(months[currentMonthIndex]);
            document.querySelector('.navigation-controls').style.display = 'flex';
            
            console.log(`Modifiche completate: ${newEntriesCount} nuove, ${updatedEntriesCount} aggiornate`);
        } else {
            console.log('Nessun dato valido trovato nei file');
        }
    } catch (error) {
        console.error('Errore nel caricamento dei file:', error);
    }
}

// Funzione per leggere il contenuto di un file
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

// Funzione per creare la barra dell'intensità
function createIntensityBar(intensity) {
    if (!intensity) return '';
    return `
        <div class="intensity-bar intensity-${intensity}">
            <div class="intensity-bar-fill"></div>
            <div class="intensity-value">${intensity}</div>
        </div>
    `;
}

// Funzione per mostrare i dati del mese
function displayMonth(monthKey) {
    const container = document.getElementById('headacheData');
    if (!container) return;

    // Ottieni i dati del mese
    const monthData = monthsData.get(monthKey) || [];
    
    // Aggiorna il titolo del mese
    document.getElementById('currentMonth').textContent = formatMonthTitle(monthKey);
    
    // Crea la tabella
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Data</th>
                <th>Giorno</th>
                <th>Intensità</th>
                <th>Sede</th>
                <th>Farmaco</th>
                <th>Note</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    // Per ogni giorno del mese
    monthData.forEach(entry => {
        const date = new Date(entry.date + 'T00:00:00');
        const dayOfWeek = date.getDay(); // 0 = domenica, 1 = lunedì, ...
        
        const rowClasses = [
            dayOfWeek === 0 ? 'end-of-week' : '',
            dayOfWeek === 1 ? 'start-of-week' : '',
            'clickable-row'
        ].filter(Boolean).join(' ');

        const row = document.createElement('tr');
        row.className = rowClasses;
        row.setAttribute('data-date', entry.date);

        const formattedDate = formatDateFromDate(date);
        const dayName = getDayName(date);

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${dayName}</td>
            <td>${createIntensityBar(entry.intensity)}</td>
            <td>${entry.location || ''}</td>
            <td>${entry.medication || ''}</td>
            <td>${entry.notes || ''}</td>
        `;

        tbody.appendChild(row);
    });

    // Aggiorna il contenuto
    container.innerHTML = '';
    container.appendChild(table);

    // Aggiorna i controlli di navigazione
    updateNavigationControls();

    // Aggiorna il conteggio delle cefalee
    const headacheCount = monthData.filter(entry => entry.intensity).length;
    document.getElementById('headacheCount').textContent = headacheCount;

    // Aggiungi gli event listener per il click sulle righe
    container.querySelectorAll('tr.clickable-row').forEach(row => {
        row.addEventListener('click', (event) => {
            // Se non stiamo già modificando questa riga e non abbiamo cliccato su un pulsante
            if (!row.classList.contains('editing') && !event.target.closest('button')) {
                makeRowEditable(row);
            }
        });
    });
}

// Funzione per ottenere l'indice della colonna
function getColumnIndex(name) {
    const indices = {
        'intensity': 3,
        'location': 4,
        'medication': 5,
        'notes': 6
    };
    return indices[name] || 1;
}

// Funzione per formattare la data da un oggetto Date
function formatDateFromDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Funzione per ottenere il nome del giorno da un oggetto Date
function getDayName(date) {
    return weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Converte da DOM=0,LUN=1 a LUN=0,DOM=6
}

// Funzione per determinare se una data è l'ultimo giorno della settimana
function isEndOfWeek(year, month, day) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    console.log(`Data: ${year}-${month}-${day}, giorno della settimana: ${dayOfWeek} (0=DOM, 1=LUN, ...)`);
    return dayOfWeek === 0; // 0 = domenica
}

// Funzione per determinare se una data è il primo giorno della settimana
function isStartOfWeek(year, month, day) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    console.log(`Data: ${year}-${month}-${day}, giorno della settimana: ${dayOfWeek} (0=DOM, 1=LUN, ...)`);
    return dayOfWeek === 1; // 1 = lunedì
}

// Funzione per verificare se è un giorno alternato
function isStripedDay(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getDate() % 2 === 0;
}

// Funzione per aggiornare i controlli di navigazione
function updateNavigationControls() {
    const months = Array.from(monthsData.keys());
    const currentMonthKey = months[currentMonthIndex];
    const [year, month] = currentMonthKey.split('-').map(num => parseInt(num));
    
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');
    const currentMonthSpan = document.getElementById('currentMonth');

    prevButton.disabled = currentMonthIndex <= 0;
    nextButton.disabled = currentMonthIndex >= months.length - 1;
    currentMonthSpan.textContent = formatMonthTitle(currentMonthKey);
}

// Funzione per formattare il nome del mese
function formatMonth(date) {
    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Funzione per formattare il titolo del mese
function formatMonthTitle(monthKey) {
    const [year, month] = monthKey.split('-').map(num => parseInt(num));
    return formatMonth(new Date(year, month - 1));
}

// Inizializzazione di jsPDF
const { jsPDF } = window.jspdf;

// Funzione per esportare il mese corrente in PDF
function exportCurrentMonth() {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Definizione dei colori per l'intensità (dal più chiaro al più scuro)
    const intensityColors = {
        1: [255, 153, 153], // #FF9999
        2: [255, 102, 102], // #FF6666
        3: [255, 51, 51],   // #FF3333
        4: [255, 0, 0],     // #FF0000
        5: [204, 0, 0],     // #CC0000
    };
    
    const months = Array.from(monthsData.keys());
    const currentMonthKey = months[currentMonthIndex];
    const [year, month] = currentMonthKey.split('-').map(num => parseInt(num));
    const monthData = monthsData.get(currentMonthKey) || [];
    
    // Titolo
    doc.setFontSize(14);
    doc.text(formatMonthTitle(currentMonthKey), 10, 15);
    
    // Sottotitolo con conteggio
    doc.setFontSize(8);
    doc.text(`Totale cefalee: ${monthData.length}`, 10, 20);

    // Prepara i dati per la tabella
    const headers = [
        [
            'Data',
            'Giorno',
            'Intensità',
            'Sede',
            'Farmaco',
            'Note'
        ]
    ];

    // Crea un oggetto per un accesso più veloce ai dati per data
    const headachesByDate = {};
    monthData.forEach(data => {
        headachesByDate[data.date] = data;
    });

    const rows = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    // Funzione per disegnare la barra dell'intensità con numero
    function drawIntensityBar(intensity, x, y, width, cellHeight) {
        if (intensity === '' || !intensityColors[intensity]) return;
        
        const color = intensityColors[intensity];
        const fillWidth = (width * intensity) / 5;  // Lunghezza proporzionale all'intensità
        const barHeight = 4.5;  // Aumentata da 3 a 4.5
        
        // Calcola la posizione y per centrare la barra
        const yCenter = y + (cellHeight - barHeight) / 2;
        
        // Salva lo stato corrente
        const currentFillColor = doc.getFillColor();
        const currentTextColor = doc.getTextColor();
        const currentFontSize = doc.getFontSize();
        
        // Disegna la barra
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, yCenter, fillWidth, barHeight, barHeight/2, barHeight/2, 'F');
        
        // Aggiungi il numero in bianco
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(intensity.toString(), x + fillWidth/2, yCenter + barHeight/2, { 
            align: 'center', 
            baseline: 'middle'
        });
        
        // Ripristina lo stato
        doc.setFillColor(currentFillColor);
        doc.setTextColor(currentTextColor);
        doc.setFontSize(currentFontSize);
        doc.setFont('helvetica', 'normal');
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const formattedDate = day.toString().padStart(2, '0');
        
        if (dateStr in headachesByDate) {
            const data = headachesByDate[dateStr];
            rows.push([
                formattedDate,
                {content: '', intensity: data.intensity},
                data.location.trim(),
                data.medication,
                data.notes
            ]);
        } else {
            rows.push([
                formattedDate,
                '',
                '',
                '',
                ''
            ]);
        }
    }

    // Genera la tabella
    doc.autoTable({
        head: headers,
        body: rows,
        startY: 25,
        margin: { left: 10, right: 10 },  
        styles: {
            fontSize: 9,
            cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
            lineHeight: 1.2,
            font: 'helvetica',
            valign: 'middle',
            halign: 'center',
            lineWidth: 0.1
        },
        headStyles: {
            fontSize: 10,
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 20 },    
            1: { cellWidth: 25 },    
            2: { cellWidth: 20 },    
            3: { cellWidth: 40 },    
            4: { cellWidth: 60 }     
        },
        didDrawCell: function(data) {
            // Disegna la barra dell'intensità con numero
            if (data.column.index === 2 && data.row.raw[2] && data.row.raw[2].intensity) {
                const intensity = data.row.raw[2].intensity;
                const padding = 1.5;
                drawIntensityBar(
                    intensity,
                    data.cell.x + padding,
                    data.cell.y,
                    data.cell.width - (padding * 2),
                    data.cell.height
                );
            }
        },
        theme: 'grid',
        tableWidth: 'auto'
    });

    // Salva il PDF
    const fileName = `diario_cefalee_${year}_${month.toString().padStart(2, '0')}.pdf`;
    doc.save(fileName);
}

// Funzione per salvare tutti i dati in un file JSON
async function saveAllData() {
    try {
        // Converti la Map in un oggetto per il JSON
        const data = Object.fromEntries(monthsData);
        
        const response = await fetch('/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Dati salvati con successo:', result.message);
        
        // Aggiorna la visualizzazione dopo il salvataggio
        if (monthsData.size > 0) {
            const months = Array.from(monthsData.keys());
            displayMonth(months[currentMonthIndex]);
        }
    } catch (error) {
        console.error('Errore nel salvataggio dei dati:', error);
    }
}

// Carica i dati dal file JSON
async function loadDataFromFile() {
    try {
        const response = await fetch('/data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Converti l'oggetto in Map
        monthsData = new Map(Object.entries(data));
        
        // Se ci sono dati, mostra il primo mese
        if (monthsData.size > 0) {
            const months = Array.from(monthsData.keys()).sort();
            currentMonthIndex = 0;
            displayMonth(months[currentMonthIndex]);
            document.querySelector('.navigation-controls').style.display = 'flex';
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        monthsData = new Map();
    }
}

// Carica i dati all'avvio
document.addEventListener('DOMContentLoaded', async () => {
    await loadDataFromFile();
    setupMonthNavigation();
    setupExportPdf();
    setupFileInput();
});

// Aggiungi event listener per il pulsante di esportazione
function setupExportPdf() {
    document.getElementById('exportPdf').addEventListener('click', exportCurrentMonth);
}

// Gestione del caricamento della cartella
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (files) {
            // Filtra solo i file CSV
            const csvFiles = Array.from(files).filter(file => file.name.endsWith('.csv'));
            if (csvFiles.length > 0) {
                await loadAllFiles(csvFiles);
            } else {
                console.log('Nessun file CSV selezionato');
            }
            // Reset il valore dell'input per permettere di selezionare gli stessi file
            event.target.value = '';
        }
    });
}

function setupMonthNavigation() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        if (currentMonthIndex > 0) {
            currentMonthIndex--;
            const months = Array.from(monthsData.keys());
            displayMonth(months[currentMonthIndex]);
        }
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        const months = Array.from(monthsData.keys());
        if (currentMonthIndex < months.length - 1) {
            currentMonthIndex++;
            displayMonth(months[currentMonthIndex]);
        }
    });
}

// Funzione per creare l'input dell'intensità
function createIntensityInput(value) {
    return `
        <select class="edit-input" name="intensity">
            <option value="">-</option>
            <option value="1" ${value === '1' ? 'selected' : ''}>1</option>
            <option value="2" ${value === '2' ? 'selected' : ''}>2</option>
            <option value="3" ${value === '3' ? 'selected' : ''}>3</option>
            <option value="4" ${value === '4' ? 'selected' : ''}>4</option>
            <option value="5" ${value === '5' ? 'selected' : ''}>5</option>
        </select>
    `;
}

// Funzione per creare l'input della sede
function createLocationInput(value) {
    return `
        <select class="edit-input" name="location">
            <option value="">-</option>
            <option value="Occipitale" ${value === 'Occipitale' ? 'selected' : ''}>Occipitale</option>
            <option value="Parietale" ${value === 'Parietale' ? 'selected' : ''}>Parietale</option>
            <option value="Frontale" ${value === 'Frontale' ? 'selected' : ''}>Frontale</option>
            <option value="Temporale" ${value === 'Temporale' ? 'selected' : ''}>Temporale</option>
            <option value="Unilaterale" ${value === 'Unilaterale' ? 'selected' : ''}>Unilaterale</option>
            <option value="Diffusa" ${value === 'Diffusa' ? 'selected' : ''}>Diffusa</option>
        </select>
    `;
}

// Funzione per creare l'input del farmaco
function createMedicationInput(value) {
    return `
        <input type="text" 
               class="edit-input" 
               name="medication" 
               value="${value}" 
               list="medications-list">
    `;
}

// Funzione per creare l'input delle note
function createNotesInput(value) {
    return `<input type="text" class="edit-input notes-input" value="${value || ''}" style="width: 100%;">`;
}

// Funzione per salvare una riga
function saveRow(row) {
    const date = row.getAttribute('data-date');
    const intensity = row.querySelector('select[name="intensity"]')?.value || '';
    const location = row.querySelector('select[name="location"]')?.value || '';
    const medication = row.querySelector('input[name="medication"]')?.value || '';
    const notes = row.querySelector('input.notes-input')?.value || '';

    // Aggiorna i dati
    const monthKey = getCurrentMonth();
    const monthData = monthsData.get(monthKey) || [];
    const existingEntryIndex = monthData.findIndex(e => e.date === date);

    const entry = {
        date,
        intensity,
        location,
        medication,
        notes
    };

    if (existingEntryIndex >= 0) {
        monthData[existingEntryIndex] = entry;
    } else {
        monthData.push(entry);
    }

    monthsData.set(monthKey, monthData);
    saveAllData();

    // Aggiorna la visualizzazione
    displayMonth(monthKey);
}

// Funzione per annullare la modifica di una riga
function cancelEdit(row) {
    const monthKey = getCurrentMonth();
    displayMonth(monthKey);
}

// Funzione per ottenere il mese corrente nel formato YYYY-MM
function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

// Funzione per ottenere la data corrente nel formato YYYY-MM-DD
function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Funzione per ottenere la lista unica dei farmaci usati
function getUsedMedications() {
    const medications = new Set();
    for (const entries of monthsData.values()) {
        entries.forEach(entry => {
            if (entry.medication) {
                medications.add(entry.medication.trim());
            }
        });
    }
    return Array.from(medications).sort();
}

// Funzione per creare e gestire il datalist dei farmaci
function setupMedicationAutocomplete(input) {
    // Crea un nuovo datalist se non esiste
    let datalist = document.getElementById('medications-list');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'medications-list';
        document.body.appendChild(datalist);
    }

    // Aggiorna le opzioni con i farmaci usati
    const medications = getUsedMedications();
    datalist.innerHTML = medications
        .map(med => `<option value="${med}">`)
        .join('');

    // Collega il datalist all'input
    input.setAttribute('list', 'medications-list');
}

// Array dei giorni della settimana in italiano, partendo da Lunedì
const weekdays = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

// Funzione per creare la tabella dei dati
function createDataTable(entries) {
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Data</th>
                <th>Giorno</th>
                <th>Intensità</th>
                <th>Sede</th>
                <th>Farmaco</th>
                <th>Note</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    let prevDate = null;

    entries.forEach(entry => {
        const row = document.createElement('tr');
        row.setAttribute('data-date', entry.date);
        
        // Crea l'oggetto Date direttamente dalla data ISO
        const date = new Date(entry.date + 'T00:00:00');
        console.log(`Data: ${entry.date}`);
        console.log(`Date object: ${date}`);
        console.log(`Day of week: ${date.getDay()} (0=DOM, 1=LUN, ...)`);
        
        // Aggiungi le classi per la separazione delle settimane
        if (date.getDay() === 0) { // Domenica
            console.log(`${entry.date} è DOMENICA`);
            row.classList.add('end-of-week');
        }
        if (date.getDay() === 1) { // Lunedì
            console.log(`${entry.date} è LUNEDI`);
            row.classList.add('start-of-week');
        }

        // Formatta la data per la visualizzazione
        const formattedDate = formatDateFromDate(date);
        const dayName = getDayName(date);

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${dayName}</td>
            <td>${createIntensityBar(entry.intensity)}</td>
            <td>${entry.location || ''}</td>
            <td>${entry.medication || ''}</td>
            <td>${entry.notes || ''}</td>
        `;

        tbody.appendChild(row);
        prevDate = date;
    });

    return table;
}

// Funzione per rendere una riga editabile
function makeRowEditable(row) {
    if (row.classList.contains('editing')) return;
    
    const date = row.getAttribute('data-date');
    const cells = Array.from(row.cells);
    const data = monthsData.get(getCurrentMonth()) || [];
    const entry = data.find(e => e.date === date) || { 
        date,
        intensity: '',
        location: '',
        medication: '',
        notes: ''
    };

    // Aggiungi la classe editing alla riga
    row.classList.add('editing');

    // Salva il contenuto originale delle celle
    row.setAttribute('data-original', JSON.stringify(entry));

    // Crea gli input per ogni cella editabile
    cells[2].innerHTML = createIntensityInput(entry.intensity || '');
    cells[3].innerHTML = createLocationInput(entry.location || '');
    cells[4].innerHTML = createMedicationInput(entry.medication || '');
    cells[5].innerHTML = `
        <div class="edit-container">
            <input type="text" class="edit-input notes-input" value="${entry.notes || ''}" style="width: 100%;">
            <div class="edit-buttons">
                <button class="save-btn" title="Salva">✓</button>
                <button class="cancel-btn" title="Annulla">✗</button>
            </div>
        </div>
    `;

    // Aggiungi gli event listener per i pulsanti
    const saveBtn = cells[5].querySelector('.save-btn');
    const cancelBtn = cells[5].querySelector('.cancel-btn');
    
    saveBtn.addEventListener('click', () => saveRow(row));
    cancelBtn.addEventListener('click', () => cancelEdit(row));

    // Focus sul primo input
    const firstInput = row.querySelector('input, select');
    if (firstInput) firstInput.focus();
}
