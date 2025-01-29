let currentMonth;
let monthsData = new Map(); // Mappa di mesi -> array di dati

// Funzioni di utilità
function parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
    return new Date(year, month - 1, day);
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function convertToISODate(italianDate) {
    const [day, month, year] = italianDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function isISODate(dateStr) {
    const cleanDate = dateStr.replace(/^"|"$/g, '');
    return cleanDate && cleanDate.match(/^\d{4}-\d{2}-\d{2}$/);
}

function normalizeLocation(location) {
    if (!location) return '';
    const normalized = locationMap[location.toLowerCase()];
    return normalized || '';
}

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

function processCSVRow(row) {
    const date = row.data;
    const intensity = row.intensita?.toString() || '';
    const location = normalizeLocation(row.sede);
    const medication = row.farmaco || '';
    const notes = row.note || '';

    const isoDate = isISODate(date) ? date : convertToISODate(date);
    const parsedDate = parseDate(isoDate);
    const monthKey = getMonthKey(parsedDate);

    return {
        date: isoDate,
        intensity,
        location,
        medication,
        notes
    };
}

async function loadAllFiles(files) {
    console.log('Files ricevuti:', files);
    const allData = new Map(monthsData); // Inizia con i dati esistenti
    console.log('Dati esistenti:', [...monthsData.entries()]);
    
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
        
        contents.forEach(({content, filename}) => {
            console.log(`Processando file: ${filename}`);
            const lines = content.split('\n');
            console.log(`Numero di linee nel file: ${lines.length}`);
            const fileEntries = new Map();

            lines.forEach((line, index) => {
                if (line.trim()) {
                    const [date, intensity, location, medication, notes] = line.split(',');
                    console.log(`Linea ${index}:`, { date, intensity, location, medication, notes });
                    
                    const cleanDate = date.replace(/^"|"$/g, '');
                    const cleanIntensity = intensity ? intensity.replace(/^"|"$/g, '') : '';
                    const cleanLocation = location ? location.replace(/^"|"$/g, '') : '';
                    const cleanMedication = medication ? medication.replace(/^"|"$/g, '') : '';
                    const cleanNotes = notes ? notes.replace(/^"|"$/g, '') : '';

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

            for (const [monthKey, monthEntries] of fileEntries) {
                if (!allData.has(monthKey)) {
                    allData.set(monthKey, []);
                    console.log(`Creato nuovo mese: ${monthKey}`);
                }
                
                const existingEntries = allData.get(monthKey);
                
                for (const [date, newEntry] of monthEntries) {
                    const existingIndex = existingEntries.findIndex(entry => entry.date === date);
                    
                    if (existingIndex === -1) {
                        existingEntries.push(newEntry);
                        newEntriesCount++;
                        console.log(`Aggiunta nuova entry per ${date}:`, newEntry);
                    } else {
                        console.log(`Aggiornamento entry per ${date}:`, newEntry);
                        existingEntries[existingIndex] = newEntry;
                        updatedEntriesCount++;
                    }
                }
            }
        });

        monthsData = new Map([...allData.entries()].sort().map(([key, entries]) => {
            return [key, entries.sort((a, b) => a.date.localeCompare(b.date))];
        }));
        
        console.log('Dati finali:', [...monthsData.entries()]);
        
        await saveAllData();
        
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

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

function createIntensityBar(intensity) {
    if (!intensity) return '';
    return `
        <div class="intensity-bar intensity-${intensity}">
            <div class="intensity-bar-fill"></div>
            <div class="intensity-value">${intensity}</div>
        </div>
    `;
}

function displayMonth(monthKey) {
    console.log('Visualizzazione mese:', monthKey);
    const container = document.getElementById('headacheData');
    if (!container) {
        console.error('Container headacheData non trovato');
        return;
    }

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

        if (isCurrentMonth && day === currentDay) {
            row.classList.add('current-day');
        }

        const dateObj = new Date(entry.date + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0 = domenica, 1 = lunedì, ...
        
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

    container.innerHTML = '';
    container.appendChild(table);

    updateNavigationControls();

    const headacheCount = monthData.filter(entry => entry.intensity).length;
    document.getElementById('headacheCount').textContent = headacheCount;

    container.querySelectorAll('tr.clickable-row').forEach(row => {
        row.addEventListener('click', (event) => {
            if (!row.classList.contains('editing') && !event.target.closest('button')) {
                makeRowEditable(row);
            }
        });
    });
}

function getColumnIndex(name) {
    const indices = {
        'intensity': 3,
        'location': 4,
        'medication': 5,
        'notes': 6
    };
    return indices[name] || 1;
}

function formatDateFromDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function getDayName(date) {
    return weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Converte da DOM=0,LUN=1 a LUN=0,DOM=6
}

function isEndOfWeek(year, month, day) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    console.log(`Data: ${year}-${month}-${day}, giorno della settimana: ${dayOfWeek} (0=DOM, 1=LUN, ...)`);
    return dayOfWeek === 0; // 0 = domenica
}

function isStartOfWeek(year, month, day) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    console.log(`Data: ${year}-${month}-${day}, giorno della settimana: ${dayOfWeek} (0=DOM, 1=LUN, ...)`);
    return dayOfWeek === 1; // 1 = lunedì
}

function isStripedDay(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getDate() % 2 === 0;
}

function updateNavigationControls() {
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');
    
    prevButton.disabled = false;
    nextButton.disabled = false;
    
    const today = new Date();
    const currentDate = new Date(currentMonth + '-01');
    
    if (monthsData.size > 0) {
        const months = Array.from(monthsData.keys()).sort();
        const firstMonth = months[0];
        const lastMonth = months[months.length - 1];
        
        if (currentMonth <= firstMonth) {
            prevButton.disabled = true;
        }
        
        if (currentMonth >= lastMonth) {
            nextButton.disabled = true;
        }
    }
}

function formatMonth(date) {
    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonthTitle(monthKey) {
    const [year, month] = monthKey.split('-').map(num => parseInt(num));
    return formatMonth(new Date(year, month - 1));
}

const { jsPDF } = window.jspdf;

function exportCurrentMonth() {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    const intensityColors = {
        1: [255, 153, 153], // #FF9999
        2: [255, 102, 102], // #FF6666
        3: [255, 51, 51],   // #FF3333
        4: [255, 0, 0],     // #FF0000
        5: [204, 0, 0],     // #CC0000
    };
    
    const monthData = monthsData.get(currentMonth) || [];
    const [year, month] = currentMonth.split('-');
    
    doc.setFontSize(14);
    const title = formatMonthTitle(currentMonth);
    doc.text(title, 10, 15);
    
    const headacheCount = monthData.filter(data => 
        data.intensity || 
        data.location || 
        data.medication || 
        data.notes
    ).length;
    
    doc.setFontSize(10);
    const countText = `Totale cefalee: ${headacheCount}`;
    doc.text(countText, doc.internal.pageSize.width - 10, 15, { align: 'right' });

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

    const headachesByDate = {};
    monthData.forEach(data => {
        headachesByDate[data.date] = data;
    });

    const rows = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    function drawIntensityBar(intensity, x, y, width, cellHeight) {
        if (intensity === '' || !intensityColors[intensity]) return;
        
        const color = intensityColors[intensity];
        const fillWidth = (width * intensity) / 5;  // Lunghezza proporzionale all'intensità
        const barHeight = 4.5;  // Aumentata da 3 a 4.5
        
        const yCenter = y + (cellHeight - barHeight) / 2;
        
        const currentFillColor = doc.getFillColor();
        const currentTextColor = doc.getTextColor();
        const currentFontSize = doc.getFontSize();
        
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, yCenter, fillWidth, barHeight, barHeight/2, barHeight/2, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(intensity.toString(), x + fillWidth/2, yCenter + barHeight/2, { 
            align: 'center', 
            baseline: 'middle'
        });
        
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

    const fileName = `diario_cefalee_${year}_${month.toString().padStart(2, '0')}.pdf`;
    doc.save(fileName);
}

function exportToCsv() {
    const csvRows = ['Data,Intensità,Localizzazione,Farmaco,Note'];
    
    const sortedMonths = Array.from(monthsData.keys()).sort();
    
    for (const monthKey of sortedMonths) {
        const monthData = monthsData.get(monthKey);
        if (!monthData) continue;
        
        const sortedEntries = monthData.sort((a, b) => a.date.localeCompare(b.date));
        
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
        monthsData = new Map(Object.entries(data));
        return true;
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        monthsData = new Map();
        return false;
    }
}

// Funzioni di setup
function setupExportPdf() {
    const exportPdfButton = document.getElementById('exportPdf');
    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', exportCurrentMonth);
    }
}

function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async (event) => {
            if (event.target.files.length > 0) {
                await loadAllFiles(event.target.files);
                displayMonth(getCurrentMonth());
            }
        });
    }
}

function setupDropdownMenu() {
    const menuButton = document.getElementById('menuButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const importButton = document.getElementById('importButton');
    const fileInput = document.getElementById('fileInput');
    const exportPdfButton = document.getElementById('exportPdf');
    const exportCsvButton = document.getElementById('exportCsv');

    if (!menuButton || !dropdownMenu) return;

    document.addEventListener('click', (e) => {
        if (!menuButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    menuButton.addEventListener('click', () => {
        dropdownMenu.classList.toggle('show');
    });

    if (importButton && fileInput) {
        importButton.addEventListener('click', () => {
            fileInput.click();
            dropdownMenu.classList.remove('show');
        });
    }

    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });
    }

    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', () => {
            exportToCsv();
            dropdownMenu.classList.remove('show');
        });
    }
}

// Gestione autenticazione
async function checkAuthStatus() {
    console.log('checkAuthStatus chiamata');
    try {
        const response = await fetch('/get_data');
        if (response.status === 403) {
            console.log('Non autenticato, redirect a login');
            window.location.href = '/login';
            return;
        }
        
        console.log('Autenticato, carico i dati');
        const success = await loadDataFromFile();
        if (success) {
            console.log('Dati caricati, mostro il mese:', currentMonth);
            displayMonth(currentMonth);
            
            // Inizializza i componenti UI dopo che i dati sono stati caricati
            setupExportPdf();
            setupFileInput();
            setupDropdownMenu();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}

// All'avvio, imposta il mese corrente e inizializza l'UI di base
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded principale');
    
    // Imposta il mese corrente
    currentMonth = getCurrentMonth();
    
    // Mostra i controlli di navigazione
    const navigationControls = document.querySelector('.navigation-controls');
    if (navigationControls) {
        navigationControls.style.display = 'flex';
    }
    
    // Inizializza il selettore del mese
    const monthPickerElement = document.querySelector("#monthSelect");
    if (monthPickerElement) {
        monthPickerElement.value = currentMonth;
        monthPickerElement.addEventListener('change', (event) => {
            currentMonth = event.target.value;
            displayMonth(currentMonth);
        });
    }

    // Inizializza i pulsanti di navigazione
    const prevButton = document.getElementById('prevMonth');
    const nextButton = document.getElementById('nextMonth');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            const date = new Date(currentMonth + '-01');
            date.setMonth(date.getMonth() - 1);
            currentMonth = date.toISOString().substring(0, 7);
            if (monthPickerElement) monthPickerElement.value = currentMonth;
            displayMonth(currentMonth);
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const date = new Date(currentMonth + '-01');
            date.setMonth(date.getMonth() + 1);
            currentMonth = date.toISOString().substring(0, 7);
            if (monthPickerElement) monthPickerElement.value = currentMonth;
            displayMonth(currentMonth);
        });
    }
    
    // Avvia il caricamento dei dati e l'inizializzazione
    checkAuthStatus();
});

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

function createMedicationInput(value) {
    return `
        <input type="text" 
               class="edit-input" 
               name="medication" 
               value="${value}" 
               list="medications-list">
    `;
}

function createNotesInput(value) {
    return `<input type="text" class="edit-input" name="notes" value="${value || ''}">`;
}

function clearValues(row) {
    const intensitySelect = row.querySelector('select[name="intensity"]');
    const locationSelect = row.querySelector('select[name="location"]');
    const medicationInput = row.querySelector('input[name="medication"]');
    const notesInput = row.querySelector('input[name="notes"]');

    if (intensitySelect) intensitySelect.value = '';
    if (locationSelect) locationSelect.value = '';
    if (medicationInput) medicationInput.value = '';
    if (notesInput) notesInput.value = '';
}

function saveRow(row) {
    document.body.classList.remove('has-editing-row');
    
    const date = row.getAttribute('data-date');
    const monthKey = date.substring(0, 7); // Prende YYYY-MM dalla data YYYY-MM-DD
    const monthData = monthsData.get(monthKey) || [];
    const existingEntryIndex = monthData.findIndex(e => e.date === date);

    const intensity = row.querySelector('select[name="intensity"]').value;
    const location = row.querySelector('select[name="location"]').value;
    const medication = row.querySelector('input[name="medication"]').value;
    const notes = row.querySelector('input[name="notes"]').value;

    if (intensity || location || medication || notes) {
        const entry = {
            date,
            intensity,
            location,
            medication,
            notes
        };

        if (existingEntryIndex !== -1) {
            monthData[existingEntryIndex] = entry;
        } else {
            monthData.push(entry);
        }

        monthsData.set(monthKey, monthData);
    } else if (existingEntryIndex >= 0) {
        monthData.splice(existingEntryIndex, 1);
        if (monthData.length === 0) {
            monthsData.delete(monthKey);
        } else {
            monthsData.set(monthKey, monthData);
        }
    }

    saveAllData();

    row.classList.remove('editing');
    const cells = Array.from(row.cells);
    
    cells[2].innerHTML = intensity ? createIntensityBar(intensity) : '';
    cells[3].textContent = location || '';
    cells[4].textContent = medication || '';
    cells[5].textContent = notes || '';
    cells[6].innerHTML = ''; // Rimuovi i pulsanti
}

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

    row.classList.remove('editing');
    
    const cells = Array.from(row.cells);
    cells[2].innerHTML = entry.intensity ? createIntensityBar(entry.intensity) : '';
    cells[3].textContent = entry.location || '';
    cells[4].textContent = entry.medication || '';
    cells[5].textContent = entry.notes || '';
    cells[6].innerHTML = ''; // Rimuovi i pulsanti
}

function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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

function setupMedicationAutocomplete(input) {
    let datalist = document.getElementById('medications-list');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'medications-list';
        document.body.appendChild(datalist);
    }

    input.setAttribute('list', 'medications-list');

    input.addEventListener('input', () => {
        datalist.innerHTML = '';

        if (input.value.trim().length > 0) {
            const medications = getUsedMedications();
            const searchTerm = input.value.toLowerCase();
            
            const filteredMedications = medications.filter(med => 
                med.toLowerCase().startsWith(searchTerm)
            );

            filteredMedications.forEach(med => {
                const option = document.createElement('option');
                option.value = med;
                datalist.appendChild(option);
            });
        }
    });
}

const weekdays = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

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
        
        const date = new Date(entry.date + 'T00:00:00');
        
        if (date.getDay() === 0) { // Domenica
            row.classList.add('end-of-week');
        }
        if (date.getDay() === 1) { // Lunedì
            row.classList.add('start-of-week');
        }

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

        if (isStripedDay(date.getFullYear(), date.getMonth(), dayNum)) {
            row.classList.add('striped');
        }

        tbody.appendChild(row);
        
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => makeRowEditable(row));
        
        prevDate = date;
    });

    return table;
}

function getDayFromISODate(isoDate) {
    return new Date(isoDate).getDate();
}

function finishCurrentEdit() {
    const currentEditingRow = document.querySelector('tr.editing');
    if (currentEditingRow) {
        cancelEdit(currentEditingRow);
        return true;
    }
    return false;
}

function makeRowEditable(row) {
    if (row.classList.contains('editing')) return;
    
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
    
    const cells = Array.from(row.cells);
    cells[2].innerHTML = createIntensityInput(entry.intensity);
    cells[3].innerHTML = createLocationInput(entry.location);
    cells[4].innerHTML = createMedicationInput(entry.medication);
    cells[5].innerHTML = createNotesInput(entry.notes);
    
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
    
    const medicationInput = cells[4].querySelector('input[name="medication"]');
    if (medicationInput) {
        setupMedicationAutocomplete(medicationInput);
    }
    
    const intensityInput = cells[2].querySelector('input');
    if (intensityInput) {
        intensityInput.focus();
    }
}

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

    row.classList.remove('editing');
    
    const cells = Array.from(row.cells);
    cells[2].innerHTML = entry.intensity ? createIntensityBar(entry.intensity) : '';
    cells[3].textContent = entry.location || '';
    cells[4].textContent = entry.medication || '';
    cells[5].textContent = entry.notes || '';
    cells[6].innerHTML = ''; // Rimuovi i pulsanti
}

function saveRow(row) {
    const date = row.getAttribute('data-date');
    const monthKey = date.substring(0, 7); // Prende YYYY-MM dalla data YYYY-MM-DD
    const monthData = monthsData.get(monthKey) || [];
    
    const intensity = row.querySelector('select[name="intensity"]').value;
    const location = row.querySelector('select[name="location"]').value;
    const medication = row.querySelector('input[name="medication"]').value;
    const notes = row.querySelector('input[name="notes"]').value;

    const existingEntryIndex = monthData.findIndex(e => e.date === date);
    
    if (intensity || location || medication || notes) {
        const entry = {
            date,
            intensity,
            location,
            medication,
            notes
        };

        if (existingEntryIndex !== -1) {
            monthData[existingEntryIndex] = entry;
        } else {
            monthData.push(entry);
        }

        monthsData.set(monthKey, monthData);
    } else if (existingEntryIndex >= 0) {
        monthData.splice(existingEntryIndex, 1);
        if (monthData.length === 0) {
            monthsData.delete(monthKey);
        } else {
            monthsData.set(monthKey, monthData);
        }
    }

    saveAllData();

    row.classList.remove('editing');
    const cells = Array.from(row.cells);
    
    cells[2].innerHTML = intensity ? createIntensityBar(intensity) : '';
    cells[3].textContent = location || '';
    cells[4].textContent = medication || '';
    cells[5].textContent = notes || '';
    cells[6].innerHTML = ''; // Rimuovi i pulsanti
}

function setupNotesOverlay() {
    document.addEventListener('click', function(e) {
        if (e.target.matches('input[name="notes"]')) {
            if (window.innerWidth <= 768) {
                const originalInput = e.target;
                const row = originalInput.closest('tr');
                
                const existingOverlay = document.querySelector('.notes-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }

                const overlay = document.createElement('div');
                overlay.className = 'notes-overlay';
                
                const textarea = document.createElement('textarea');
                textarea.className = 'notes-overlay-input';
                textarea.value = originalInput.value;
                
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
                
                overlay.appendChild(textarea);
                overlay.appendChild(buttonsContainer);
                document.body.appendChild(overlay);
                
                textarea.focus();
                
                saveButton.addEventListener('click', function() {
                    originalInput.value = textarea.value;
                    
                    const saveBtn = row.querySelector('.save-btn');
                    if (saveBtn) {
                        saveBtn.click();
                    }
                    
                    overlay.remove();
                });
                
                cancelButton.addEventListener('click', function() {
                    overlay.remove();
                });
            }
        }
    });
}

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
