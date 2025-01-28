let currentMonth;
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

// Funzione per verificare se una data è in formato ISO (YYYY-MM-DD)
function isISODate(dateStr) {
    // Rimuovi le virgolette se presenti
    const cleanDate = dateStr.replace(/^"|"$/g, '');
    return cleanDate && cleanDate.match(/^\d{4}-\d{2}-\d{2}$/);
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
                    
                    // Rimuovi le virgolette dai campi
                    const cleanDate = date.replace(/^"|"$/g, '');
                    const cleanIntensity = intensity ? intensity.replace(/^"|"$/g, '') : '';
                    const cleanLocation = location ? location.replace(/^"|"$/g, '') : '';
                    const cleanMedication = medication ? medication.replace(/^"|"$/g, '') : '';
                    const cleanNotes = notes ? notes.replace(/^"|"$/g, '') : '';

                    // Verifica se la data è nel formato italiano (DD/MM/YYYY) o ISO (YYYY-MM-DD)
                    if (cleanDate && (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) || cleanDate.match(/^\d{4}-\d{2}-\d{2}$/))) {
                        const isoDate = isISODate(cleanDate) ? cleanDate : convertToISODate(cleanDate);
                        console.log(`Data processata: ${cleanDate} -> ${isoDate}`);
                        const parsedDate = parseDate(isoDate);
                        const monthKey = getMonthKey(parsedDate);
                        console.log(`Data valida trovata: ${isoDate}, chiave mese: ${monthKey}`);
                        
                        if (!fileEntries.has(monthKey)) {
                            fileEntries.set(monthKey, new Map());
                        }
                        
                        fileEntries.get(monthKey).set(isoDate, {
                            date: isoDate,
                            intensity: cleanIntensity.trim(),
                            location: normalizeLocation(cleanLocation.trim()),
                            medication: cleanMedication.trim(),
                            notes: cleanNotes.trim()
                        });
                    } else {
                        console.log(`Data non valida o in formato non riconosciuto: ${cleanDate}`);
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
            const months = Array.from(monthsData.keys());
            displayMonth(months[0]);
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
    
    // Crea la tabella
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th colspan="2">Giorno</th>
                <th>Int.</th>
                <th>Sede</th>
                <th>Farmaco</th>
                <th>Note</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    // Per ogni giorno del mese
    const [year, month] = monthKey.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const isCurrentMonth = parseInt(year) === currentYear && parseInt(month) === currentMonth;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${monthKey}-${String(day).padStart(2, '0')}`;
        const entry = monthData.find(e => e.date === date) || { 
            date,
            intensity: '',
            location: '',
            medication: '',
            notes: ''
        };

        const row = document.createElement('tr');
        row.setAttribute('data-date', date);
        row.classList.add('clickable-row');

        // Aggiungi la classe current-day se è il giorno corrente
        if (isCurrentMonth && day === currentDay) {
            row.classList.add('current-day');
        }

        const dateObj = new Date(entry.date + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0 = domenica, 1 = lunedì, ...
        
        // Aggiungi le classi per la separazione delle settimane
        if (dayOfWeek === 0) row.classList.add('end-of-week');
        if (dayOfWeek === 1) row.classList.add('start-of-week');

        row.innerHTML = `
            <td>${day}</td>
            <td>${getDayName(dateObj)}</td>
            <td>${createIntensityBar(entry.intensity)}</td>
            <td>${entry.location || ''}</td>
            <td>${entry.medication || ''}</td>
            <td>${entry.notes || ''}</td>
        `;

        tbody.appendChild(row);
    }

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
    const currentIndex = months.indexOf(currentMonth);
    
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');

    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= months.length - 1;
    
    // Mostra/nascondi i controlli di navigazione
    const navigationControls = document.querySelector('.navigation-controls');
    navigationControls.style.display = months.length > 0 ? 'flex' : 'none';
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
    
    const monthData = monthsData.get(currentMonth) || [];
    const [year, month] = currentMonth.split('-');
    
    // Titolo
    doc.setFontSize(14);
    const title = formatMonthTitle(currentMonth);
    doc.text(title, 10, 15);
    
    // Conta solo le righe che hanno almeno un campo compilato
    const headacheCount = monthData.filter(data => 
        data.intensity || 
        data.location || 
        data.medication || 
        data.notes
    ).length;
    
    // Contatore sulla stessa riga del titolo
    doc.setFontSize(10);
    const countText = `Totale cefalee: ${headacheCount}`;
    doc.text(countText, doc.internal.pageSize.width - 10, 15, { align: 'right' });

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
        const date = new Date(year, month - 1, day);
        const dayName = getDayName(date);
        
        if (dateStr in headachesByDate) {
            const data = headachesByDate[dateStr];
            rows.push([
                formattedDate,
                dayName,
                {content: '', intensity: data.intensity},
                data.location.trim(),
                data.medication,
                data.notes
            ]);
        } else {
            rows.push([
                formattedDate,
                dayName,
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
        startY: 20,  // Ridotto da 25 a 20
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
            0: { cellWidth: 15 },    // Data
            1: { cellWidth: 20 },    // Giorno
            2: { cellWidth: 20 },    // Intensità
            3: { cellWidth: 25 },    // Sede
            4: { cellWidth: 30 },    // Farmaco
            5: { cellWidth: 80 }     // Note
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

// Funzione per esportare tutti i dati in CSV
function exportToCsv() {
    // Header del CSV
    const csvRows = ['Data,Intensità,Localizzazione,Farmaco,Note'];
    
    // Ordina i mesi
    const sortedMonths = Array.from(monthsData.keys()).sort();
    
    // Per ogni mese
    for (const monthKey of sortedMonths) {
        const monthData = monthsData.get(monthKey);
        if (!monthData) continue;
        
        // Ordina le entry per data
        const sortedEntries = monthData.sort((a, b) => a.date.localeCompare(b.date));
        
        // Aggiungi ogni riga al CSV
        for (const entry of sortedEntries) {
            const row = [
                entry.date,
                entry.intensity || '',
                entry.location || '',
                entry.medication || '',
                (entry.notes || '').replace(/,/g, ';') // Sostituisci le virgole con punto e virgola nelle note
            ].map(field => `"${field}"`).join(',');
            
            csvRows.push(row);
        }
    }
    
    // Crea il blob e scarica il file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const today = new Date();
    const fileName = `diario_emicrania_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.csv`;
    
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, fileName);
    } else {
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Funzione per caricare i dati all'avvio
async function loadDataFromFile() {
    try {
        const response = await fetch('/get_data', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Errore nel caricamento dei dati:', response.status, response.statusText);
            monthsData = new Map();
            return;
        }
        
        const data = await response.json();
        console.log('Dati ricevuti:', data);
        monthsData = new Map(Object.entries(data));
        console.log('Dati caricati nella Map:', monthsData);
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        monthsData = new Map();
    }
}

// Funzione per salvare tutti i dati
async function saveAllData() {
    try {
        const data = Object.fromEntries(monthsData);
        
        const response = await fetch('/save_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Errore nel salvataggio dei dati: ${response.status} ${response.statusText}`);
        }
        console.log('Dati salvati con successo');
    } catch (error) {
        console.error('Errore nel salvataggio dei dati:', error);
    }
}

// All'avvio, carica i dati e mostra il mese corrente
document.addEventListener('DOMContentLoaded', async () => {
    // Aspetta che Flatpickr e i suoi plugin siano completamente caricati
    await new Promise(resolve => setTimeout(resolve, 100));

    await loadDataFromFile();
    
    // Mostra i controlli di navigazione
    document.querySelector('.navigation-controls').style.display = 'flex';
    
    // Imposta il mese corrente
    currentMonth = getCurrentMonth();
    displayMonth(currentMonth);
    
    // Inizializza il selettore del mese
    const monthPickerElement = document.querySelector("#monthSelect");
    if (monthPickerElement) {
        // Imposta il valore iniziale
        monthPickerElement.value = currentMonth;
        
        // Aggiungi l'event listener per il cambio mese
        monthPickerElement.addEventListener('change', (e) => {
            currentMonth = e.target.value;
            displayMonth(currentMonth);
        });
    }
    
    // Aggiungi event listener per i pulsanti di navigazione
    document.getElementById('prevMonth').addEventListener('click', () => {
        const [year, month] = currentMonth.split('-');
        let newMonth = parseInt(month) - 1;
        let newYear = parseInt(year);
        
        if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        
        currentMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
        monthPickerElement.value = currentMonth;  // Aggiorna anche il calendario
        displayMonth(currentMonth);
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        const [year, month] = currentMonth.split('-');
        let newMonth = parseInt(month) + 1;
        let newYear = parseInt(year);
        
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }
        
        currentMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
        monthPickerElement.value = currentMonth;  // Aggiorna anche il calendario
        displayMonth(currentMonth);
    });

    // Setup delle altre funzionalità
    setupExportPdf();
    setupFileInput();
    setupDropdownMenu();
    checkAuthStatus();
});

// Aggiungi event listener per il pulsante di esportazione
function setupExportPdf() {
    document.getElementById('exportPdf').addEventListener('click', exportCurrentMonth);
}

// Gestione del caricamento della cartella
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', async (event) => {
        if (event.target.files.length > 0) {
            await loadAllFiles(event.target.files);
            displayMonth(getCurrentMonth());
        }
    });
}

// Gestione del menu a tendina
function setupDropdownMenu() {
    const menuButton = document.getElementById('menuButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const importButton = document.getElementById('importButton');
    const fileInput = document.getElementById('fileInput');
    const exportPdfButton = document.getElementById('exportPdf');
    const exportCsvButton = document.getElementById('exportCsv');

    // Chiudi il menu se si clicca fuori
    document.addEventListener('click', (e) => {
        if (!menuButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Toggle del menu quando si clicca sul pulsante
    menuButton.addEventListener('click', () => {
        dropdownMenu.classList.toggle('show');
    });

    // Gestione dei click sui pulsanti del menu (solo per chiudere il menu)
    importButton.addEventListener('click', () => {
        fileInput.click();
        dropdownMenu.classList.remove('show');
    });

    exportPdfButton.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
    });

    exportCsvButton.addEventListener('click', () => {
        exportToCsv();
        dropdownMenu.classList.remove('show');
    });
}

// Funzione per creare la barra dell'intensità
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

// Funzione per creare la barra dell'intensità
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
    return `<input type="text" class="edit-input" name="notes" value="${value || ''}">`;
}

// Funzione per cancellare i valori di una riga
function clearValues(row) {
    // Svuota i campi
    const intensitySelect = row.querySelector('select[name="intensity"]');
    const locationSelect = row.querySelector('select[name="location"]');
    const medicationInput = row.querySelector('input[name="medication"]');
    const notesInput = row.querySelector('input[name="notes"]');

    if (intensitySelect) intensitySelect.value = '';
    if (locationSelect) locationSelect.value = '';
    if (medicationInput) medicationInput.value = '';
    if (notesInput) notesInput.value = '';
}

// Funzione per salvare una riga
function saveRow(row) {
    // Rimuovi classe dal body
    document.body.classList.remove('has-editing-row');
    
    const date = row.getAttribute('data-date');
    const monthKey = date.substring(0, 7); // Prende YYYY-MM dalla data YYYY-MM-DD
    const monthData = monthsData.get(monthKey) || [];
    const existingEntryIndex = monthData.findIndex(e => e.date === date);

    // Raccogli i valori dai campi di input
    const intensity = row.querySelector('select[name="intensity"]').value;
    const location = row.querySelector('select[name="location"]').value;
    const medication = row.querySelector('input[name="medication"]').value;
    const notes = row.querySelector('input[name="notes"]').value;

    // Se almeno un campo è compilato, salva la riga
    if (intensity || location || medication || notes) {
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
    } else if (existingEntryIndex >= 0) {
        // Se tutti i campi sono vuoti e la riga esisteva, rimuovila
        monthData.splice(existingEntryIndex, 1);
        if (monthData.length === 0) {
            monthsData.delete(monthKey);
        } else {
            monthsData.set(monthKey, monthData);
        }
    }

    // Salva i dati
    saveAllData();

    // Rimuovi la classe editing e aggiorna solo il contenuto della riga
    row.classList.remove('editing');
    const cells = Array.from(row.cells);
    
    // Aggiorna le celle con i nuovi valori
    cells[2].innerHTML = intensity ? createIntensityBar(intensity) : '';
    cells[3].textContent = location || '';
    cells[4].textContent = medication || '';
    cells[5].textContent = notes || '';
    cells[6].innerHTML = ''; // Rimuovi i pulsanti
}

// Funzione per annullare la modifica di una riga
function cancelEdit(row) {
    const date = row.getAttribute('data-date');
    const monthKey = date.substring(0, 7);
    const data = monthsData.get(monthKey) || [];
    const entry = data.find(e => e.date === date) || {
        date,
        intensity: '',
        location: '',
        medication: '',
        notes: ''
    };

    // Rimuovi la classe editing
    row.classList.remove('editing');
    
    // Ripristina i valori originali
    const cells = Array.from(row.cells);
    cells[2].innerHTML = entry.intensity ? createIntensityBar(entry.intensity) : '';
    cells[3].textContent = entry.location || '';
    cells[4].textContent = entry.medication || '';
    cells[5].textContent = entry.notes || '';
    cells[6].innerHTML = ''; // Rimuovi i pulsanti
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

    // Collega il datalist all'input
    input.setAttribute('list', 'medications-list');

    // Aggiorna la lista quando l'utente digita
    input.addEventListener('input', () => {
        // Svuota la lista
        datalist.innerHTML = '';

        // Se c'è almeno un carattere, mostra i suggerimenti
        if (input.value.trim().length > 0) {
            const medications = getUsedMedications();
            const searchTerm = input.value.toLowerCase();
            
            // Filtra i farmaci che iniziano con il termine di ricerca
            const filteredMedications = medications.filter(med => 
                med.toLowerCase().startsWith(searchTerm)
            );

            // Aggiungi i farmaci filtrati alla lista
            filteredMedications.forEach(med => {
                const option = document.createElement('option');
                option.value = med;
                datalist.appendChild(option);
            });
        }
    });
}

// Array dei giorni della settimana in italiano, partendo da Lunedì
const weekdays = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

// Funzione per creare la tabella dei dati
function createDataTable(entries) {
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th colspan="2">Giorno</th>
                <th>Int.</th>
                <th>Sede</th>
                <th>Farmaco</th>
                <th>Note</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');
    let prevDate = null;

    entries.forEach(entry => {
        const row = document.createElement('tr');
        row.setAttribute('data-date', entry.date);
        
        // Crea l'oggetto Date direttamente dalla data ISO
        const date = new Date(entry.date + 'T00:00:00');
        
        // Aggiungi le classi per la separazione delle settimane
        if (date.getDay() === 0) { // Domenica
            row.classList.add('end-of-week');
        }
        if (date.getDay() === 1) { // Lunedì
            row.classList.add('start-of-week');
        }

        // Ottieni solo il giorno e il nome del giorno
        const dayNum = getDayFromISODate(entry.date);
        const dayName = getDayName(date);

        row.innerHTML = `
            <td>${dayNum}</td>
            <td>${dayName}</td>
            <td>${createIntensityBar(entry.intensity)}</td>
            <td>${entry.location || ''}</td>
            <td>${entry.medication || ''}</td>
            <td>${entry.notes || ''}</td>
            <td class="action-buttons">
                <button class="edit-btn" title="Modifica">✎</button>
            </td>
        `;

        // Aggiungi la classe per le righe alternate
        if (isStripedDay(date.getFullYear(), date.getMonth(), dayNum)) {
            row.classList.add('striped');
        }

        tbody.appendChild(row);
        
        // Aggiungi l'event listener per il pulsante di modifica
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => makeRowEditable(row));
        
        prevDate = date;
    });

    return table;
}

// Funzione per ottenere solo il giorno da una data ISO
function getDayFromISODate(isoDate) {
    return new Date(isoDate).getDate();
}

// Funzione per salvare o annullare la modifica della riga corrente
function finishCurrentEdit() {
    const currentEditingRow = document.querySelector('tr.editing');
    if (currentEditingRow) {
        // Annulla la modifica della riga corrente
        cancelEdit(currentEditingRow);
        return true;
    }
    return false;
}

// Funzione per impostare la navigazione tra i mesi
function setupMonthNavigation() {
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');
    
    prevButton.addEventListener('click', () => {
        const months = Array.from(monthsData.keys());
        const currentIndex = months.indexOf(currentMonth);
        if (currentIndex > 0) {
            currentMonth = months[currentIndex - 1];
            displayMonth(currentMonth);
        }
    });
    
    nextButton.addEventListener('click', () => {
        const months = Array.from(monthsData.keys());
        const currentIndex = months.indexOf(currentMonth);
        if (currentIndex < months.length - 1) {
            currentMonth = months[currentIndex + 1];
            displayMonth(currentMonth);
        }
    });
}

// Funzione per rendere una riga editabile
function makeRowEditable(row) {
    if (row.classList.contains('editing')) return;
    
    // Se c'è già una riga in modifica, non permettere di editare altre righe
    const currentEditingRow = document.querySelector('tr.editing');
    if (currentEditingRow) return;
    
    const date = row.getAttribute('data-date');
    const monthKey = date.substring(0, 7);
    const data = monthsData.get(monthKey) || [];
    const entry = data.find(e => e.date === date) || {
        date,
        intensity: '',
        location: '',
        medication: '',
        notes: ''
    };

    row.classList.add('editing');
    
    // Crea gli input per ogni campo
    const cells = Array.from(row.cells);
    cells[2].innerHTML = createIntensityInput(entry.intensity);
    cells[3].innerHTML = createLocationInput(entry.location);
    cells[4].innerHTML = createMedicationInput(entry.medication);
    cells[5].innerHTML = createNotesInput(entry.notes);
    
    // Aggiungi i pulsanti di azione
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons-container';
    
    const saveButton = document.createElement('button');
    saveButton.innerHTML = '✓';
    saveButton.className = 'action-button save-btn';
    saveButton.onclick = () => saveRow(row);
    
    const clearButton = document.createElement('button');
    clearButton.innerHTML = '⌫';
    clearButton.className = 'action-button clear-btn';
    clearButton.onclick = () => clearValues(row);
    
    const cancelButton = document.createElement('button');
    cancelButton.innerHTML = '✕';
    cancelButton.className = 'action-button cancel-btn';
    cancelButton.onclick = () => cancelEdit(row);
    
    actionButtons.appendChild(saveButton);
    actionButtons.appendChild(clearButton);
    actionButtons.appendChild(cancelButton);
    
    cells[5].appendChild(actionButtons);
    
    // Inizializza l'autocomplete per il farmaco
    const medicationInput = cells[4].querySelector('input[name="medication"]');
    if (medicationInput) {
        setupMedicationAutocomplete(medicationInput);
    }
    
    // Focus sull'input dell'intensità
    const intensityInput = cells[2].querySelector('input');
    if (intensityInput) {
        intensityInput.focus();
    }
}

// Funzione per annullare la modifica di una riga
function cancelEdit(row) {
    const date = row.getAttribute('data-date');
    const monthKey = date.substring(0, 7);
    const data = monthsData.get(monthKey) || [];
    const entry = data.find(e => e.date === date) || {
        date,
        intensity: '',
        location: '',
        medication: '',
        notes: ''
    };

    // Rimuovi la classe editing
    row.classList.remove('editing');
    
    // Ripristina i valori originali
    const cells = Array.from(row.cells);
    cells[2].innerHTML = entry.intensity ? createIntensityBar(entry.intensity) : '';
    cells[3].textContent = entry.location || '';
    cells[4].textContent = entry.medication || '';
    cells[5].textContent = entry.notes || '';
    cells[6].innerHTML = ''; // Rimuovi i pulsanti
}

// Funzione per salvare una riga
function saveRow(row) {
    const date = row.getAttribute('data-date');
    const monthKey = date.substring(0, 7); // Prende YYYY-MM dalla data YYYY-MM-DD
    const monthData = monthsData.get(monthKey) || [];
    
    // Ottieni i valori dagli input
    const intensity = row.querySelector('select[name="intensity"]').value;
    const location = row.querySelector('select[name="location"]').value;
    const medication = row.querySelector('input[name="medication"]').value;
    const notes = row.querySelector('input[name="notes"]').value;

    // Trova l'indice dell'entry esistente o -1 se non esiste
    const entryIndex = monthData.findIndex(e => e.date === date);
    
    // Se tutti i campi sono vuoti, rimuovi l'entry
    if (!intensity && !location && !medication && !notes) {
        if (entryIndex !== -1) {
            monthData.splice(entryIndex, 1);
        }
    } else {
        // Altrimenti, aggiorna o aggiungi l'entry
        const entry = {
            date,
            intensity,
            location,
            medication,
            notes
        };
        
        if (entryIndex !== -1) {
            monthData[entryIndex] = entry;
        } else {
            monthData.push(entry);
        }
    }
    
    // Aggiorna i dati e salva
    monthsData.set(monthKey, monthData);
    saveAllData();
    
    // Aggiorna la visualizzazione
    displayMonth(monthKey);
}

// Gestione dell'overlay per il campo note su mobile
function setupNotesOverlay() {
    document.addEventListener('click', function(e) {
        if (e.target.matches('input[name="notes"]')) {
            // Crea l'overlay solo su mobile
            if (window.innerWidth <= 768) {
                const originalInput = e.target;
                const row = originalInput.closest('tr');
                
                // Rimuovi overlay esistente se presente
                const existingOverlay = document.querySelector('.notes-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                // Crea il nuovo overlay
                const overlay = document.createElement('div');
                overlay.className = 'notes-overlay';
                
                // Crea il textarea
                const textarea = document.createElement('textarea');
                textarea.className = 'notes-overlay-input';
                textarea.value = originalInput.value;
                
                // Crea i pulsanti
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'notes-overlay-buttons';
                
                const saveButton = document.createElement('button');
                saveButton.textContent = '✓';
                saveButton.className = 'notes-overlay-save';
                
                const cancelButton = document.createElement('button');
                cancelButton.textContent = '✕';
                cancelButton.className = 'notes-overlay-cancel';
                
                buttonsContainer.appendChild(saveButton);
                buttonsContainer.appendChild(cancelButton);
                
                // Aggiungi gli elementi all'overlay
                overlay.appendChild(textarea);
                overlay.appendChild(buttonsContainer);
                document.body.appendChild(overlay);
                
                // Focus sul textarea
                textarea.focus();
                
                // Gestisci il salvataggio
                saveButton.addEventListener('click', function() {
                    // Aggiorna il valore dell'input originale
                    originalInput.value = textarea.value;
                    
                    // Simula il click sul pulsante di salvataggio della riga
                    const saveBtn = row.querySelector('.save-btn');
                    if (saveBtn) {
                        saveBtn.click();
                    }
                    
                    overlay.remove();
                });
                
                // Gestisci la cancellazione
                cancelButton.addEventListener('click', function() {
                    overlay.remove();
                });
            }
        }
    });
}

// Gestione autenticazione
function checkAuthStatus() {
    fetch('/get_data')
        .then(response => {
            if (response.status === 403) {
                // Non autenticato o non autorizzato
                window.location.href = '/login';
            } else {
                // Autenticato
                loadDataFromFile();  // Carica i dati solo se autenticato
            }
        })
        .catch(error => {
            console.error('Error checking auth status:', error);
        });
}

// Chiama checkAuthStatus all'avvio
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});
