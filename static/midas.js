// Initialize jsPDF
window.jsPDF = window.jspdf.jsPDF;

// Update range value display
document.getElementById('qB').addEventListener('input', function(e) {
    document.getElementById('qBValue').textContent = e.target.value;
});

// Form validation
document.getElementById('midasForm').addEventListener('submit', function(e) {
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        const value = parseInt(input.value);
        if (value < 0 || value > 90) {
            e.preventDefault();
            alert('I valori devono essere compresi tra 0 e 90 giorni');
        }
    });
});

async function generateAndUploadPDF(event) {
    event.preventDefault();
    
    // Mostra lo spinner
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    
    try {
        // Create PDF
        const doc = new jsPDF();
        
        // Set font
        doc.setFont("helvetica");
        
        // Nome e Data sulla stessa riga in alto
        doc.setFont("times", "bolditalic");
        
        // Etichetta e valore del nome
        doc.setFontSize(11);
        doc.text("Cognome e Nome", 20, 30);
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        const nomeValue = document.getElementById('nome').value;
        doc.text(nomeValue, 52, 29);
        
        // Etichetta e valore della data
        doc.setFont("times", "bolditalic");
        doc.setFontSize(11);
        doc.text("data", 150, 30);
        
        // Calcolo la larghezza della parola "data" per posizionare la linea
        const dataWidth = doc.getTextWidth("data");
        
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        const dataValue = document.getElementById('data').value;
        doc.text(dataValue, 153 + dataWidth + 2, 29);
        
        // Disegno le linee
        doc.setLineWidth(0.1);
        doc.line(50, 30, 140, 30); // linea per il nome
        doc.line(153 + dataWidth, 30, 190, 30); // linea per la data inizia subito dopo la parola "data"
        
        // Titolo centrato con più spazio sopra e sotto
        doc.setFontSize(14);
        doc.text("Questionario MIDAS*", 105, 45, { align: "center" }); // Più spazio dal nome
        
        // Istruzioni in Times New Roman
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        
        // Le righe esatte come nell'immagine
        const istruzioni = [
            "ISTRUZIONI: risponda, per favore, alle domande che seguono relativamente a TUTTI i mal di testa di cui ha sofferto",
            "negli ultimi 3 mesi. Scriva la sua risposta nella casella a fianco di ogni domanda. Scriva zero se non ha svolto nel corso",
            "degli ultimi tre mesi le attività indicate nelle domande."
        ];
        
        let y = 60; // Più spazio dopo il titolo
        istruzioni.forEach(line => {
            doc.text(line, 20, y);
            y += 5;
        });
        
        // Aggiungo spazio extra dopo le istruzioni
        y += 10;
        
        // Salvo la posizione iniziale per le domande
        const startQuestionsY = y;
        
        // Torna a Helvetica per il resto del documento
        doc.setFont("helvetica");
        
        // Add questions and answers
        doc.setFontSize(10);
        y = startQuestionsY; // Uso la posizione salvata invece di un valore fisso
        
        const questions = [
            { id: 'q1', text: '1. Quanti giorni di assenza dal lavoro o da scuola ha fatto negli ultimi tre mesi a causa del mal di testa?' },
            { id: 'q2', text: '2. Per quanti giorni, nel corso degli ultimi tre mesi, il suo rendimento sul lavoro o a scuola si è ridotto della metà a causa del mal di testa?', note: '(Non conteggi i giorni di assenza dal lavoro o da scuola che ha già indicato nella risposta alla prima domanda)' },
            { id: 'q3', text: '3. Per quanti giorni, nel corso degli ultimi tre mesi, non ha svolto i lavori di casa a causa del mal di testa?' },
            { id: 'q4', text: '4. Per quanti giorni, nel corso degli ultimi tre mesi, il suo rendimento nei lavori di casa si è ridotto della metà a causa del mal di testa?', note: '(Non conteggi i giorni che ha già indicato nella risposta alla terza domanda)' },
            { id: 'q5', text: '5. Per quanti giorni, nel corso degli ultimi tre mesi, non ha partecipato ad attività familiari, sociali o di svago a causa del mal di testa?' },
            { id: 'qA', text: 'A. Per quanti giorni, nel corso degli ultimi tre mesi, ha sofferto di mal di testa?', note: '(Se un mal di testa è durato più di un giorno, sommi tutti i giorni)' },
            { id: 'qB', text: 'B. Su una scala da 0 a 10, quale è stata mediamente l\'intensità del dolore durante questi mal di testa?', note: '(Dove 0 = assenza di dolore e 10 = dolore fortissimo, non potrebbe esser peggio)' }
        ];
        
        questions.forEach(q => {
            // Separare il numero dalla domanda
            const questionNumber = q.text.split('.')[0] + '.';
            const questionText = q.text.split('.').slice(1).join('.').trim();
            
            // Stampare il numero in Times New Roman
            doc.setFont("times", "normal");
            doc.text(questionNumber, 20, y);
            
            // Impostare il font in Times New Roman grassetto per la domanda principale
            doc.setFont("times", "bold");
            
            // Gestire il testo con rientro appropriato - larghezza maggiore per permettere più testo per riga
            const splitText = doc.splitTextToSize(questionText, 130);
            doc.text(splitText, 28, y);
            
            let currentY = y + (splitText.length * 6);
            
            // Aggiungere la nota in italico sulla riga successiva
            if (q.note) {
                doc.setFont("times", "italic");
                const splitNote = doc.splitTextToSize(q.note, 130);
                doc.text(splitNote, 28, currentY);
                currentY += splitNote.length * 6;
            }
            
            // Tornare al font normale per il resto
            doc.setFont("helvetica", "normal");
            
            // Spostare i quadrati più a sinistra - allineati con l'ultima riga di testo
            const lastLineY = currentY - 6; // posizione dell'ultima riga di testo
            doc.rect(165, lastLineY - 4, 5, 5);
            doc.rect(171, lastLineY - 4, 5, 5);
            
            // Inserire il valore dividendolo tra i due quadrati
            const value = document.getElementById(q.id).value.toString().padStart(2, '0');
            if (value.length === 2) {
                doc.text(value[0], 167, lastLineY);
                doc.text(value[1], 173, lastLineY);
            } else {
                doc.text(value, 173, lastLineY);
            }
            
            // Aggiungere "giorni" dopo i quadrati in Times New Roman grassetto
            if (q.id !== 'qB') {
                doc.setFont("times", "bold");
                doc.text("giorni", 180, lastLineY);
            }
            
            // Aggiungere la linea di separazione sotto tutto il testo
            doc.setLineWidth(0.1);
            doc.line(20, currentY + 2, 190, currentY + 2);
            
            // Aggiornare y per la prossima domanda
            y = currentY + 8;
        });
        
        // Add footer
        doc.setFont("times", "italic");
        doc.setFontSize(10); // Aumentato da 9 a 10
        const footer = [
            "*Copyright Innovative Medical Research 1997",
            "Versione italiana sviluppata nel contesto del Programma di ricerca finalizzata Ministero della Sanità,",
            "convenzione n. ICS 030.3/RF98.38 - Centro Cefalee Istituto Neurologico C. Besta, Milano"
        ];
        y = 270;
        footer.forEach((line, index) => {
            doc.text(line, 25, y + (index * 4));
        });

        // Generate timestamp for filename
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        const filename = `midas_${timestamp}.pdf`;
        
        // Convert PDF to blob
        const pdfBlob = doc.output('blob');
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', pdfBlob, filename);
        
        // Upload to server
        const response = await fetch('/save_midas', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mostra il toast
            const toastEl = document.getElementById('saveToast');
            const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
            toast.show();
        } else {
            throw new Error(result.message || 'Errore durante il salvataggio');
        }
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante il salvataggio del questionario: ' + error.message);
    } finally {
        // Nascondi lo spinner alla fine
        spinner.style.display = 'none';
    }
    
    return false;
}
