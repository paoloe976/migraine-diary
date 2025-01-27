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

// Funzione per visualizzare un mese specifico
function displayMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(num => parseInt(num));
    const monthData = monthsData.get(monthKey) || [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Crea un oggetto per mappare le date con i dati delle cefalee
    const headacheData = {};
    monthData.forEach(data => {
        headacheData[data.date] = data;
    });

    const tbody = document.getElementById('headacheTable').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    let headacheCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const formattedDate = formatDate(year, month, day);
        const weekday = getWeekday(year, month, day);
        const isWeekendDay = isWeekend(year, month, day);
        const endOfWeek = isEndOfWeek(year, month, day);
        const startOfWeek = isStartOfWeek(year, month, day);
        const isStriped = isStripedDay(year, month, day);
        
        if (dateStr in headacheData) {
            const { intensity, location, medication, notes } = headacheData[dateStr];
            const row = document.createElement('tr');
            if (endOfWeek) {
                row.classList.add('end-of-week');
            }
            if (startOfWeek) {
                row.classList.add('start-of-week');
            }
            if (isStriped) {
                row.classList.add('striped-row');
            }
            const intensityValue = parseInt(intensity);
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td class="${isWeekendDay ? 'weekend-day' : 'weekday'}">${weekday}</td>
                <td>
                    <div class="intensity-indicator">
                        <div class="intensity-bar intensity-${intensityValue}" 
                             style="width: ${(intensityValue/6)*100}%">
                        </div>
                    </div>
                    <small style="color: #666;">${intensityValue}/6</small>
                </td>
                <td><span class="location-badge location-${location.trim()}">${location.trim() === 'D' ? 'Diffusa' : 'Unilaterale'}</span></td>
                <td>${medication}</td>
                <td>${notes}</td>
            `;
            tbody.appendChild(row);
            headacheCount++;
        } else {
            tbody.appendChild(createEmptyRow(formattedDate, weekday, isWeekendDay, endOfWeek, startOfWeek, isStriped));
        }
    }

    document.getElementById('headacheCount').textContent = headacheCount;
    updateNavigationControls();
}

// Funzione per creare una riga vuota per una data
function createEmptyRow(date, weekday, isWeekendDay, endOfWeek, startOfWeek, isStriped) {
    const row = document.createElement('tr');
    if (endOfWeek) {
        row.classList.add('end-of-week');
    }
    if (startOfWeek) {
        row.classList.add('start-of-week');
    }
    if (isStriped) {
        row.classList.add('striped-row');
    }
    row.innerHTML = `
        <td>${date}</td>
        <td class="${isWeekendDay ? 'weekend-day' : 'weekday'}">${weekday}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
    `;
    return row;
}

// Funzione per formattare la data
function formatDate(year, month, day) {
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
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

// Funzione per verificare se è weekend
function isWeekend(year, month, day) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
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
    doc.text(formatMonth(new Date(year, month - 1)), 10, 15);
    
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
        // Converti la Map in un oggetto per la serializzazione
        const data = {};
        for (const [key, value] of monthsData) {
            data[key] = value;
        }

        // Invia i dati al server
        const response = await fetch('/api/data', {
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

// Funzione per caricare i dati dal file JSON
async function loadDataFromFile() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // Converti l'oggetto in Map
        monthsData = new Map(Object.entries(data));

        // Se ci sono dati, mostra il primo mese
        if (monthsData.size > 0) {
            currentMonthIndex = 0;
            const months = Array.from(monthsData.keys());
            displayMonth(months[currentMonthIndex]);
            document.querySelector('.navigation-controls').style.display = 'flex';
        }

        console.log('Dati caricati con successo');
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
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
