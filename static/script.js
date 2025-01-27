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

// Funzione per caricare e processare tutti i file
async function loadAllFiles(files) {
    const allData = new Map(monthsData); // Inizia con i dati esistenti
    
    // Leggi tutti i file
    const filePromises = Array.from(files)
        .filter(file => file.name.endsWith('.csv'))
        .map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve({ content: e.target.result, filename: file.name });
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
            const fileEntries = new Map(); // Mappa temporanea per le entry del file

            // Prima raccogli tutte le entry valide dal file
            lines.forEach(line => {
                if (line.trim()) {
                    const [date, intensity, location, medication, notes] = line.split(',');
                    if (date && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const parsedDate = parseDate(date);
                        const monthKey = getMonthKey(parsedDate);
                        
                        if (!fileEntries.has(monthKey)) {
                            fileEntries.set(monthKey, new Map());
                        }
                        
                        fileEntries.get(monthKey).set(date, {
                            date,
                            intensity,
                            location,
                            medication,
                            notes: notes ? notes.trim() : ''
                        });
                    }
                }
            });

            // Poi aggiorna solo le entry che sono nel file
            for (const [monthKey, monthEntries] of fileEntries) {
                if (!allData.has(monthKey)) {
                    allData.set(monthKey, []);
                }
                
                const existingEntries = allData.get(monthKey);
                
                // Per ogni entry nel file
                for (const [date, newEntry] of monthEntries) {
                    const existingIndex = existingEntries.findIndex(entry => entry.date === date);
                    
                    if (existingIndex === -1) {
                        // Nuova entry
                        existingEntries.push(newEntry);
                        newEntriesCount++;
                        console.log(`Aggiunta nuova entry per ${date}`);
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
        
        // Salva immediatamente i dati nel file JSON
        await saveAllData();
        
        // Se ci sono dati, mostra il primo mese
        if (monthsData.size > 0) {
            currentMonthIndex = 0;
            const months = Array.from(monthsData.keys());
            displayMonth(months[currentMonthIndex]);
            document.querySelector('.navigation-controls').style.display = 'flex';
            
            if (newEntriesCount > 0 || updatedEntriesCount > 0) {
                console.log(`Modifiche: ${newEntriesCount} nuove, ${updatedEntriesCount} aggiornate`);
            }
        } else {
            console.log('Nessun dato valido trovato nei file');
        }
    } catch (error) {
        console.error('Errore nel caricamento dei file:', error);
    }
}

// Funzione per mostrare i dati del mese
function displayMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(num => parseInt(num));
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDate = getCurrentDate();
    
    // Crea un oggetto per mappare le date con i dati delle cefalee
    const headacheData = new Map();
    (monthsData.get(monthKey) || []).forEach(data => {
        headacheData.set(data.date, data);
    });

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
                <th></th>
            </tr>
        </thead>
        <tbody>
            ${Array.from({length: daysInMonth}, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const date = new Date(year, month - 1, day);
                const dayOfWeek = date.getDay();
                const weekday = date.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();
                const entry = headacheData.get(dateStr);
                
                let weekdayClass = '';
                if (dayOfWeek === 6) weekdayClass = 'saturday';
                if (dayOfWeek === 0) weekdayClass = 'sunday';
                
                // Aggiungi la classe current-day se è il giorno corrente
                const isCurrentDay = dateStr === currentDate;
                const currentDayClass = isCurrentDay ? 'current-day' : '';
                
                return `
                    <tr data-date="${dateStr}" class="${currentDayClass}">
                        <td class="${currentDayClass}">${formatDate(dateStr)}</td>
                        <td class="${weekdayClass}">${weekday}</td>
                        <td>${entry ? entry.intensity : ''}</td>
                        <td>${entry ? entry.location : ''}</td>
                        <td>${entry ? entry.medication : ''}</td>
                        <td>${entry ? entry.notes : ''}</td>
                        <td></td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;

    // Aggiungi event listener per il click su tutte le righe
    table.querySelectorAll('tbody tr').forEach(row => {
        row.addEventListener('click', () => {
            if (!row.classList.contains('editing')) {
                makeRowEditable(row);
            }
        });
    });

    // Aggiorna il contenuto e il conteggio
    const container = document.getElementById('headacheData');
    container.innerHTML = '';
    container.appendChild(table);
    
    // Aggiorna il titolo del mese e il conteggio
    document.getElementById('currentMonth').textContent = formatMonthTitle(monthKey);
    document.getElementById('headacheCount').textContent = Array.from(headacheData.values()).length;
}

// Funzione per rendere una riga editabile
function makeRowEditable(row) {
    // Se c'è già una riga in editing, annulla prima quella
    const currentEditing = document.querySelector('tr.editing');
    if (currentEditing) {
        cancelEdit(currentEditing);
    }

    const template = document.getElementById('editRowTemplate');
    if (!template) {
        console.error('Template non trovato');
        return;
    }

    const newRow = template.content.cloneNode(true);
    const inputs = newRow.querySelectorAll('.edit-input');
    const date = row.getAttribute('data-date');
    
    // Mantieni data e giorno della settimana non editabili
    const cells = newRow.querySelectorAll('td');
    cells[0].textContent = row.cells[0].textContent; // Data
    cells[1].textContent = row.cells[1].textContent; // Giorno
    
    // Imposta i valori degli input e select
    inputs.forEach(input => {
        const cell = row.querySelector(`td:nth-child(${getColumnIndex(input.name)})`);
        const value = cell ? cell.textContent.trim() : '';
        
        if (input.tagName === 'SELECT') {
            // Se non c'è un valore valido, seleziona l'opzione vuota
            if (!Array.from(input.options).some(opt => opt.value === value.toLowerCase())) {
                input.value = '';
            } else {
                input.value = value.toLowerCase();
            }
        } else {
            input.value = value;
            
            // Setup autocompletamento per il campo farmaco
            if (input.name === 'medication') {
                setupMedicationAutocomplete(input);
            }
        }
    });

    // Aggiungi event listener per i pulsanti
    const saveBtn = newRow.querySelector('.save-btn');
    const cancelBtn = newRow.querySelector('.cancel-btn');
    const clearBtn = newRow.querySelector('.clear-btn');
    
    saveBtn.addEventListener('click', () => saveRow(row));
    cancelBtn.addEventListener('click', () => cancelEdit(row));
    clearBtn.addEventListener('click', () => {
        inputs.forEach(input => {
            if (input.tagName === 'SELECT') {
                input.value = '';
            } else {
                input.value = '';
            }
        });
    });

    // Sostituisci la riga originale
    const editRow = newRow.querySelector('tr');
    editRow.dataset.date = date; // Mantieni l'attributo data-date
    row.parentNode.replaceChild(editRow, row);
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

// Funzione per formattare la data
function formatDate(dateStr) {
    // Se la data è già nel formato YYYY-MM-DD, formattala in DD/MM/YYYY
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    
    // Altrimenti è un oggetto Date
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Array dei giorni della settimana in italiano, partendo da Lunedì
const weekdays = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

// Funzione per ottenere il giorno della settimana (0 = Lunedì, 6 = Domenica)
function getWeekday(year, month, day) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    // Converti da domenica = 0 a lunedì = 0
    return weekdays[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
}

// Funzione per verificare se è l'ultimo giorno della settimana (Domenica)
function isEndOfWeek(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0;
}

// Funzione per verificare se è il primo giorno della settimana (Lunedì)
function isStartOfWeek(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 1;
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
    currentMonthSpan.textContent = formatMonth(new Date(year, month - 1));
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
        6: [153, 0, 0]      // #990000
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
        const fillWidth = (width * intensity) / 6;  // Lunghezza proporzionale all'intensità
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
            if (data.column.index === 1 && data.row.raw[1] && data.row.raw[1].intensity) {
                const intensity = data.row.raw[1].intensity;
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
        const data = {};
        for (const [key, value] of monthsData) {
            data[key] = value;
        }
        
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
        
        // Converte i dati in una Map
        monthsData = new Map();
        for (const [key, entries] of Object.entries(data)) {
            monthsData.set(key, entries);
        }
        
        // Mostra il mese corrente all'apertura
        const currentMonth = getCurrentMonth();
        if (!monthsData.has(currentMonth)) {
            monthsData.set(currentMonth, []);
        }
        
        displayMonth(currentMonth);
        document.querySelector('.navigation-controls').style.display = 'flex';
        
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        // Inizializza una Map vuota in caso di errore
        monthsData = new Map();
    }
}

// Carica i dati all'avvio
document.addEventListener('DOMContentLoaded', async () => {
    await loadDataFromFile();
    setupMonthNavigation();
    setupFileInput();
    setupExportPdf();
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

// Funzione per salvare una riga
async function saveRow(originalRow) {
    const editRow = document.querySelector('tr.editing');
    if (!editRow) return;

    const inputs = editRow.querySelectorAll('.edit-input');
    const date = editRow.getAttribute('data-date');
    
    // Raccogli i valori, capitalizzando la prima lettera per i select
    const newData = {
        date: date,
        intensity: inputs[0].value,
        location: inputs[1].value ? inputs[1].value.charAt(0).toUpperCase() + inputs[1].value.slice(1) : '',
        medication: inputs[2].value.trim(),
        notes: inputs[3].value.trim()
    };

    // Se tutti i campi sono vuoti, rimuovi l'entry
    const isEmpty = Object.entries(newData)
        .filter(([key]) => key !== 'date')
        .every(([_, value]) => value === '');

    // Aggiorna i dati in memoria
    const monthKey = getMonthKey(parseDate(date));
    let monthData = monthsData.get(monthKey) || [];
    const entryIndex = monthData.findIndex(e => e.date === date);
    
    if (isEmpty) {
        // Se la riga è vuota e esisteva, rimuovila
        if (entryIndex !== -1) {
            monthData.splice(entryIndex, 1);
        }
    } else {
        // Altrimenti aggiorna o aggiungi
        if (entryIndex !== -1) {
            monthData[entryIndex] = newData;
        } else {
            monthData.push(newData);
        }
    }
    
    monthsData.set(monthKey, monthData);

    // Salva nel database
    await saveAllData();

    // Aggiorna la visualizzazione
    displayMonth(monthKey);
}

// Funzione per annullare l'editing
function cancelEdit(row) {
    const monthKey = getMonthKey(parseDate(row.getAttribute('data-date')));
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
