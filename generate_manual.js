const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Putanje do slika
const imgUser = "C:\\Users\\Pero\\.gemini\\antigravity\\brain\\d317b24c-878e-409b-9420-cc1ca3eb7499\\user_scanner_mockup_1779998749786.png";
const imgAdmin = "C:\\Users\\Pero\\.gemini\\antigravity\\brain\\d317b24c-878e-409b-9420-cc1ca3eb7499\\admin_dashboard_mockup_1779998762598.png";
const fontPath = "C:\\Windows\\Fonts\\arial.ttf";
const fontBoldPath = "C:\\Windows\\Fonts\\arialbd.ttf";

// Kreiranje dokumenta sa marginama od 40px
const doc = new PDFDocument({ margin: 40, size: 'A4' });
const outputPath = path.join(__dirname, 'Uputstvo_za_koriscenje.pdf');
const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Registracija fontova za podršku srpskih karaktera (š, đ, č, ć, ž)
doc.registerFont('Arial', fontPath);
doc.registerFont('Arial-Bold', fontBoldPath);

// Pomoćna funkcija za crtanje zaglavlja
function drawHeader(title) {
    // Tamno plava linija na vrhu
    doc.rect(40, 40, 515, 30).fill('#1e293b');
    doc.fillColor('#ffffff').font('Arial-Bold').fontSize(12).text('FuelTrack Pro V2 - Mobilni Sistem za Praćenje Potrošnje Goriva', 50, 49);
    
    // Podnaslov stranice
    doc.fillColor('#1e293b').fontSize(16).text(title, 40, 85);
    doc.moveTo(40, 105).lineTo(555, 105).strokeColor('#e2e8f0').lineWidth(1.5).stroke();
    doc.y = 115;
}

// Pomoćna funkcija za crtanje podnožja
function drawFooter(pageNum) {
    doc.moveTo(40, 780).lineTo(555, 780).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    doc.fillColor('#64748b').font('Arial').fontSize(9).text('FuelTrack Pro V2 - Korisničko i Administratorsko Uputstvo', 40, 788);
    doc.text(`Stranica ${pageNum} od 3`, 500, 788, { align: 'right' });
}

// ==========================================
// STRANICA 1: UVOD & KORISNIČKO UPUTSTVO
// ==========================================
drawHeader('KORISNIČKO UPUTSTVO (Za Vozače i Operatere)');

doc.font('Arial').fontSize(10).fillColor('#334155');
doc.text('Dobrodošli u FuelTrack Pro V2. Aplikacija je optimizovana za mobilne uređaje i omogućava brzo i pouzdano evidentiranje točenja goriva u vozni park pomoću pametnih telefona.', { align: 'justify' });
doc.moveDown(1.5);

// Koraci za korisnike
doc.font('Arial-Bold').fontSize(12).fillColor('#1e293b').text('Brzi koraci za evidentiranje točenja goriva:');
doc.moveDown(0.5);

const userSteps = [
    '1. Logovanje na sistem: Pristupite aplikaciji i unesite svoje korisničko ime i lozinku.',
    '2. Izbor Vozila: Iz padajućeg menija izaberite vozilo u koje sipate gorivo.',
    '3. Unos Kilometraže: Unesite trenutnu kilometražu sa instrument table. Aplikacija i server će vas automatski upozoriti i blokirati ako pokušate uneti vrednost manju ili jednaku poslednjoj zabeleženoj.',
    '4. Skeniranje QR Koda: Kliknite na "Skeniraj QR Kod". Otvara se kamera. Prislonite kameru uz QR kod na štampanom fiskalnom računu. Sistem će uspešno prepoznati račun, oglasiti se zvučnim signalom (bip), zatvoriti kameru i automatski popuniti datum i ukupnu cenu sa računa.',
    '5. Unos Količine i Cene: Unesite količinu sipanog goriva u litrima. Aplikacija će sama izračunati cenu po litru na osnovu ukupnog iznosa sa računa.',
    '6. Slika Računa (Opciono): Možete kliknuti na dugme za slikanje računa kako biste sačuvali vizuelni dokaz o točenju.',
    '7. Sačuvaj: Klikom na dugme "Sačuvaj" transakcija se odmah upisuje u centralnu bazu podataka.'
];

userSteps.forEach(step => {
    doc.font('Arial').fontSize(9.5).fillColor('#334155');
    const boldPart = step.split(':')[0] + ':';
    const textPart = step.split(':')[1];
    
    doc.font('Arial-Bold').text(boldPart, { continued: true }).font('Arial').text(textPart);
    doc.moveDown(0.4);
});

// Dodavanje slike za korisničko uputstvo
if (fs.existsSync(imgUser)) {
    doc.image(imgUser, 300, 420, { width: 250 });
    
    // Tekst pored slike
    doc.y = 420;
    doc.x = 40;
    doc.font('Arial-Bold').fontSize(11).fillColor('#28a745').text('PAMETNI QR SKENER');
    doc.moveDown(0.5);
    doc.font('Arial').fontSize(9.5).fillColor('#334155').text('Skener u aplikaciji je poboljšan za papirne isečke:', { width: 240 });
    doc.moveDown(0.4);
    
    const scannerFeatures = [
        '- HD rezolucija kamere za oštru sliku.',
        '- Kontinuirani makro autofokus.',
        '- Integrisan nativni sistemski skener.',
        '- Zvučni signal (bip) i vibracija na sken.',
        '- Trenutno zatvaranje kamere pre prikaza poruke.'
    ];
    
    scannerFeatures.forEach(feature => {
        doc.text(feature, { width: 240 });
        doc.moveDown(0.3);
    });
}

drawFooter(1);

// ==========================================
// STRANICA 2: ADMINISTRATORSKO UPUTSTVO
// ==========================================
doc.addPage();
drawHeader('ADMINISTRATORSKO UPUTSTVO (Za Menadžere)');

doc.font('Arial').fontSize(10).fillColor('#334155');
doc.text('Administratorski panel omogućava kompletan nadzor nad potrošnjom goriva, vozilima, zaposlenima, kao i direktnu verifikaciju računa na portalu Poreske Uprave.', { align: 'justify' });
doc.moveDown(1.5);

doc.font('Arial-Bold').fontSize(12).fillColor('#1e293b').text('Ključne funkcije za administratore:');
doc.moveDown(0.5);

const adminSteps = [
    '1. Logovanje: Prijavite se na sistem koristeći nalog sa "Admin" privilegijama.',
    '2. Dashboard (Komandna tabla): Pratite ukupne troškove, prosečne potrošnje i statistiku točenja po vozilima kroz interaktivne grafikone i metrike.',
    '3. Upravljanje entitetima: Dodajte nova vozila u flotu, pratite datume registracije, servisa i zamene guma. Takođe možete upravljati nalozima zaposlenih (dodavati nove vozače ili menjati uloge).',
    '4. Istorija točenja (Evidencija): Pregledajte hronološki spisak svih točenja goriva u sistemu sa filterima po vozilima i datumima.',
    '5. Direktan link za proveru računa (Poreska Uprava): Svaki unos koji sadrži validno skeniran QR kod ima zeleni bedž "QR Kod Sačuvan". Ovaj bedž je aktivni link. Klikom na njega, u novoj kartici se otvara zvanični portal Poreske Uprave sa detaljima tog računa za brzu i jednostavnu kontrolu poreske ispravnosti.',
    '6. Pregled priložene slike: Narandžasti bedž "Slika Računa" omogućava direktan pregled fotografisanog računa u punoj veličini.',
    '7. Eksport u CSV format: Klikom na "Eksport u CSV", sistem generiše tabelu sa namenskom kolonom "Provera u Poreskoj Upravi" koja čuva puni verifikacioni URL za sve skenirane račune.'
];

adminSteps.forEach(step => {
    doc.font('Arial').fontSize(9.5).fillColor('#334155');
    const boldPart = step.split(':')[0] + ':';
    const textPart = step.split(':')[1];
    
    doc.font('Arial-Bold').text(boldPart, { continued: true }).font('Arial').text(textPart);
    doc.moveDown(0.4);
});

// Smeštanje slike na dnu stranice 2
if (fs.existsSync(imgAdmin)) {
    doc.image(imgAdmin, 40, 480, { width: 515, height: 260 });
}

drawFooter(2);

// ==========================================
// STRANICA 3: IMPLEMENTACIJA, TEHNIČKI DETALJI I SIGURNOST
// ==========================================
doc.addPage();
drawHeader('TEHNIČKE SPECIFIKACIJE & PREPORUKE ZA RAD');

doc.font('Arial-Bold').fontSize(12).fillColor('#1e293b').text('Tehnički detalji i preporuke za rad sa QR kodovima:');
doc.moveDown(0.5);

doc.font('Arial').fontSize(10).fillColor('#334155');
doc.text('Da bi sistem radio sa maksimalnom tačnošću i efikasnošću, preporučuje se pridržavanje sledećih pravila pri radu na terenu:', { align: 'justify' });
doc.moveDown(1);

const prepDetails = [
    '• Pravilno skeniranje na pumpama: Vozač treba da drži telefon paralelno sa računom. Izbegavajte presavijanje QR koda i direktan odsjaj jakog sunca ili rasvete sa pumpe na sjajnom termalnom papiru.',
    '• Dozvole za kameru pretraživača: Prilikom prvog pokretanja skenera, pretraživač (Chrome/Safari) će zatražiti pristup kameri. Korisnik mora izabrati opciju "Dozvoli" (Allow). Ako je dozvola slučajno odbijena, mora se ručno odobriti u podešavanjima pretraživača za tu veb lokaciju.',
    '• Sigurnost podataka o kilometraži: Dvostruka provera (na klijentu i na serveru) garantuje da vozač ne može uneti kilometražu manju od poslednje zabeležene. Time se sprečavaju greške pri unosu i zloupotrebe.',
    '• Integracija sa Poreskom Upravom: Sistem ne čuva samo sirovi tekst računa, već celokupan bezbednosni URL (potpisan kriptografskim ključem od strane PFR terminala), što omogućava 100% tačnu proveru na portalu države bez ikakve mogućnosti manipulacije.'
];

prepDetails.forEach(detail => {
    const boldPart = detail.split(':')[0] + ':';
    const textPart = detail.split(':')[1];
    doc.font('Arial-Bold').text(boldPart, { continued: true }).font('Arial').text(textPart);
    doc.moveDown(0.6);
});

doc.moveDown(1);
doc.font('Arial-Bold').fontSize(12).fillColor('#1e293b').text('Kontakt i Podrška');
doc.moveDown(0.5);
doc.font('Arial').fontSize(10).fillColor('#334155').text('Za sva tehnička pitanja, izmene na sistemu ili probleme u radu na terenu, obratite se administratoru sistema ili tehničkoj podršci razvojnog tima.', { align: 'justify' });

// Crtanje dekorativnog boxa za podršku
doc.rect(40, 520, 515, 80).fill('#f8fafc');
doc.strokeColor('#cbd5e1').lineWidth(1).stroke();
doc.fillColor('#1e293b').font('Arial-Bold').fontSize(10).text('KORISNI SAVET:', 55, 535);
doc.fillColor('#334155').font('Arial').fontSize(9.5).text('Ukoliko se desi da je papirni račun pocepan ili potpuno nečitljiv za kameru, vozač uvek može kliknuti na dugme za zatvaranje skenera i ručno uneti sve podatke o točenju (kilometražu, litražu, cenu) kako se ne bi blokirao rad na terenu.', 55, 555, { width: 480 });

drawFooter(3);

// Završavanje dokumenta
doc.end();

writeStream.on('finish', () => {
    console.log('PDF dokument uspešno generisan na putanji:', outputPath);
});
