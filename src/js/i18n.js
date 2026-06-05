/**
 * i18n — English and Italian translations.
 * Usage: import { t, initI18n, getCurrentLang } from './i18n.js';
 */

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.expiring': 'Expiring',
    'nav.categories': 'Categories',
    'nav.backup': 'Backup',
    'nav.settings': 'Settings',
    'nav.sync': 'Sync Drive',
    'nav.addDocument': '+ Add document',
    'nav.add': 'Add',
    'nav.notifications': 'Notifications',

    // Page titles (header)
    'page.home': 'DocVault',
    'page.addDocument': 'Add document',
    'page.editDocument': 'Edit document',
    'page.viewDocument': 'Document detail',
    'page.categories': 'Categories',
    'page.settings': 'Settings',
    'page.setup': 'Setup',
    'page.sync': 'Sync Google Drive',
    'page.backup': 'Backup & Restore',
    'page.expiring': 'Expiring documents',
    'page.notifications': 'Notifications',

    // Setup
    'setup.welcome': 'Welcome to DocVault',
    'setup.subtitle': 'Choose the folder where you want to save your documents to get started.',
    'setup.folderLabel': 'Storage folder',
    'setup.placeholder': 'No folder selected',
    'setup.browse': '📁 Browse',
    'setup.hint': 'Your documents will be organized in this folder, readable even without the app.',
    'setup.validPath': 'Valid and writable folder',
    'setup.invalidPath': 'Invalid or non-writable folder',
    'setup.existingVault': 'Existing DocVault data found — your archive will be loaded from here.',
    'setup.newVault': 'Empty folder — a new vault will be created.',
    'setup.startBtn': 'Start using DocVault →',
    'setup.configuring': 'Configuring…',
    'setup.footerHint': 'You can change the folder later in Settings.',
    'setup.success': 'Setup complete!',
    'setup.error': 'Setup error: ',

    // Notifications
    'notif.title': 'Notifications',
    'notif.expired': 'Expired',
    'notif.expiringSoon': 'Expiring soon',
    'notif.none': 'No notifications — all documents are up to date',
    'notif.openDoc': 'Open',
    'notif.daysAgo': '{days}d ago',
    'notif.inDays': 'in {days}d',
    'notif.today': 'today',

    // Missing folder
    'app.missingFolder': 'Storage folder missing',
    'app.missingFolderMsg': 'The configured storage folder no longer exists. Please reconfigure.',
    'app.reconfigure': 'Reconfigure',

    // Home
    'home.search': 'Search documents, tags, notes…',
    'home.selectDoc': 'Select a document to preview',
    'home.filters': 'Filters',
    'home.export': 'Export',
    'home.exportShort': 'Export',
    'filter.filters': 'Filters',
    'home.document': 'document',
    'home.documents': 'documents',
    'home.page': 'Page',
    'home.of': 'of',
    'home.exportSuccess': 'Export complete!',
    'home.exportError': 'Export error',
    'home.searchError': 'Search error:',
    'home.expiringSoon': 'expiring soon',
    'home.categories': 'categories',
    'home.tags': 'tags',
    'home.noDocuments': 'No documents found',

    // Document card
    'card.open': '👁 Open',
    'card.edit': '✏️ Edit',
    'card.saveError': 'Error saving',
    'card.expiredDaysAgo': 'Expired {days}d ago',
    'card.expiresInDays': 'Expires in {days}d',
    'card.expiresToday': 'Expires today',

    // Expiry badge
    'expiry.expiredDaysAgo': 'Expired {days}d ago',
    'expiry.expiresToday': 'Expires today!',
    'expiry.expiresInDaysUrgent': '⚠️ Expires in {days}d',
    'expiry.expiresInDays': 'Expires in {days}d',
    'expiry.expiresOn': 'Expires on {date}',

    // Add document
    'add.title': 'Add document',
    'add.fileLabel': 'File',
    'add.fileDropHint': 'Click or drag a file here',
    'add.fileDropSubhint': 'PDF, images, Word, Excel, Markdown…',
    'add.categoryLabel': 'Category',
    'add.specificFields': 'Specific fields',
    'add.titleLabel': 'Title',
    'add.titlePlaceholder': 'E.g. Electricity bill January 2026',
    'add.documentDate': 'Document date',
    'add.expiryDate': 'Expiry date',
    'add.notes': 'Notes',
    'add.notesPlaceholder': 'Free notes…',
    'add.ocrLabel': 'Run OCR to make text searchable (requires Tesseract)',
    'add.save': 'Save document',
    'add.saving': 'Saving…',
    'add.saved': 'Document saved!',
    'add.selectFile': 'Select a file',
    'add.duplicate': 'File already in catalog',
    'add.cancel': 'Cancel',
    'add.error': 'Error: ',

    // Edit document
    'edit.title': 'Edit document',
    'edit.specificFields': 'Specific fields',
    'edit.save': 'Save changes',
    'edit.saving': 'Saving…',
    'edit.saved': 'Document updated!',
    'edit.cancel': 'Cancel',
    'edit.error': 'Error: ',

    // View document
    'view.showInExplorer': '📂 Show in Explorer',
    'view.openWith': '↗️ Open with…',
    'view.edit': '✏️ Edit',
    'view.delete': '🗑️ Delete',
    'view.details': 'Details',
    'view.tags': 'Tags',
    'view.notes': 'Notes',
    'view.ocrText': 'OCR Text',
    'view.runOcr': 'Run OCR',
    'view.noOcrText': 'No extracted text',
    'view.ocrRunning': 'Running…',
    'view.ocrDone': 'OCR complete!',
    'view.ocrFailed': 'OCR failed: ',
    'view.deleteConfirm': 'Delete "{title}"? The physical file will not be removed.',
    'view.deleteTitle': 'Delete document',
    'view.deleted': 'Document deleted',
    'view.notFound': 'Document not found',
    'view.loadError': 'Load error: ',
    'view.noPreview': 'Preview not available for this file type.',
    'view.error': 'Error: ',

    // Categories
    'cat.title': 'Categories',
    'cat.newCategory': 'New category',
    'cat.fields': 'Fields',
    'cat.delete': 'Delete',
    'cat.system': 'System',
    'cat.deleteConfirm': 'Delete category "{name}"?',
    'cat.deleted': 'Category deleted',
    'cat.newCategoryTitle': 'New category',
    'cat.nameLabel': 'Name',
    'cat.namePlaceholder': 'E.g. Taxes',
    'cat.iconLabel': 'Icon',
    'cat.colorLabel': 'Color',
    'cat.cancel': 'Cancel',
    'cat.create': 'Create',
    'cat.created': 'Category created!',
    'cat.enterName': 'Enter a name',
    'cat.fieldsTitle': 'Fields — {name}',
    'cat.noFields': 'No custom fields',
    'cat.addFieldHeader': 'Add field',
    'cat.fieldName': 'Name (e.g. amount)',
    'cat.fieldLabel': 'Label (e.g. Amount)',
    'cat.fieldTypeLabel': 'Type',
    'cat.fieldTypeText': 'Text',
    'cat.fieldTypeNumber': 'Number',
    'cat.fieldTypeDate': 'Date',
    'cat.fieldTypeSelect': 'List',
    'cat.required': 'Required',
    'cat.addFieldBtn': '+ Add field',
    'cat.close': 'Close',
    'cat.fieldRemoved': 'Field removed',
    'cat.fieldAdded': 'Field added!',
    'cat.fillNameLabel': 'Fill in name and label',
    'cat.loadError': 'Error loading fields',
    'cat.error': 'Error: ',

    // Settings
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.theme': 'Theme',
    'settings.themeSystem': 'System (automatic)',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',
    'settings.themeUpdated': 'Theme updated',
    'settings.language': 'Language',
    'settings.langAuto': 'Auto (system)',
    'settings.langIt': 'Italiano',
    'settings.langEn': 'English',
    'settings.langUpdated': 'Language updated',
    'settings.storage': 'Storage',
    'settings.storageFolder': 'Documents folder',
    'settings.notConfigured': 'Not configured',
    'settings.changeFolder': 'Change folder',
    'settings.changeFolderConfirm': 'Set storage folder to:\n{path}',
    'settings.folderUpdated': 'Storage folder updated',
    'settings.license': 'License',
    'settings.proActive': '✅ Pro active',
    'settings.activatedOn': 'Activated on',
    'settings.activateProDesc': 'Activate Pro license to unlock Google Drive sync.',
    'settings.activate': 'Activate',
    'settings.licenseActivated': 'Pro license activated! 🎉',
    'settings.invalidLicense': 'Invalid code',
    'settings.invalidFormat': 'Invalid format',
    'settings.enterLicense': 'Enter the license key',
    'settings.about': 'About',
    'settings.error': 'Error: ',

    // Backup
    'backup.title': 'Backup & Restore',
    'backup.createTitle': 'Create backup',
    'backup.createDesc': 'Create a ZIP archive with the database and all files. Keep it in a safe place.',
    'backup.createBtn': 'Create ZIP backup',
    'backup.creating': 'Creating…',
    'backup.created': 'Backup created!',
    'backup.savedAt': 'Backup saved at: ',
    'backup.restoreTitle': 'Restore from backup',
    'backup.restoreWarning': '⚠️ This will overwrite all current data with the backup contents.',
    'backup.restoreBtn': 'Restore from ZIP',
    'backup.restoreConfirm': 'Are you sure? All current data will be overwritten with the selected backup.',
    'backup.restoreModalTitle': 'Restore backup',
    'backup.restored': 'Restore complete! Please restart the app.',
    'backup.error': 'Backup error: ',
    'backup.restoreError': 'Restore error: ',

    // Expiring
    'expiring.title': 'Expiring documents',
    'expiring.none': 'No documents expiring in the next 30 days',
    'expiring.error': 'Error: ',

    // Sync
    'sync.title': 'Sync Google Drive',
    'sync.proFeature': 'Pro Feature',
    'sync.proRequired': 'Google Drive sync requires a Pro license.',
    'sync.activatePro': 'Activate Pro license',
    'sync.connected': 'Connected to Google Drive',
    'sync.lastSync': 'Last sync: ',
    'sync.syncNow': 'Sync now',
    'sync.disconnect': 'Disconnect',
    'sync.connectDesc': 'Connect your Google account to sync documents across devices.',
    'sync.connect': 'Connect Google Drive',
    'sync.syncing': 'Syncing…',
    'sync.inProgress': 'In progress…',
    'sync.doneMsg': 'Sync complete!',
    'sync.disconnected': 'Disconnected from Google Drive',
    'sync.syncError': 'Sync error: ',
    'sync.error': 'Error: ',

    // Filter bar
    'filter.category': 'Category',
    'filter.allCategories': 'All',
    'filter.year': 'Year',
    'filter.allYears': 'All',
    'filter.sortBy': 'Sort by',
    'filter.dateDesc': 'Date ↓',
    'filter.dateAsc': 'Date ↑',
    'filter.titleAsc': 'Title A-Z',
    'filter.recentFirst': 'Most recent',
    'filter.favorites': 'Favorites',
    'filter.expiring': 'Expiring',
    'filter.reset': 'Reset filters',

    // Modal
    'modal.confirm': 'Confirm',
    'modal.cancel': 'Cancel',
    'modal.close': '×',
  },

  it: {
    // Navigation
    'nav.home': 'Home',
    'nav.expiring': 'Scadenze',
    'nav.categories': 'Categorie',
    'nav.backup': 'Backup',
    'nav.settings': 'Impostazioni',
    'nav.sync': 'Sync Drive',
    'nav.addDocument': '+ Aggiungi documento',
    'nav.add': 'Aggiungi',
    'nav.notifications': 'Notifiche',

    // Page titles
    'page.home': 'DocVault',
    'page.addDocument': 'Aggiungi documento',
    'page.editDocument': 'Modifica documento',
    'page.viewDocument': 'Dettaglio documento',
    'page.categories': 'Categorie',
    'page.settings': 'Impostazioni',
    'page.setup': 'Configurazione',
    'page.sync': 'Sync Google Drive',
    'page.backup': 'Backup & Restore',
    'page.expiring': 'Documenti in scadenza',
    'page.notifications': 'Notifiche',

    // Setup
    'setup.welcome': 'Benvenuto in DocVault',
    'setup.subtitle': 'Scegli la cartella dove salvare i tuoi documenti per iniziare.',
    'setup.folderLabel': 'Cartella di archiviazione',
    'setup.placeholder': 'Nessuna cartella selezionata',
    'setup.browse': '📁 Sfoglia',
    'setup.hint': "I tuoi documenti saranno organizzati in questa cartella, leggibile anche senza l'app.",
    'setup.validPath': 'Cartella valida e scrivibile',
    'setup.invalidPath': 'Cartella non valida o non scrivibile',
    'setup.existingVault': 'Trovati dati DocVault esistenti — il tuo archivio verrà caricato da qui.',
    'setup.newVault': 'Cartella vuota — verrà creato un nuovo archivio.',
    'setup.startBtn': 'Inizia ad usare DocVault →',
    'setup.configuring': 'Configurazione in corso…',
    'setup.footerHint': 'Puoi cambiare la cartella in seguito dalle Impostazioni.',
    'setup.success': 'Configurazione completata!',
    'setup.error': 'Errore durante la configurazione: ',

    // Notifications
    'notif.title': 'Notifiche',
    'notif.expired': 'Già scaduti',
    'notif.expiringSoon': 'In scadenza',
    'notif.none': 'Nessuna notifica — tutti i documenti sono in regola',
    'notif.openDoc': 'Apri',
    'notif.daysAgo': '{days} gg fa',
    'notif.inDays': 'tra {days} gg',
    'notif.today': 'oggi',

    // Missing folder
    'app.missingFolder': 'Cartella mancante',
    'app.missingFolderMsg': 'La cartella di archiviazione non esiste più. Riconfigura l\'app.',
    'app.reconfigure': 'Riconfigura',

    // Home
    'home.search': 'Cerca documenti, tag, note…',
    'home.selectDoc': 'Seleziona un documento per vederlo',
    'home.filters': 'Filtri',
    'home.export': 'Esporta',
    'home.exportShort': 'Esporta',
    'filter.filters': 'Filtri',
    'home.document': 'documento',
    'home.documents': 'documenti',
    'home.page': 'Pagina',
    'home.of': 'di',
    'home.exportSuccess': 'Esportazione completata!',
    'home.exportError': "Errore durante l'esportazione",
    'home.searchError': 'Errore durante la ricerca:',
    'home.expiringSoon': 'in scadenza',
    'home.categories': 'categorie',
    'home.tags': 'tag',
    'home.noDocuments': 'Nessun documento trovato',

    // Document card
    'card.open': '👁 Apri',
    'card.edit': '✏️ Modifica',
    'card.saveError': 'Errore durante il salvataggio',
    'card.expiredDaysAgo': 'Scaduto {days} gg fa',
    'card.expiresInDays': 'Scade in {days} gg',
    'card.expiresToday': 'Scade oggi',

    // Expiry badge
    'expiry.expiredDaysAgo': 'Scaduto {days} gg fa',
    'expiry.expiresToday': 'Scade oggi!',
    'expiry.expiresInDaysUrgent': '⚠️ Scade in {days} gg',
    'expiry.expiresInDays': 'Scade in {days} gg',
    'expiry.expiresOn': 'Scade il {date}',

    // Add document
    'add.title': 'Aggiungi documento',
    'add.fileLabel': 'File',
    'add.fileDropHint': 'Clicca o trascina un file qui',
    'add.fileDropSubhint': 'PDF, immagini, Word, Excel, Markdown…',
    'add.categoryLabel': 'Categoria',
    'add.specificFields': 'Campi specifici',
    'add.titleLabel': 'Titolo',
    'add.titlePlaceholder': 'Es. Bolletta luce gennaio 2026',
    'add.documentDate': 'Data documento',
    'add.expiryDate': 'Data scadenza',
    'add.notes': 'Note',
    'add.notesPlaceholder': 'Note libere…',
    'add.ocrLabel': 'Esegui OCR per rendere il testo ricercabile (richiede Tesseract)',
    'add.save': 'Salva documento',
    'add.saving': 'Salvataggio…',
    'add.saved': 'Documento salvato!',
    'add.selectFile': 'Seleziona un file',
    'add.duplicate': 'File già presente nel catalogo',
    'add.cancel': 'Annulla',
    'add.error': 'Errore: ',

    // Edit document
    'edit.title': 'Modifica documento',
    'edit.specificFields': 'Campi specifici',
    'edit.save': 'Salva modifiche',
    'edit.saving': 'Salvataggio…',
    'edit.saved': 'Documento aggiornato!',
    'edit.cancel': 'Annulla',
    'edit.error': 'Errore: ',

    // View document
    'view.showInExplorer': '📂 Mostra in Explorer',
    'view.openWith': '↗️ Apri con…',
    'view.edit': '✏️ Modifica',
    'view.delete': '🗑️ Elimina',
    'view.details': 'Dettagli',
    'view.tags': 'Tag',
    'view.notes': 'Note',
    'view.ocrText': 'Testo OCR',
    'view.runOcr': 'Esegui OCR',
    'view.noOcrText': 'Nessun testo estratto',
    'view.ocrRunning': 'In corso…',
    'view.ocrDone': 'OCR completato!',
    'view.ocrFailed': 'OCR fallito: ',
    'view.deleteConfirm': 'Eliminare "{title}"? Il file fisico non verrà rimosso.',
    'view.deleteTitle': 'Elimina documento',
    'view.deleted': 'Documento eliminato',
    'view.notFound': 'Documento non trovato',
    'view.loadError': 'Errore caricamento: ',
    'view.noPreview': 'Anteprima non disponibile per questo tipo di file.',
    'view.error': 'Errore: ',

    // Categories
    'cat.title': 'Categorie',
    'cat.newCategory': 'Nuova categoria',
    'cat.fields': 'Campi',
    'cat.delete': 'Elimina',
    'cat.system': 'Sistema',
    'cat.deleteConfirm': 'Eliminare la categoria "{name}"?',
    'cat.deleted': 'Categoria eliminata',
    'cat.newCategoryTitle': 'Nuova categoria',
    'cat.nameLabel': 'Nome',
    'cat.namePlaceholder': 'Es. Tasse',
    'cat.iconLabel': 'Icona',
    'cat.colorLabel': 'Colore',
    'cat.cancel': 'Annulla',
    'cat.create': 'Crea',
    'cat.created': 'Categoria creata!',
    'cat.enterName': 'Inserisci un nome',
    'cat.fieldsTitle': 'Campi — {name}',
    'cat.noFields': 'Nessun campo personalizzato',
    'cat.addFieldHeader': 'Aggiungi campo',
    'cat.fieldName': 'Nome (es. importo)',
    'cat.fieldLabel': 'Label (es. Importo €)',
    'cat.fieldTypeLabel': 'Tipo',
    'cat.fieldTypeText': 'Testo',
    'cat.fieldTypeNumber': 'Numero',
    'cat.fieldTypeDate': 'Data',
    'cat.fieldTypeSelect': 'Lista',
    'cat.required': 'Obbligatorio',
    'cat.addFieldBtn': '+ Aggiungi campo',
    'cat.close': 'Chiudi',
    'cat.fieldRemoved': 'Campo rimosso',
    'cat.fieldAdded': 'Campo aggiunto!',
    'cat.fillNameLabel': 'Compila nome e label',
    'cat.loadError': 'Errore caricamento campi',
    'cat.error': 'Errore: ',

    // Settings
    'settings.title': 'Impostazioni',
    'settings.appearance': 'Aspetto',
    'settings.theme': 'Tema',
    'settings.themeSystem': 'Sistema (automatico)',
    'settings.themeLight': 'Chiaro',
    'settings.themeDark': 'Scuro',
    'settings.themeUpdated': 'Tema aggiornato',
    'settings.language': 'Lingua',
    'settings.langAuto': 'Auto (sistema)',
    'settings.langIt': 'Italiano',
    'settings.langEn': 'English',
    'settings.langUpdated': 'Lingua aggiornata',
    'settings.storage': 'Archiviazione',
    'settings.storageFolder': 'Cartella documenti',
    'settings.notConfigured': 'Non configurata',
    'settings.changeFolder': 'Cambia cartella',
    'settings.changeFolderConfirm': 'Imposta cartella di archiviazione:\n{path}',
    'settings.folderUpdated': 'Cartella aggiornata',
    'settings.license': 'Licenza',
    'settings.proActive': '✅ Pro attivo',
    'settings.activatedOn': 'Attivato il',
    'settings.activateProDesc': 'Attiva la licenza Pro per sbloccare la sincronizzazione Google Drive.',
    'settings.activate': 'Attiva',
    'settings.licenseActivated': 'Licenza Pro attivata! 🎉',
    'settings.invalidLicense': 'Codice non valido',
    'settings.invalidFormat': 'Formato non corretto',
    'settings.enterLicense': 'Inserisci il codice licenza',
    'settings.about': 'Informazioni',
    'settings.error': 'Errore: ',

    // Backup
    'backup.title': 'Backup & Restore',
    'backup.createTitle': 'Crea backup',
    'backup.createDesc': 'Crea un archivio ZIP con il database e tutti i file. Conservalo in un posto sicuro.',
    'backup.createBtn': 'Crea backup ZIP',
    'backup.creating': 'Creazione in corso…',
    'backup.created': 'Backup creato!',
    'backup.savedAt': 'Backup salvato in: ',
    'backup.restoreTitle': 'Ripristina da backup',
    'backup.restoreWarning': '⚠️ Questa operazione sovrascrive tutti i dati attuali con il contenuto del backup.',
    'backup.restoreBtn': 'Ripristina da ZIP',
    'backup.restoreConfirm': 'Sei sicuro? Tutti i dati attuali saranno sovrascritti con il backup selezionato.',
    'backup.restoreModalTitle': 'Ripristina backup',
    'backup.restored': "Ripristino completato! Riavvia l'app.",
    'backup.error': 'Errore backup: ',
    'backup.restoreError': 'Errore ripristino: ',

    // Expiring
    'expiring.title': 'Documenti in scadenza',
    'expiring.none': 'Nessun documento in scadenza nei prossimi 30 giorni',
    'expiring.error': 'Errore: ',

    // Sync
    'sync.title': 'Sync Google Drive',
    'sync.proFeature': 'Funzionalità Pro',
    'sync.proRequired': 'La sincronizzazione con Google Drive richiede una licenza Pro.',
    'sync.activatePro': 'Attiva licenza Pro',
    'sync.connected': 'Connesso a Google Drive',
    'sync.lastSync': 'Ultima sync: ',
    'sync.syncNow': 'Sincronizza ora',
    'sync.disconnect': 'Disconnetti',
    'sync.connectDesc': 'Connetti il tuo account Google per sincronizzare documenti tra dispositivi.',
    'sync.connect': 'Connetti Google Drive',
    'sync.syncing': 'Sincronizzazione…',
    'sync.inProgress': 'In corso…',
    'sync.doneMsg': 'Sync completata!',
    'sync.disconnected': 'Disconnesso da Google Drive',
    'sync.syncError': 'Errore sync: ',
    'sync.error': 'Errore: ',

    // Filter bar
    'filter.category': 'Categoria',
    'filter.allCategories': 'Tutte',
    'filter.year': 'Anno',
    'filter.allYears': 'Tutti',
    'filter.sortBy': 'Ordina per',
    'filter.dateDesc': 'Data ↓',
    'filter.dateAsc': 'Data ↑',
    'filter.titleAsc': 'Titolo A-Z',
    'filter.recentFirst': 'Più recenti',
    'filter.favorites': 'Preferiti',
    'filter.expiring': 'In scadenza',
    'filter.reset': 'Azzera filtri',

    // Modal
    'modal.confirm': 'Conferma',
    'modal.cancel': 'Annulla',
    'modal.close': '×',
  },
};

let currentLang = 'en';

/** Normalize a locale string to a supported language code. */
function normalize(lang) {
  if (!lang) return 'en';
  const l = lang.toLowerCase();
  if (l.startsWith('it')) return 'it';
  return 'en';
}

/** Detect language from navigator.language, falling back to English. */
function detectSystemLang() {
  return normalize(navigator.language || '');
}

/**
 * Initialize i18n. Call once at app startup.
 * Pass '' or 'auto' to auto-detect from the system locale.
 */
export function initI18n(lang) {
  if (!lang || lang === 'auto') {
    currentLang = detectSystemLang();
  } else {
    currentLang = normalize(lang);
  }
}

/** Get the current active language code ('en' | 'it'). */
export function getCurrentLang() {
  return currentLang;
}

/**
 * Translate a key, optionally interpolating {param} placeholders.
 * Falls back to English if the key is missing in the current language.
 * Returns the key itself if not found anywhere.
 */
export function t(key, params) {
  const dict = translations[currentLang] ?? translations['en'];
  let str = dict[key] ?? translations['en'][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}
